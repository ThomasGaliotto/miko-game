import Matter from 'matter-js';
import type { Mood } from '../components/Miko';
import { PARTS } from './chapters';
import type { AdventureDef, PartKind, PickupDef, SeesawDef } from './types';

const { Engine, Bodies, Body, Composite, Constraint, Events, Query } = Matter;

const STEP_MS = 1000 / 60;
const RUN_SPEED = 4.2;
const JUMP_V = 6.6;
const SPRING_JUMP_V = 10.6;
const MIKO_W = 36;
const MIKO_H = 60;
const STEP_UP_MAX = 30;
const MAX_PUSH_MASS = 8; // Miko (~4 kg) cannot shove anything heavier than this

export type PlacedPart = { id: number; kind: PartKind; body: Matter.Body };
export type Seesaw = { def: SeesawDef; body: Matter.Body; peak: number; lastTouch: number };
export type Toast = { text: string; until: number; tone: 'hint' | 'reward' | 'warn' };

export class Game {
  engine: Matter.Engine;
  miko: Matter.Body;
  terrain: Matter.Body[] = [];
  seesaws: Seesaw[] = [];
  parts: PlacedPart[] = [];
  pickups: PickupDef[];
  inventory: Record<PartKind, number> = { planche: 0, caisse: 0, enclume: 0 };

  input = { left: false, right: false };
  private jumpBuffer = 0;
  private coyote = 0;
  private groundedNow = false;
  private stepUp = 0;
  private blockedDir = 0;
  private blockedNow = 0;
  private toldTooHeavy = false;
  private touchingNow = new Set<Matter.Body>();
  private touching = new Set<Matter.Body>();
  private stepCount = 0;
  grounded = false;

  facing: 1 | -1 = 1;
  springLegs: boolean;
  walkPhase = 0;
  squash = 1;
  mood: Mood = 'curious';
  private moodUntil = 1500;
  blinkUntil = 0;
  private nextBlink = 2500;

  building = false;
  selectedKind: PartKind | null = null;
  selectedPart: PlacedPart | null = null;

  /** Last airborne path of Miko: shows the parabola drawn by gravity. */
  trail: { x: number; y: number }[] = [];
  trailFadeAt = 0;
  launchSpeed = 0; // m/s of the last catapult launch, for the HUD

  checkpoint: { x: number; y: number };
  toast: Toast | null = null;
  private shownHints = new Set<string>();
  fragments: string[] = [];
  tries = 0;
  time = 0;
  won = false;
  private accumulator = 0;
  private nextPartId = 1;

  constructor(public level: AdventureDef, opts: { springLegs?: boolean } = {}) {
    this.engine = Engine.create();
    this.springLegs = !!opts.springLegs;
    const L = level;
    this.checkpoint = { ...L.checkpoints[0] };
    Object.assign(this.inventory, L.startInventory ?? {});

    this.terrain = L.terrain.map((r) =>
      Bodies.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, { isStatic: true, friction: 0.8, label: 'terrain' }),
    );
    Composite.add(this.engine.world, this.terrain);

    for (const s of L.seesaws) {
      // The pivot sits `pivotOffset` px right of the plank's center.
      const ox = s.pivotOffset * Math.cos(s.startAngle);
      const oy = s.pivotOffset * Math.sin(s.startAngle);
      const body = Bodies.rectangle(s.pivotX - ox, s.pivotY - oy, s.length, s.thickness, { density: 0.002, friction: 0.9, label: 'seesaw' });
      Body.setAngle(body, s.startAngle);
      const pivot = Constraint.create({ pointA: { x: s.pivotX, y: s.pivotY }, bodyB: body, pointB: { x: ox, y: oy }, length: 0, stiffness: 1 });
      Composite.add(this.engine.world, [body, pivot]);
      this.seesaws.push({ def: s, body, peak: 0, lastTouch: -99 });
    }

    this.miko = Bodies.rectangle(L.spawn.x, L.spawn.y, MIKO_W, MIKO_H, {
      chamfer: { radius: 10 },
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0.005,
      density: 0.002,
      label: 'miko',
    });
    Body.setInertia(this.miko, Infinity);
    Composite.add(this.engine.world, this.miko);
    this.pickups = [...L.pickups];

    const onContact = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        const { bodyA, bodyB } = pair;
        const other = bodyA === this.miko ? bodyB : bodyB === this.miko ? bodyA : null;
        if (!other) continue;
        this.touchingNow.add(other);
        const n = pair.collision.normal; // matter-js 0.20: points from bodyB toward bodyA
        if ((bodyB === this.miko && n.y > 0.5) || (bodyA === this.miko && n.y < -0.5)) this.groundedNow = true;
        if (Math.abs(n.x) > 0.5) {
          // Side contact with a low obstacle: highest vertex near Miko (bounds lie for tilted planks)
          const mb = this.miko.bounds;
          const near = other.vertices.filter((v) => v.x > mb.min.x - 8 && v.x < mb.max.x + 8);
          const top = near.length ? Math.min(...near.map((v) => v.y)) : other.bounds.min.y;
          const rise = mb.max.y - top;
          if (rise > 0 && rise <= STEP_UP_MAX) this.stepUp = Math.max(this.stepUp, rise);
          else if (!other.isStatic && other.mass > MAX_PUSH_MASS && !this.seesaws.some((s) => s.body === other)) {
            this.blockedNow = Math.sign(other.position.x - this.miko.position.x);
          }
        }
      }
    };
    Events.on(this.engine, 'collisionStart', onContact);
    Events.on(this.engine, 'collisionActive', onContact);

    this.showHint(L.hints[0]?.id);
  }

  // ---------- input ----------
  pressJump() {
    if (!this.building) this.jumpBuffer = 8;
  }

  // ---------- main loop ----------
  update(dtMs: number) {
    if (this.won) return;
    this.time += dtMs;
    if (this.toast && this.time > this.toast.until) this.toast = null;
    if (this.time > this.moodUntil && !this.building) this.mood = 'idle';
    if (this.time > this.nextBlink) {
      this.blinkUntil = this.time + 130;
      this.nextBlink = this.time + 2200 + Math.random() * 2500;
    }
    if (this.building) return; // construction mode freezes time

    this.accumulator += Math.min(dtMs, 100);
    let steps = 0;
    while (this.accumulator >= STEP_MS && steps < 5) {
      this.fixedStep();
      this.accumulator -= STEP_MS;
      steps++;
    }
  }

  private fixedStep() {
    const m = this.miko;
    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir as 1 | -1;

    const vx = m.velocity.x;
    let targetVx: number;
    if (this.grounded) targetVx = dir !== 0 ? dir * RUN_SPEED : vx * 0.6;
    if (dir !== 0 && dir === this.blockedDir) {
      targetVx = 0; // too heavy to push
      if (!this.toldTooHeavy) {
        this.toldTooHeavy = true;
        this.say('Trop lourd à pousser pour Miko ! Saute par-dessus.', 'warn', 3000);
      }
    }
    else targetVx = dir !== 0 ? vx + (dir * RUN_SPEED - vx) * 0.12 : vx * 0.985; // air control keeps launch momentum
    Body.setVelocity(m, { x: targetVx, y: m.velocity.y });
    // Standing still: feet grip (no sliding down tilted planks). Moving: frictionless for crisp control.
    const grip = this.grounded && dir === 0;
    m.friction = grip ? 1 : 0;
    m.frictionStatic = grip ? 10 : 0;

    if (this.grounded) this.coyote = 6;
    else if (this.coyote > 0) this.coyote--;
    if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
      if (this.coyote > 0) {
        Body.setVelocity(m, { x: m.velocity.x, y: -(this.springLegs ? SPRING_JUMP_V : JUMP_V) });
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.squash = 1.25;
      }
    }

    const wasGrounded = this.grounded;
    this.groundedNow = false;
    this.stepUp = 0;
    this.blockedNow = 0;
    this.touchingNow = new Set();
    Engine.update(this.engine, STEP_MS);
    this.grounded = this.groundedNow;
    this.touching = this.touchingNow;
    this.stepCount++;
    this.blockedDir = this.blockedNow;
    if (this.stepUp > 0 && this.grounded && dir !== 0) Body.translate(m, { x: dir * 2, y: -this.stepUp - 1 });
    for (const s of this.seesaws) this.updateCatapult(s);

    if (!wasGrounded && this.grounded) {
      this.squash = 0.8;
      this.trailFadeAt = this.time + 2500;
    }
    if (!this.grounded) {
      if (wasGrounded) this.trail = [];
      if (this.trail.length < 200) this.trail.push({ x: m.position.x, y: m.position.y });
    }
    this.squash += (1 - this.squash) * 0.2;

    if (this.grounded && Math.abs(m.velocity.x) > 0.5) this.walkPhase += 0.35;
    else this.walkPhase *= 0.8;

    this.checkPickups();
    this.checkCheckpoints();
    this.checkHints();
    this.checkExit();
    if (m.position.y > this.level.killY) this.respawn();
  }

  /**
   * Lever / catapult: when the seesaw swings and suddenly stops, Miko keeps the speed of the
   * plank end he stands on (inertia). Soft contacts in matter-js absorb most of it, so we hand it
   * back explicitly. Heavier / higher drops => faster swing => higher launch.
   */
  private updateCatapult(s: Seesaw) {
    if (this.touching.has(s.body)) s.lastTouch = this.stepCount;
    const av = s.body.angularVelocity; // > 0: short (right) arm going down, long arm going up
    if (av > s.peak) s.peak = av;
    if (s.peak > 0.02 && av < s.peak * 0.35) {
      const arm = s.def.pivotX - this.miko.position.x;
      if (this.stepCount - s.lastTouch <= 8 && arm > 20) {
        const v = Math.min(13.5, s.peak * arm * 2.2);
        Body.setVelocity(this.miko, { x: Math.max(this.miko.velocity.x, 3.5), y: -v });
        this.coyote = 0;
        this.launchSpeed = Math.hypot(v, 3.5) * 0.6; // px/step -> m/s (100 px = 1 m, 60 steps/s)
        this.setMood('surprise', 900);
      }
      s.peak = 0;
    }
    if (av <= 0) s.peak = 0;
  }

  // ---------- world logic ----------
  private setMood(mood: Mood, ms: number) {
    this.mood = mood;
    this.moodUntil = this.time + ms;
  }

  private say(text: string, tone: Toast['tone'] = 'hint', ms = 4200) {
    this.toast = { text, tone, until: this.time + ms };
  }

  private showHint(id: string | undefined) {
    if (!id || this.shownHints.has(id)) return;
    const h = this.level.hints.find((x) => x.id === id);
    if (!h) return;
    this.shownHints.add(id);
    this.say(h.text, 'hint', 6000);
  }

  private checkHints() {
    const x = this.miko.position.x;
    for (const h of this.level.hints) {
      if (this.shownHints.has(h.id)) continue;
      if (h.requiresNoSprings && this.springLegs) continue;
      if (x >= h.minX && (h.maxX === undefined || x <= h.maxX)) this.showHint(h.id);
    }
  }

  private checkPickups() {
    const p = this.miko.position;
    this.pickups = this.pickups.filter((pk) => {
      if (Math.abs(pk.x - p.x) > 34 || Math.abs(pk.y - p.y) > 46) return true;
      if (pk.type === 'part') {
        this.inventory[pk.part]++;
        this.say(`${PARTS[pk.part].icon} ${PARTS[pk.part].label} ramassée !`, 'reward', 2500);
      } else if (pk.type === 'upgrade') {
        this.springLegs = true;
        this.say('Amélioration : JAMBES-RESSORTS ! Miko saute bien plus haut.', 'reward', 5000);
      } else {
        this.fragments.push(pk.text);
        this.say(`📜 ${pk.text}`, 'reward', 6000);
      }
      this.setMood('happy', 1400);
      return false;
    });
  }

  private checkCheckpoints() {
    const p = this.miko.position;
    for (const c of this.level.checkpoints) {
      if (c.x > this.checkpoint.x && Math.abs(c.x - p.x) < 50 && Math.abs(c.y - p.y) < 60) this.checkpoint = { ...c };
    }
  }

  private checkExit() {
    const e = this.level.exit;
    const p = this.miko.position;
    if (p.x > e.x && p.x < e.x + e.w && p.y > e.y - 20 && p.y < e.y + e.h + 20) {
      this.won = true;
      this.mood = 'happy';
      this.moodUntil = Infinity;
    }
  }

  respawn() {
    Body.setPosition(this.miko, this.checkpoint);
    Body.setVelocity(this.miko, { x: 0, y: 0 });
    this.tries++;
    this.trail = [];
    this.setMood('fail', 1500);
  }

  // ---------- construction mode ----------
  toggleBuild() {
    this.building = !this.building;
    this.selectedPart = null;
    if (this.building) {
      this.mood = 'focus';
      this.moodUntil = Infinity;
    } else {
      this.selectedKind = null;
      this.moodUntil = this.time + 300;
      this.tries++;
      this.accumulator = 0;
      for (const p of this.parts) Body.setVelocity(p.body, { x: 0, y: 0 });
    }
  }

  selectKind(kind: PartKind) {
    this.selectedPart = null;
    this.selectedKind = this.selectedKind === kind ? null : kind;
  }

  /** Tap in world coordinates while building. */
  tapWorld(x: number, y: number) {
    if (!this.building) return;
    const hit = Query.point(this.parts.map((p) => p.body), { x, y })[0];
    if (hit) {
      this.selectedPart = this.parts.find((p) => p.body === hit) ?? null;
      this.selectedKind = null;
      return;
    }
    if (this.selectedPart) {
      this.tryMove(this.selectedPart.body, x, y);
      return;
    }
    const kind = this.selectedKind;
    if (kind && this.inventory[kind] > 0) {
      const d = PARTS[kind];
      const body = Bodies.rectangle(x, y, d.w, d.h, { density: d.density, friction: d.friction, label: kind });
      if (this.overlapsSomething(body)) {
        this.say('Pas assez de place ici.', 'warn', 1500);
        return;
      }
      Composite.add(this.engine.world, body);
      const placed = { id: this.nextPartId++, kind, body };
      this.parts.push(placed);
      this.inventory[kind]--;
      this.selectedPart = placed;
      if (this.inventory[kind] === 0) this.selectedKind = null;
    }
  }

  private tryMove(body: Matter.Body, x: number, y: number) {
    const old = { ...body.position };
    Body.setPosition(body, { x, y });
    if (this.overlapsSomething(body)) {
      Body.setPosition(body, old);
      this.say('Pas assez de place ici.', 'warn', 1500);
    }
    Body.setVelocity(body, { x: 0, y: 0 });
  }

  rotateSelected(deltaDeg: number) {
    const p = this.selectedPart;
    if (!p) return;
    const old = p.body.angle;
    Body.setAngle(p.body, old + (deltaDeg * Math.PI) / 180);
    if (this.overlapsSomething(p.body)) Body.setAngle(p.body, old);
    Body.setAngularVelocity(p.body, 0);
  }

  removeSelected() {
    const p = this.selectedPart;
    if (!p) return;
    Composite.remove(this.engine.world, p.body);
    this.parts = this.parts.filter((x) => x !== p);
    this.inventory[p.kind]++;
    this.selectedPart = null;
  }

  private overlapsSomething(body: Matter.Body) {
    const others = [...this.terrain, ...this.seesaws.map((s) => s.body), this.miko, ...this.parts.map((p) => p.body)].filter((b) => b !== body);
    return Query.collides(body, others).length > 0;
  }
}
