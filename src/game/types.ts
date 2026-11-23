// Shared data types for chapters (worlds) and adventures (levels).
// World units are pixels, y grows downward. 100 px = 1 m for the physics overlay.

export type PartKind = 'planche' | 'caisse' | 'enclume';

export type RectDef = { x: number; y: number; w: number; h: number };

export type SeesawDef = { pivotX: number; pivotY: number; length: number; thickness: number; pivotOffset: number; startAngle: number };

export type PickupDef =
  | { id: string; x: number; y: number; type: 'part'; part: PartKind }
  | { id: string; x: number; y: number; type: 'upgrade'; upgrade: 'ressorts' }
  | { id: string; x: number; y: number; type: 'fragment'; text: string };

export type HintDef = { id: string; minX: number; maxX?: number; text: string; requiresNoSprings?: boolean };

export type Lesson = { title: string; text: string; formula?: string; tryIt?: string };

export type AdventureDef = {
  id: string;
  title: string;
  concept: string; // physics concept, shown on cards
  goal: string; // one-line objective shown at start
  bounds: { left: number; right: number };
  view: { top: number; height: number };
  spawn: { x: number; y: number };
  killY: number;
  terrain: RectDef[];
  seesaws: SeesawDef[];
  pickups: PickupDef[];
  startInventory?: Partial<Record<PartKind, number>>;
  checkpoints: { x: number; y: number }[];
  exit: RectDef;
  hints: HintDef[];
  lesson: Lesson;
};

export type ThemeDef = {
  deco: 'forest' | 'mountain' | 'desert' | 'city' | 'lab';
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundMid: string;
  groundBottom: string;
  accent: string;
};

export type ChapterDef = {
  id: string;
  number: number;
  name: string;
  goal: string;
  physics: string;
  blurb: string;
  theme: ThemeDef;
  adventures: AdventureDef[]; // empty = not built yet
};
