import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { MikoInWorld } from '../components/Miko';
import { PARTS } from './chapters';
import { Game } from './engine';
import type { AdventureDef, ChapterDef, PartKind, ThemeDef } from './types';

// ---------- small render helpers ----------

function gearPath(cx: number, cy: number, r: number, teeth: number) {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.82;
    const a2 = a + Math.PI / (teeth * 2);
    pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`, `${cx + Math.cos(a2) * rr},${cy + Math.sin(a2) * rr}`);
  }
  return `M${pts.join(' L')} Z`;
}

const kg = (mass: number) => `${Math.round(mass)} kg`;
const meters = (px: number) => `${(px / 100).toFixed(2).replace('.', ',')} m`;

function PartShape({ kind, w, h, selected }: { kind: PartKind; w: number; h: number; selected?: boolean }) {
  const stroke = selected ? '#5fe0d0' : '#3a2010';
  const sw = selected ? 4 : 2.5;
  if (kind === 'planche')
    return (
      <G>
        <Rect x={-w / 2} y={-h / 2} width={w} height={h} rx={3} fill="#b07a45" stroke={stroke} strokeWidth={sw} />
        <Line x1={-w / 2 + 10} y1={0} x2={w / 2 - 10} y2={0} stroke="#8a5a2e" strokeWidth={1.5} />
        <Circle cx={-w / 2 + 8} cy={0} r={2} fill="#3a2010" />
        <Circle cx={w / 2 - 8} cy={0} r={2} fill="#3a2010" />
      </G>
    );
  if (kind === 'caisse')
    return (
      <G>
        <Rect x={-w / 2} y={-h / 2} width={w} height={h} rx={3} fill="#c08a4e" stroke={stroke} strokeWidth={sw} />
        <Path d={`M${-w / 2 + 6} ${-h / 2 + 6} L${w / 2 - 6} ${h / 2 - 6} M${w / 2 - 6} ${-h / 2 + 6} L${-w / 2 + 6} ${h / 2 - 6}`} stroke="#7e5428" strokeWidth={4} />
        <Rect x={-w / 2 + 4} y={-h / 2 + 4} width={w - 8} height={h - 8} fill="none" stroke="#7e5428" strokeWidth={3} />
      </G>
    );
  return (
    <G>
      <Path
        d={`M${-w / 2} ${-h / 2} H${w / 2} L${w / 2 - 6} ${-h / 2 + 14} H${w / 4} V${h / 2 - 8} H${w / 2 - 4} V${h / 2} H${-w / 2 + 4} V${h / 2 - 8} H${-w / 4} V${-h / 2 + 14} H${-w / 2 + 10} Z`}
        fill="#4b5560"
        stroke={stroke}
        strokeWidth={sw}
      />
      <Rect x={-w / 2 + 4} y={-h / 2 + 3} width={w - 14} height={4} fill="#7d8b96" />
    </G>
  );
}

/** Weight vector P = m·g drawn from the center of gravity; length grows with mass. */
function WeightArrow({ x, y, mass, label }: { x: number; y: number; mass: number; label?: string }) {
  const len = 18 + Math.sqrt(mass) * 9;
  return (
    <G>
      <Circle cx={x} cy={y} r={5} fill="#ff5e7a" stroke="#fff" strokeWidth={1.5} />
      <Line x1={x} y1={y} x2={x} y2={y + len} stroke="#ff5e7a" strokeWidth={3.5} />
      <Path d={`M${x - 7} ${y + len - 8} L${x} ${y + len + 4} L${x + 7} ${y + len - 8} Z`} fill="#ff5e7a" />
      <SvgText x={x + 9} y={y + len - 2} fontSize={13} fontWeight="bold" fill="#ffd1da">
        {label ?? kg(mass)}
      </SvgText>
    </G>
  );
}

function Background({ theme, camX, camY, scale, t }: { theme: ThemeDef; camX: number; camY: number; scale: number; t: number }) {
  const far = `scale(${scale}) translate(${-camX * 0.35} ${-camY})`;
  const mid = `scale(${scale}) translate(${-camX * 0.6} ${-camY})`;
  if (theme.deco === 'forest') {
    const trees = Array.from({ length: 14 }, (_, i) => ({ x: i * 230 + ((i * 97) % 80), h: 220 + ((i * 53) % 120) }));
    return (
      <G>
        <G transform={far}>
          {trees.map((tr, i) => (
            <G key={i} opacity={0.35}>
              <Rect x={tr.x - 10} y={500 - tr.h} width={20} height={tr.h} fill="#6b3f22" />
              <Circle cx={tr.x} cy={500 - tr.h} r={70} fill="#1f3a26" />
              <Path d={gearPath(tr.x + 30, 500 - tr.h + 20, 26, 8)} fill="#2c4a2f" />
            </G>
          ))}
        </G>
        <G transform={mid}>
          {trees.slice(0, 10).map((tr, i) => (
            <G key={i} opacity={0.65}>
              <Rect x={tr.x * 1.3 + 60} y={500 - tr.h * 0.9} width={26} height={tr.h} fill="#8c4d27" stroke="#3b200f" strokeWidth={2} />
              <Line x1={tr.x * 1.3 + 66} y1={500 - tr.h * 0.6} x2={tr.x * 1.3 + 66} y2={500} stroke="#b5602e" strokeWidth={2} />
              <Circle cx={tr.x * 1.3 + 73} cy={500 - tr.h * 0.9} r={55} fill="#2f5a34" />
              <Circle cx={tr.x * 1.3 + 40} cy={500 - tr.h * 0.8} r={38} fill="#3a6b3c" />
            </G>
          ))}
          {Array.from({ length: 24 }, (_, i) => {
            const fx = i * 137 + Math.sin(t * 0.7 + i) * 30;
            const fy = 250 + ((i * 71) % 200) + Math.cos(t + i * 2) * 15;
            return <Circle key={`f${i}`} cx={fx} cy={fy} r={2.5} fill={theme.accent} opacity={0.4 + 0.4 * Math.sin(t * 3 + i)} />;
          })}
        </G>
      </G>
    );
  }
  // Generic mechanical backdrop for other worlds
  return (
    <G transform={far}>
      {[200, 900, 1500, 1980].map((x, i) => (
        <G key={x} transform={`rotate(${(t * 6 * (i % 2 ? -1 : 1)) % 360} ${x} 250)`}>
          <Path d={gearPath(x, 250, 70 + i * 10, 12)} fill="#000" opacity={0.2} />
        </G>
      ))}
    </G>
  );
}

// ---------- controls ----------

function HoldButton({ label, onDown, onUp, style }: { label: string; onDown: () => void; onUp: () => void; style?: object }) {
  // Raw touch events allow several buttons to be held at once (run + jump) on phones.
  const touchProps =
    Platform.OS === 'web'
      ? { onPointerDown: onDown, onPointerUp: onUp, onPointerLeave: onUp, onPointerCancel: onUp }
      : { onTouchStart: onDown, onTouchEnd: onUp, onTouchCancel: onUp };
  return (
    <View {...(touchProps as object)} style={[styles.padBtn, style]}>
      <Text style={styles.padTxt} selectable={false}>
        {label}
      </Text>
    </View>
  );
}

export function Btn({ label, onPress, active, small }: { label: string; onPress: () => void; active?: boolean; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, small && styles.btnSmall, active && styles.btnActive]}>
      <Text style={[styles.btnTxt, active && styles.btnTxtActive]} selectable={false}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- screen ----------

type Props = {
  chapter: ChapterDef;
  adventure: AdventureDef;
  springLegs: boolean;
  hasNext: boolean;
  onExit: () => void;
  onWin: (r: { springLegs: boolean; fragments: string[] }) => void;
  onNext: () => void;
};

export default function GameScreen({ chapter, adventure, springLegs, hasNext, onExit, onWin, onNext }: Props) {
  const { width, height } = useWindowDimensions();
  const gameRef = useRef<Game>(null as unknown as Game);
  if (!gameRef.current) gameRef.current = new Game(adventure, { springLegs });
  const game = gameRef.current;
  // Debug handle for playtesting in the browser console (dev web builds only)
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'web') (globalThis as { __miko?: Game }).__miko = game;
  }, [game]);
  const [, force] = useReducer((n: number) => n + 1, 0);
  const [showForces, setShowForces] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      game.update(now - last);
      last = now;
      if (game.won && !reported.current) {
        reported.current = true;
        onWin({ springLegs: game.springLegs, fragments: game.fragments });
      }
      force();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game, onWin]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a' || k === 'q') game.input.left = true;
      else if (k === 'arrowright' || k === 'd') game.input.right = true;
      else if (k === 'arrowup' || k === ' ' || k === 'w' || k === 'z') {
        if (!e.repeat) game.pressJump();
      } else if (k === 'b' || k === 'tab') game.toggleBuild();
      else if (k === 'f') setShowForces((v) => !v);
      else if (k === 'r') {
        if (game.building) game.removeSelected();
        else game.respawn();
      }
      else if (k === 'e') game.rotateSelected(15);
      else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a' || k === 'q') game.input.left = false;
      if (k === 'arrowright' || k === 'd') game.input.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [game]);

  const L = game.level;
  const theme = chapter.theme;
  const scale = height / L.view.height;
  const viewW = width / scale;
  const m = game.miko.position;
  const camX = Math.max(L.bounds.left, Math.min(L.bounds.right - viewW, m.x - viewW * 0.4));
  const camY = Math.min(L.view.top, m.y - 110); // follow Miko upward on big launches
  const t = game.time / 1000;
  const forces = showForces || game.building;
  const trailAlpha = game.grounded ? Math.max(0, Math.min(1, (game.trailFadeAt - game.time) / 1500)) : 1;

  const onWorldTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    game.tapWorld(e.nativeEvent.locationX / scale + camX, e.nativeEvent.locationY / scale + camY);
  };

  const exit = L.exit;
  const totalParts = game.inventory.planche + game.inventory.caisse + game.inventory.enclume;
  const gridStep = useMemo(() => 100 * scale, [scale]); // 1 m grid

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => game.building} onResponderRelease={onWorldTap}>
        <Svg width={width} height={height} pointerEvents="none">
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.skyTop} />
              <Stop offset="1" stopColor={theme.skyBottom} />
            </LinearGradient>
            <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.groundTop} />
              <Stop offset="0.06" stopColor={theme.groundMid} />
              <Stop offset="1" stopColor={theme.groundBottom} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#sky)" />
          <Background theme={theme} camX={camX} camY={camY} scale={scale} t={t} />

          {/* world */}
          <G transform={`scale(${scale}) translate(${-camX} ${-camY})`}>
            {/* exit: daylight gate */}
            <Rect x={exit.x - 6} y={exit.y - 6} width={exit.w + 12} height={exit.h + 6} rx={6} fill="#5a3b25" />
            <Rect x={exit.x} y={exit.y} width={exit.w} height={exit.h} rx={4} fill="#fff1c4" />
            <Circle cx={exit.x + exit.w / 2} cy={exit.y + exit.h / 2} r={60} fill="#fff1c4" opacity={0.15} />
            <SvgText x={exit.x + exit.w / 2} y={exit.y - 14} fontSize={14} fill="#ffd98a" textAnchor="middle" fontWeight="bold">
              SORTIE
            </SvgText>

            {/* terrain */}
            {L.terrain.map((r, i) => (
              <G key={i}>
                <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#ground)" stroke="#0e0a06" strokeWidth={2} />
                {theme.deco === 'forest' && r.w > 100 && (
                  <Path
                    d={`M${r.x} ${r.y + 2} ${Array.from({ length: Math.floor(r.w / 14) }, (_, k) => `L${r.x + k * 14 + 7} ${r.y - 6 - ((k * 7) % 5)} L${r.x + k * 14 + 14} ${r.y + 2}`).join(' ')}`}
                    fill={theme.groundTop}
                  />
                )}
              </G>
            ))}

            {/* seesaws */}
            {game.seesaws.map((s, i) => {
              const d = s.def;
              const a = s.body.angle;
              const longArm = d.length / 2 + d.pivotOffset;
              const shortArm = d.length / 2 - d.pivotOffset;
              const cos = Math.cos(a);
              const sin = Math.sin(a);
              return (
                <G key={i}>
                  <Polygon points={`${d.pivotX},${d.pivotY} ${d.pivotX - 22},500 ${d.pivotX + 22},500`} fill="#6a4a30" stroke="#140d09" strokeWidth={2} />
                  <G transform={`translate(${s.body.position.x} ${s.body.position.y}) rotate(${(a * 180) / Math.PI})`}>
                    <Rect x={-d.length / 2} y={-d.thickness / 2} width={d.length} height={d.thickness} rx={3} fill="#a0703f" stroke="#140d09" strokeWidth={2} />
                  </G>
                  <Circle cx={d.pivotX} cy={d.pivotY} r={6} fill="#e0b25a" stroke="#140d09" strokeWidth={2} />
                  {forces && (
                    <G>
                      <Line x1={d.pivotX} y1={d.pivotY - 18} x2={d.pivotX - longArm * cos} y2={d.pivotY - 18 - longArm * sin} stroke="#7fc8ff" strokeWidth={2} strokeDasharray="6 4" />
                      <Line x1={d.pivotX} y1={d.pivotY - 18} x2={d.pivotX + shortArm * cos} y2={d.pivotY - 18 + shortArm * sin} stroke="#ffd27a" strokeWidth={2} strokeDasharray="6 4" />
                      <SvgText x={d.pivotX - (longArm / 2) * cos} y={d.pivotY - 26 - (longArm / 2) * sin} fontSize={13} fill="#7fc8ff" fontWeight="bold" textAnchor="middle">
                        d₁ = {meters(longArm)}
                      </SvgText>
                      <SvgText x={d.pivotX + (shortArm / 2) * cos} y={d.pivotY - 26 + (shortArm / 2) * sin} fontSize={13} fill="#ffd27a" fontWeight="bold" textAnchor="middle">
                        d₂ = {meters(shortArm)}
                      </SvgText>
                      <SvgText x={d.pivotX} y={518} fontSize={12} fill="#e0b25a" textAnchor="middle">
                        pivot
                      </SvgText>
                    </G>
                  )}
                </G>
              );
            })}

            {/* pickups */}
            {game.pickups.map((p) => {
              const bob = Math.sin(t * 3 + p.x) * 4;
              const color = p.type === 'upgrade' ? '#5fe0d0' : p.type === 'fragment' ? '#ffe28a' : '#ffc857';
              return (
                <G key={p.id} transform={`translate(${p.x} ${p.y + bob})`}>
                  <Circle r={26} fill={color} opacity={0.18} />
                  {p.type === 'part' ? (
                    <G transform="scale(0.45)">
                      <PartShape kind={p.part} w={p.part === 'planche' ? 90 : PARTS[p.part].w} h={p.part === 'planche' ? 20 : PARTS[p.part].h} />
                    </G>
                  ) : p.type === 'upgrade' ? (
                    <Path d="M-6 -16 l-8 6 l16 6 l-16 6 l16 6 l-8 6" stroke="#9aa7ad" strokeWidth={4} fill="none" strokeLinejoin="round" />
                  ) : (
                    <G>
                      <Rect x={-12} y={-9} width={24} height={18} fill="#3d6c9e" stroke="#e9f1ff" strokeWidth={1.5} transform="rotate(-8)" />
                      <Line x1={-7} y1={-2} x2={7} y2={-4} stroke="#e9f1ff" strokeWidth={1.2} />
                    </G>
                  )}
                </G>
              );
            })}

            {/* player-built parts */}
            {game.parts.map((p) => (
              <G key={p.id} transform={`translate(${p.body.position.x} ${p.body.position.y}) rotate(${(p.body.angle * 180) / Math.PI})`}>
                <PartShape kind={p.kind} w={PARTS[p.kind].w} h={PARTS[p.kind].h} selected={game.selectedPart === p} />
              </G>
            ))}

            {/* gravity at work: the parabola of the last jump / launch */}
            {trailAlpha > 0 &&
              game.trail.map((pt, i) =>
                i % 3 === 0 ? <Circle key={i} cx={pt.x} cy={pt.y + 20} r={3} fill="#ffe28a" opacity={trailAlpha * 0.7} /> : null,
              )}

            <MikoInWorld
              x={m.x}
              y={m.y}
              facing={game.facing}
              mood={game.mood}
              blink={game.time < game.blinkUntil}
              walkPhase={game.walkPhase}
              springLegs={game.springLegs}
              squash={game.squash}
            />

            {/* physics overlay: weights from centers of gravity */}
            {forces && (
              <G>
                {game.parts.map((p) => (
                  <WeightArrow key={p.id} x={p.body.position.x} y={p.body.position.y} mass={p.body.mass} />
                ))}
                <WeightArrow x={m.x + 26} y={m.y} mass={game.miko.mass} label={`Miko ${kg(game.miko.mass)}`} />
              </G>
            )}
          </G>

          {/* 1-metre blueprint grid in construction mode */}
          {game.building && (
            <G opacity={0.2}>
              {Array.from({ length: Math.ceil(width / gridStep) + 1 }, (_, i) => {
                const x = i * gridStep - ((camX * scale) % gridStep);
                return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={height} stroke="#7fc8ff" strokeWidth={1} />;
              })}
              {Array.from({ length: Math.ceil(height / gridStep) + 1 }, (_, i) => {
                const y = i * gridStep - ((camY * scale) % gridStep);
                return <Line key={`h${i}`} x1={0} y1={y} x2={width} y2={y} stroke="#7fc8ff" strokeWidth={1} />;
              })}
            </G>
          )}
        </Svg>
      </View>

      {/* ---------- HUD ---------- */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Btn small label="☰" onPress={onExit} />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.levelName} numberOfLines={1}>
            {chapter.number}-{chapter.adventures.indexOf(adventure) + 1} · {adventure.title}
          </Text>
          <Text style={styles.goal} numberOfLines={1}>
            {adventure.goal}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {game.fragments.length > 0 && <Text style={styles.chip}>📜 {game.fragments.length}</Text>}
        <Btn small label={forces ? '👁 Forces' : '👁'} onPress={() => setShowForces((v) => !v)} active={showForces} />
        <Btn small label="↺" onPress={() => game.respawn()} />
        <Btn label={game.building ? '▶ Tester' : '🔧 Atelier'} onPress={() => game.toggleBuild()} active={game.building} />
      </View>

      {game.toast && (
        <View style={[styles.toast, game.toast.tone === 'reward' && styles.toastReward, game.toast.tone === 'warn' && styles.toastWarn]} pointerEvents="none">
          <Text style={styles.toastTxt}>{game.toast.text}</Text>
        </View>
      )}

      {game.building ? (
        <View style={styles.buildBar} pointerEvents="box-none">
          <Text style={styles.buildHelp}>
            {game.selectedPart
              ? `${PARTS[game.selectedPart.kind].label} · ${kg(game.selectedPart.body.mass)} — touche ailleurs pour la déplacer`
              : game.selectedKind
                ? 'Touche le décor pour poser la pièce (le temps est figé)'
                : totalParts > 0
                  ? 'Choisis une pièce · grille = 1 m'
                  : 'Plus de pièces — touche une pièce posée pour la reprendre'}
          </Text>
          <View style={styles.row}>
            {(Object.keys(PARTS) as PartKind[]).map((k) => {
              const d = PARTS[k];
              const mass = d.w * d.h * d.density;
              return (
                <Btn
                  key={k}
                  label={`${d.icon} ${d.label} ${kg(mass)} ×${game.inventory[k]}`}
                  onPress={() => game.selectKind(k)}
                  active={game.selectedKind === k}
                />
              );
            })}
            {game.selectedPart && (
              <>
                <Btn small label="⟲" onPress={() => game.rotateSelected(-15)} />
                <Btn small label="⟳" onPress={() => game.rotateSelected(15)} />
                <Btn small label="🗑" onPress={() => game.removeSelected()} />
              </>
            )}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.padLeft}>
            <HoldButton label="◀" onDown={() => (game.input.left = true)} onUp={() => (game.input.left = false)} />
            <HoldButton label="▶" onDown={() => (game.input.right = true)} onUp={() => (game.input.right = false)} />
          </View>
          <View style={styles.padRight}>
            <HoldButton label="⤒" onDown={() => game.pressJump()} onUp={() => {}} style={styles.jumpBtn} />
          </View>
        </>
      )}

      {game.won && (
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.overlayInner}>
            <Text style={styles.winTitle}>Aventure réussie !</Text>
            <Text style={styles.winSub}>
              {adventure.title} · {Math.round(game.time / 1000)} s · {game.tries} essai{game.tries > 1 ? 's' : ''}
            </Text>
            <View style={styles.lesson}>
              <Text style={styles.lessonKicker}>FICHE PHYSIQUE</Text>
              <Text style={styles.lessonTitle}>{adventure.lesson.title}</Text>
              <Text style={styles.lessonText}>{adventure.lesson.text}</Text>
              {adventure.lesson.formula && <Text style={styles.formula}>{adventure.lesson.formula}</Text>}
              {adventure.lesson.tryIt && <Text style={styles.tryIt}>💡 {adventure.lesson.tryIt}</Text>}
            </View>
            {game.fragments.map((f) => (
              <Text key={f} style={styles.winFrag}>
                📜 {f}
              </Text>
            ))}
            <View style={styles.row}>
              <Btn label="Carte" onPress={onExit} />
              {hasNext && <Btn label="Aventure suivante ▶" onPress={onNext} active />}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1b1410', overflow: 'hidden' },
  topBar: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelName: { color: '#f6ead0', fontWeight: '800', fontSize: 14 },
  goal: { color: '#c9b89a', fontSize: 12 },
  chip: { color: '#ffe28a', fontWeight: '700', paddingHorizontal: 8 },
  btn: { backgroundColor: 'rgba(40,26,17,0.85)', borderColor: '#c8743a', borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  btnSmall: { paddingHorizontal: 10, minWidth: 40, alignItems: 'center' },
  btnActive: { backgroundColor: '#5fe0d0', borderColor: '#f6ead0' },
  btnTxt: { color: '#f6ead0', fontWeight: '700', fontSize: 14 },
  btnTxtActive: { color: '#14222a' },
  toast: {
    position: 'absolute',
    top: 62,
    alignSelf: 'center',
    maxWidth: '80%',
    backgroundColor: 'rgba(20,14,10,0.9)',
    borderColor: '#e0b25a',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastReward: { borderColor: '#5fe0d0' },
  toastWarn: { borderColor: '#ff7b54' },
  toastTxt: { color: '#f6ead0', fontSize: 15, textAlign: 'center' },
  padLeft: { position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', gap: 12 },
  padRight: { position: 'absolute', right: 16, bottom: 16 },
  padBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(246,234,208,0.12)',
    borderColor: 'rgba(246,234,208,0.35)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpBtn: { width: 84, height: 84, borderRadius: 42, borderColor: 'rgba(95,224,208,0.6)' },
  padTxt: { color: '#f6ead0', fontSize: 28, fontWeight: '700' },
  buildBar: { position: 'absolute', bottom: 12, left: 12, right: 12, alignItems: 'center', gap: 8 },
  buildHelp: { color: '#7fc8ff', fontWeight: '700', fontSize: 13, backgroundColor: 'rgba(10,20,30,0.6)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,11,8,0.92)' },
  overlayInner: { alignItems: 'center', gap: 10, padding: 24 },
  winTitle: { color: '#ffe28a', fontSize: 30, fontWeight: '800' },
  winSub: { color: '#c9b89a', fontSize: 14 },
  lesson: { maxWidth: 560, backgroundColor: '#14283a', borderColor: '#7fc8ff', borderWidth: 1.5, borderRadius: 16, padding: 18, gap: 8 },
  lessonKicker: { color: '#7fc8ff', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  lessonTitle: { color: '#f6ead0', fontSize: 20, fontWeight: '800' },
  lessonText: { color: '#dfe8f0', fontSize: 14, lineHeight: 20 },
  formula: { color: '#ffd27a', fontSize: 16, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
  tryIt: { color: '#b9e6c4', fontSize: 13, fontStyle: 'italic' },
  winFrag: { color: '#ffe28a', fontSize: 14, fontStyle: 'italic' },
});
