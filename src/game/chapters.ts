import type { AdventureDef, ChapterDef, PartKind } from './types';

// Physics parts the player can build with. Mass in "kg" = matter-js mass (density x area).
export const PARTS: Record<PartKind, { w: number; h: number; density: number; friction: number; label: string; icon: string }> = {
  planche: { w: 220, h: 14, density: 0.002, friction: 0.9, label: 'Planche', icon: '🪵' },
  caisse: { w: 56, h: 56, density: 0.003, friction: 0.8, label: 'Caisse', icon: '📦' },
  enclume: { w: 56, h: 40, density: 0.025, friction: 0.9, label: 'Enclume', icon: '⚓' },
};

const VIEW = { top: 130, height: 490 };

// Seesaw shared by the lever adventures: off-center pivot, long arm (185 px) on the left,
// short arm (85 px) on the right, resting with the long arm on the ground.
const lever = (pivotX: number) => ({ pivotX, pivotY: 458, length: 270, thickness: 14, pivotOffset: 50, startAngle: -0.2 });

// ---------------------------------------------------------------------------
// Chapter 1 — La forêt mécanique : gravité, leviers
// ---------------------------------------------------------------------------

const foret1: AdventureDef = {
  id: 'foret-1',
  title: 'Le ravin',
  concept: 'Gravité · centre de gravité',
  goal: 'Traverser le ravin pour atteindre la sortie.',
  bounds: { left: -100, right: 1400 },
  view: VIEW,
  spawn: { x: 120, y: 460 },
  killY: 900,
  terrain: [
    { x: -140, y: -200, w: 40, h: 900 },
    { x: -100, y: 500, w: 700, h: 200 }, // ..600
    { x: 600, y: 600, w: 300, h: 100 }, // ravine floor (300 px: too wide to jump)
    { x: 900, y: 500, w: 500, h: 200 },
    { x: 1400, y: -200, w: 40, h: 900 },
  ],
  seesaws: [],
  pickups: [
    { id: 'p1', x: 300, y: 465, type: 'part', part: 'planche' },
    { id: 'p2', x: 450, y: 465, type: 'part', part: 'caisse' },
  ],
  checkpoints: [
    { x: 120, y: 460 },
    { x: 980, y: 460 },
  ],
  exit: { x: 1260, y: 440, w: 60, h: 60 },
  hints: [
    { id: 'wake', minX: -999, text: 'Miko se réveille dans une forêt de cuivre… Un ravin barre la route.' },
    { id: 'edge', minX: 470, maxX: 620, text: 'Trop large pour sauter. Ouvre l’atelier 🔧 : pose la planche au bord, en porte-à-faux au-dessus du vide.' },
    { id: 'tip', minX: 640, maxX: 760, text: 'Ça bascule ? Mets la caisse sur l’arrière de la planche : un contrepoids !' },
  ],
  lesson: {
    title: 'Le centre de gravité',
    text:
      'Tout objet se comporte comme si son poids était concentré en un point : son centre de gravité. Tant que ce point reste au-dessus de l’appui, l’objet tient. S’il dépasse le bord, l’objet bascule. Un contrepoids posé à l’arrière ramène le centre de gravité au-dessus du sol.',
    formula: 'Poids P = m × g   (g ≈ 9,8 m/s²)',
    tryIt: 'Essaie : sans la caisse, avance doucement sur la planche… et regarde quand elle bascule.',
  },
};

const foret2: AdventureDef = {
  id: 'foret-2',
  title: 'La catapulte',
  concept: 'Leviers · masse',
  goal: 'Rejoindre la corniche, bien trop haute pour sauter.',
  bounds: { left: -100, right: 2100 },
  view: VIEW,
  spawn: { x: 120, y: 460 },
  killY: 900,
  terrain: [
    { x: -140, y: -200, w: 40, h: 900 },
    { x: -100, y: 500, w: 1600, h: 200 }, // ..1500
    { x: 1500, y: 330, w: 600, h: 370 }, // high ledge
    { x: 2100, y: -200, w: 40, h: 900 },
  ],
  seesaws: [lever(1360)],
  pickups: [
    { id: 'p1', x: 500, y: 465, type: 'part', part: 'caisse' },
    { id: 'p2', x: 850, y: 465, type: 'part', part: 'enclume' },
    { id: 'f1', x: 1680, y: 295, type: 'fragment', text: '« Projet M — prototype n°7 » … signé E.' },
  ],
  checkpoints: [
    { x: 120, y: 460 },
    { x: 1580, y: 290 },
  ],
  exit: { x: 1960, y: 270, w: 60, h: 60 },
  hints: [
    { id: 'start', minX: -999, text: 'Une vieille bascule… et une corniche tout là-haut.' },
    { id: 'lever', minX: 1050, maxX: 1500, text: 'Place-toi sur le bras LONG de la bascule, puis fais tomber un poids sur le bras COURT. Essaie la caisse… puis l’enclume !' },
  ],
  lesson: {
    title: 'Le levier',
    text:
      'Un levier tourne autour d’un pivot. Le bout du bras long parcourt plus de chemin que le bout du bras court, dans le même temps : il va donc plus vite. Une masse lourde qui tombe sur le bras court projette Miko très haut sur le bras long. Plus la masse est lourde et tombe de haut, plus le lancer est fort.',
    formula: 'Équilibre : F₁ × d₁ = F₂ × d₂',
    tryIt: 'Compare : la caisse (9 kg) contre l’enclume (56 kg), et lâche-les de plus ou moins haut.',
  },
};

const foret3: AdventureDef = {
  id: 'foret-3',
  title: 'Le vieux chêne',
  concept: 'Empiler · leviers · ressorts',
  goal: 'Grimper jusqu’au vieux chêne et trouver une amélioration.',
  bounds: { left: -100, right: 2500 },
  view: VIEW,
  spawn: { x: 120, y: 460 },
  killY: 900,
  terrain: [
    { x: -140, y: -200, w: 40, h: 900 },
    { x: -100, y: 500, w: 800, h: 200 }, // ..700
    { x: 700, y: 392, w: 400, h: 308 }, // root step: 108 px high
    { x: 1100, y: 500, w: 600, h: 200 }, // ..1700
    { x: 1700, y: 330, w: 800, h: 370 }, // the old oak's ledge
    { x: 2210, y: 180, w: 40, h: 150 }, // root wall: needs spring legs
    { x: 2500, y: -200, w: 40, h: 900 },
  ],
  seesaws: [lever(1560)],
  pickups: [
    { id: 'p1', x: 400, y: 465, type: 'part', part: 'caisse' },
    { id: 'p2', x: 1300, y: 465, type: 'part', part: 'enclume' },
    { id: 'f1', x: 1820, y: 295, type: 'fragment', text: 'Gravé dans l’écorce : « E. & M. — l’atelier est au-delà des montagnes »' },
    { id: 'u1', x: 2060, y: 290, type: 'upgrade', upgrade: 'ressorts' },
  ],
  checkpoints: [
    { x: 120, y: 460 },
    { x: 760, y: 350 },
    { x: 1180, y: 460 },
    { x: 1780, y: 290 },
  ],
  exit: { x: 2380, y: 270, w: 60, h: 60 },
  hints: [
    { id: 'start', minX: -999, text: 'Le vieux chêne est tout au bout. Ses racines forment une marche.' },
    { id: 'step', minX: 450, maxX: 700, text: 'Cette racine est un peu trop haute… Empile quelque chose pour te faire une marche.' },
    { id: 'lever', minX: 1250, maxX: 1700, text: 'Encore une bascule ! Tu sais quoi faire.' },
    { id: 'wall', minX: 2100, text: 'Ce mur de racines est bien trop haut…', requiresNoSprings: true },
  ],
  lesson: {
    title: 'Le ressort',
    text:
      'Un ressort qu’on comprime stocke de l’énergie (énergie élastique). Quand il se détend, il la rend d’un coup : c’est ce qui permet à Miko de sauter deux fois plus haut. Plus on comprime un ressort, plus il pousse fort.',
    formula: 'Loi de Hooke : F = k × x',
    tryIt: 'Les jambes-ressorts restent avec Miko pour la suite de l’aventure.',
  },
};

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'foret',
    number: 1,
    name: 'La forêt mécanique',
    goal: 'Traverser des obstacles',
    physics: 'Gravité, leviers',
    blurb: 'Des arbres de cuivre, des ponts effondrés et de vieilles bascules oubliées.',
    theme: { deco: 'forest', skyTop: '#0d1c17', skyBottom: '#24412f', groundTop: '#5a7a3a', groundMid: '#3b4f26', groundBottom: '#1a2412', accent: '#9be36b' },
    adventures: [foret1, foret2, foret3],
  },
  {
    id: 'montagne',
    number: 2,
    name: 'La montagne',
    goal: 'Escalader et transporter',
    physics: 'Poulies, forces',
    blurb: 'Des téléphériques figés et des monte-charges à remettre en route.',
    theme: { deco: 'mountain', skyTop: '#1b2540', skyBottom: '#5b6f91', groundTop: '#8c8f96', groundMid: '#5a5d66', groundBottom: '#2a2c33', accent: '#cfe3ff' },
    adventures: [],
  },
  {
    id: 'desert',
    number: 3,
    name: 'Le désert',
    goal: 'Construire des systèmes d’eau',
    physics: 'Pression, fluides',
    blurb: 'Des pompes ensablées et des canaux à sec.',
    theme: { deco: 'desert', skyTop: '#3b1f2a', skyBottom: '#e0915a', groundTop: '#e8c27a', groundMid: '#b98b4b', groundBottom: '#5b3e1f', accent: '#ffd27a' },
    adventures: [],
  },
  {
    id: 'ville',
    number: 4,
    name: 'La ville abandonnée',
    goal: 'Restaurer les machines',
    physics: 'Engrenages, énergie',
    blurb: 'Des horloges géantes et des usines qui ne tournent plus.',
    theme: { deco: 'city', skyTop: '#16141c', skyBottom: '#3c3446', groundTop: '#7a6a5a', groundMid: '#4a4038', groundBottom: '#1e1a17', accent: '#ffc857' },
    adventures: [],
  },
  {
    id: 'labo',
    number: 5,
    name: 'Le laboratoire',
    goal: 'Résoudre des défis complexes',
    physics: 'Électricité, magnétisme',
    blurb: 'Le dernier secret : qui est E., et pourquoi a-t-il construit Miko ?',
    theme: { deco: 'lab', skyTop: '#0b1220', skyBottom: '#1f3550', groundTop: '#5a6b7a', groundMid: '#34404c', groundBottom: '#141a20', accent: '#5fe0d0' },
    adventures: [],
  },
];
