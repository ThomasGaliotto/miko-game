import React from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Miko's final visual design (Pixar warmth x steampunk workshop):
 * - big enamel-and-copper head, two brass camera-lens eyes with copper eyelid plates
 * - amber antenna bulb (mood / energy light)
 * - riveted repair patch on the head (he has been fixed before... by whom?)
 * - belly gauge, leather tool satchel, wind-up key on the back
 *
 * Art is authored in a 300x400 box, feet resting on y=372, centered on x=150.
 */

export type Mood = 'idle' | 'happy' | 'fail' | 'surprise' | 'focus' | 'curious';

export const MIKO_COLORS = {
  copper: '#c8743a',
  copperDark: '#8c4421',
  outline: '#4a2614',
  brass: '#e0b25a',
  enamel: '#f6ead0',
  leather: '#7a4a26',
  glow: '#5fe0d0',
  bulb: '#ffc857',
  blush: '#f08a5d',
};

const C = MIKO_COLORS;

type EyeProps = { cx: number; cy: number; lid: number; lidTilt: number; lookX: number; lookY: number; iris: number; happy: boolean; id: string };

function Eye({ cx, cy, lid, lidTilt, lookX, lookY, iris, happy, id }: EyeProps) {
  return (
    <G>
      <Defs>
        <ClipPath id={id}>
          <Circle cx={cx} cy={cy} r={27} />
        </ClipPath>
      </Defs>
      <Circle cx={cx} cy={cy} r={35} fill={C.brass} stroke={C.outline} strokeWidth={4} />
      <Circle cx={cx} cy={cy} r={27} fill="#16222b" />
      {happy ? (
        <Path d={`M${cx - 15} ${cy + 6} Q${cx} ${cy - 16} ${cx + 15} ${cy + 6}`} stroke={C.glow} strokeWidth={7} strokeLinecap="round" fill="none" />
      ) : (
        <G>
          <Circle cx={cx + lookX} cy={cy + lookY} r={15 * iris} fill={C.glow} />
          <Circle cx={cx + lookX} cy={cy + lookY} r={7 * iris} fill="#0c1a20" />
          <Circle cx={cx + lookX - 7} cy={cy + lookY - 8} r={4.5} fill="#ffffff" />
        </G>
      )}
      {lid > 0 && (
        <G clipPath={`url(#${id})`}>
          <Rect
            x={cx - 40}
            y={cy - 27 - 40}
            width={80}
            height={40 + 54 * lid}
            fill={C.copper}
            stroke={C.outline}
            strokeWidth={3}
            transform={`rotate(${lidTilt} ${cx} ${cy})`}
          />
        </G>
      )}
    </G>
  );
}

type MikoProps = {
  mood?: Mood;
  blink?: boolean;
  walkPhase?: number; // radians, animates legs while walking
  springLegs?: boolean;
  uid?: string;
};

export function MikoArt({ mood = 'idle', blink = false, walkPhase = 0, springLegs = false, uid = 'm' }: MikoProps) {
  // Expression table: eyelids + gaze + iris + mouth + antenna light
  const ex = {
    idle: { lid: 0.18, tiltL: 0, tiltR: 0, lx: 0, ly: 0, iris: 1, happy: false, mouth: 'smile', bulb: C.bulb, energy: 0.55 },
    curious: { lid: 0.1, tiltL: -12, tiltR: 0, lx: 6, ly: -4, iris: 1.1, happy: false, mouth: 'o', bulb: C.bulb, energy: 0.6 },
    happy: { lid: 0, tiltL: 0, tiltR: 0, lx: 0, ly: 0, iris: 1, happy: true, mouth: 'grin', bulb: '#ffe28a', energy: 0.9 },
    fail: { lid: 0.42, tiltL: 14, tiltR: -14, lx: 0, ly: 6, iris: 0.8, happy: false, mouth: 'wobble', bulb: '#ff7b54', energy: 0.15 },
    surprise: { lid: 0, tiltL: 0, tiltR: 0, lx: 0, ly: -2, iris: 0.7, happy: false, mouth: 'O', bulb: '#ffffff', energy: 0.8 },
    focus: { lid: 0.38, tiltL: -8, tiltR: 8, lx: 4, ly: 4, iris: 1, happy: false, mouth: 'flat', bulb: C.glow, energy: 0.65 },
  }[mood];

  const lid = blink && !ex.happy ? 1 : ex.lid;
  const legL = Math.sin(walkPhase) * 6;
  const legR = -legL;
  const angle = Math.PI * (0.85 + ex.energy * 1.3); // gauge needle
  const nx = 150 + Math.cos(angle) * 20;
  const ny = 282 + Math.sin(angle) * 20;

  const mouth = {
    smile: <Path d="M138 190 Q150 199 162 190" stroke={C.outline} strokeWidth={4} fill="none" strokeLinecap="round" />,
    grin: <Path d="M134 187 Q150 206 166 187 Z" fill={C.outline} />,
    o: <Circle cx={150} cy={193} r={5} fill={C.outline} />,
    O: <Ellipse cx={150} cy={195} rx={8} ry={10} fill={C.outline} />,
    flat: <Line x1={141} y1={193} x2={159} y2={193} stroke={C.outline} strokeWidth={4} strokeLinecap="round" />,
    wobble: <Path d="M136 196 L142 190 L148 196 L154 190 L160 196 L166 190" stroke={C.outline} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  }[ex.mouth as 'smile'];

  return (
    <G>
      <Defs>
        <LinearGradient id={`${uid}-cu`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ec9a55" />
          <Stop offset="0.6" stopColor={C.copper} />
          <Stop offset="1" stopColor={C.copperDark} />
        </LinearGradient>
      </Defs>

      {/* wind-up key (behind the body) */}
      <Line x1={196} y1={270} x2={232} y2={270} stroke={C.outline} strokeWidth={8} />
      <Ellipse cx={242} cy={258} rx={9} ry={13} fill={C.brass} stroke={C.outline} strokeWidth={3} />
      <Ellipse cx={242} cy={282} rx={9} ry={13} fill={C.brass} stroke={C.outline} strokeWidth={3} />

      {/* legs */}
      {springLegs ? (
        <G>
          <Path d={`M130 318 l-10 8 l20 8 l-20 8 l20 8 l-10 8`} stroke="#9aa7ad" strokeWidth={6} fill="none" strokeLinejoin="round" transform={`translate(0 ${legL})`} />
          <Path d={`M170 318 l-10 8 l20 8 l-20 8 l20 8 l-10 8`} stroke="#9aa7ad" strokeWidth={6} fill="none" strokeLinejoin="round" transform={`translate(0 ${legR})`} />
        </G>
      ) : (
        <G>
          <Rect x={120} y={316 + legL} width={20} height={40} rx={6} fill="#6e4a2a" stroke={C.outline} strokeWidth={3} />
          <Rect x={160} y={316 + legR} width={20} height={40} rx={6} fill="#6e4a2a" stroke={C.outline} strokeWidth={3} />
        </G>
      )}
      <Rect x={104} y={350 + Math.min(0, legL)} width={44} height={22} rx={11} fill={`url(#${uid}-cu)`} stroke={C.outline} strokeWidth={4} />
      <Rect x={152} y={350 + Math.min(0, legR)} width={44} height={22} rx={11} fill={`url(#${uid}-cu)`} stroke={C.outline} strokeWidth={4} />

      {/* body */}
      <Rect x={134} y={214} width={32} height={20} fill="#6e4a2a" stroke={C.outline} strokeWidth={3} />
      <Rect x={98} y={228} width={104} height={100} rx={32} fill={`url(#${uid}-cu)`} stroke={C.outline} strokeWidth={4} />
      <Circle cx={150} cy={282} r={30} fill={C.enamel} stroke={C.outline} strokeWidth={3} />
      <Path d="M132 296 A22 22 0 0 1 128 282" stroke="#e0584a" strokeWidth={4} fill="none" />
      <Line x1={150} y1={282} x2={nx} y2={ny} stroke="#c0392b" strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={150} cy={282} r={4} fill={C.outline} />

      {/* satchel strap + bag + wrench */}
      <Line x1={194} y1={240} x2={110} y2={304} stroke={C.outline} strokeWidth={8} strokeLinecap="round" />
      <Rect x={146} y={268} width={10} height={9} fill={C.brass} stroke={C.outline} strokeWidth={2} transform="rotate(-37 151 272)" />
      <Rect x={92} y={272} width={10} height={26} rx={3} fill="#9aa7ad" stroke={C.outline} strokeWidth={2.5} />
      <Circle cx={97} cy={270} r={8} fill="none" stroke="#9aa7ad" strokeWidth={5} />
      <Rect x={74} y={292} width={42} height={34} rx={8} fill={C.leather} stroke={C.outline} strokeWidth={3.5} />
      <Path d="M74 300 Q95 314 116 300" fill="#8f5a30" stroke={C.outline} strokeWidth={3} />
      <Circle cx={95} cy={310} r={3} fill={C.brass} />

      {/* arms */}
      <Path d="M102 256 Q80 274 84 304" stroke="#6e4a2a" strokeWidth={13} fill="none" strokeLinecap="round" />
      <Path d="M198 256 Q220 274 216 304" stroke="#6e4a2a" strokeWidth={13} fill="none" strokeLinecap="round" />
      <Circle cx={84} cy={308} r={12} fill={C.brass} stroke={C.outline} strokeWidth={3} />
      <Circle cx={216} cy={308} r={12} fill={C.brass} stroke={C.outline} strokeWidth={3} />

      {/* head */}
      <Line x1={150} y1={62} x2={150} y2={30} stroke={C.outline} strokeWidth={5} />
      <Circle cx={150} cy={22} r={16} fill={ex.bulb} opacity={0.3} />
      <Circle cx={150} cy={22} r={10} fill={ex.bulb} stroke={C.outline} strokeWidth={3} />
      <Circle cx={52} cy={150} r={16} fill={C.brass} stroke={C.outline} strokeWidth={3} />
      <Circle cx={248} cy={150} r={16} fill={C.brass} stroke={C.outline} strokeWidth={3} />
      <Circle cx={52} cy={150} r={6} fill={C.outline} />
      <Circle cx={248} cy={150} r={6} fill={C.outline} />
      <Rect x={50} y={58} width={200} height={170} rx={78} fill={`url(#${uid}-cu)`} stroke={C.outline} strokeWidth={4} />
      <Ellipse cx={108} cy={82} rx={36} ry={11} fill="#ffffff" opacity={0.25} transform="rotate(-14 108 82)" />
      <G transform="rotate(8 196 82)">
        <Rect x={182} y={70} width={30} height={22} rx={3} fill="#9a6b3c" stroke={C.outline} strokeWidth={2.5} />
        <Circle cx={186} cy={74} r={2} fill={C.outline} />
        <Circle cx={208} cy={74} r={2} fill={C.outline} />
        <Circle cx={186} cy={88} r={2} fill={C.outline} />
        <Circle cx={208} cy={88} r={2} fill={C.outline} />
      </G>
      <Rect x={66} y={100} width={168} height={112} rx={52} fill={C.enamel} stroke={C.outline} strokeWidth={3} />
      <Circle cx={82} cy={190} r={9} fill={C.blush} opacity={0.5} />
      <Circle cx={218} cy={190} r={9} fill={C.blush} opacity={0.5} />
      <Eye id={`${uid}-el`} cx={108} cy={148} lid={lid} lidTilt={ex.tiltL} lookX={ex.lx} lookY={ex.ly} iris={ex.iris} happy={ex.happy} />
      <Eye id={`${uid}-er`} cx={192} cy={148} lid={lid} lidTilt={ex.tiltR} lookX={ex.lx} lookY={ex.ly} iris={ex.iris} happy={ex.happy} />
      {mouth}
    </G>
  );
}

/** Miko placed in world space: (x, y) is the center of his 40x60 physics box. */
export function MikoInWorld(props: MikoProps & { x: number; y: number; facing: 1 | -1; squash?: number }) {
  const { x, y, facing, squash = 1, ...rest } = props;
  const s = 0.19;
  return (
    <G transform={`translate(${x} ${y + 30}) scale(${facing * s / Math.sqrt(squash)} ${s * squash}) translate(-150 -372)`}>
      <MikoArt {...rest} />
    </G>
  );
}
