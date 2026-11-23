import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';
import { MikoArt, type Mood } from './src/components/Miko';
import { CHAPTERS } from './src/game/chapters';
import GameScreen from './src/game/GameScreen';
import type { ChapterDef } from './src/game/types';

const MOODS: Mood[] = ['idle', 'curious', 'happy', 'surprise', 'focus', 'fail'];

function TitleScreen({ onPlay }: { onPlay: () => void }) {
  const { height } = useWindowDimensions();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % MOODS.length), 1400);
    return () => clearInterval(id);
  }, []);
  const size = Math.min(height * 0.62, 320);
  return (
    <View style={styles.title}>
      <Svg width={size * 0.75} height={size} viewBox="0 0 300 400">
        <MikoArt mood={MOODS[i]} uid="title" />
      </Svg>
      <View style={styles.titleText}>
        <Text style={styles.h1}>MIKO</Text>
        <Text style={styles.h2}>Le Petit Ingénieur</Text>
        <Text style={styles.tag}>Une aventure propulsée par la physique.</Text>
        <Pressable onPress={onPlay} style={styles.play}>
          <Text style={styles.playTxt}>▶ Jouer</Text>
        </Pressable>
        <Text style={styles.keys}>Clavier : ← → bouger · ↑/Espace sauter · B atelier · F forces · E pivoter · R reprendre/recommencer</Text>
      </View>
    </View>
  );
}

function WorldMap({ done, onOpen, onBack }: { done: Set<string>; onOpen: (c: ChapterDef) => void; onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Les mondes de Miko</Text>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.cards} showsHorizontalScrollIndicator={false}>
        {CHAPTERS.map((c, idx) => {
          const prev = CHAPTERS[idx - 1];
          const unlocked = c.adventures.length > 0 && (!prev || prev.adventures.every((a) => done.has(a.id)) || idx === 0);
          const count = c.adventures.filter((a) => done.has(a.id)).length;
          return (
            <Pressable
              key={c.id}
              disabled={!unlocked}
              onPress={() => onOpen(c)}
              style={[styles.card, { backgroundColor: c.theme.skyBottom, borderColor: unlocked ? c.theme.accent : '#444' }, !unlocked && { opacity: 0.55 }]}
            >
              <Text style={[styles.cardNum, { color: c.theme.accent }]}>CHAPITRE {c.number}</Text>
              <Text style={styles.cardName}>{c.name}</Text>
              <Text style={styles.cardGoal}>{c.goal}</Text>
              <View style={[styles.physicsTag, { borderColor: c.theme.accent }]}>
                <Text style={[styles.physicsTxt, { color: c.theme.accent }]}>⚙ {c.physics}</Text>
              </View>
              <Text style={styles.cardBlurb}>{c.blurb}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.cardFoot}>
                {c.adventures.length === 0 ? '🔒 Bientôt' : unlocked ? `${count}/${c.adventures.length} aventures` : '🔒 Termine le chapitre précédent'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ChapterScreen({ chapter, done, onPlay, onBack }: { chapter: ChapterDef; done: Set<string>; onPlay: (i: number) => void; onBack: () => void }) {
  return (
    <View style={[styles.screen, { backgroundColor: chapter.theme.skyTop }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>
        <View>
          <Text style={[styles.cardNum, { color: chapter.theme.accent }]}>CHAPITRE {chapter.number} · {chapter.physics.toUpperCase()}</Text>
          <Text style={styles.screenTitle}>{chapter.name}</Text>
        </View>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.cards} showsHorizontalScrollIndicator={false}>
        {chapter.adventures.map((a, i) => {
          const unlocked = i === 0 || done.has(chapter.adventures[i - 1].id);
          const finished = done.has(a.id);
          return (
            <Pressable
              key={a.id}
              disabled={!unlocked}
              onPress={() => onPlay(i)}
              style={[styles.card, styles.advCard, { borderColor: finished ? '#ffe28a' : unlocked ? chapter.theme.accent : '#444' }, !unlocked && { opacity: 0.5 }]}
            >
              <Text style={[styles.cardNum, { color: chapter.theme.accent }]}>
                AVENTURE {chapter.number}-{i + 1} {finished ? '✓' : ''}
              </Text>
              <Text style={styles.cardName}>{a.title}</Text>
              <Text style={styles.cardGoal}>{a.goal}</Text>
              <View style={[styles.physicsTag, { borderColor: chapter.theme.accent }]}>
                <Text style={[styles.physicsTxt, { color: chapter.theme.accent }]}>⚙ {a.concept}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Text style={styles.cardFoot}>{unlocked ? (finished ? 'Rejouer ▶' : 'Jouer ▶') : '🔒'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type Screen = { name: 'title' } | { name: 'map' } | { name: 'chapter'; chapter: ChapterDef } | { name: 'game'; chapter: ChapterDef; index: number; run: number };

/** Dev-only shortcut for playtesting on web: http://localhost:8081/?adv=foret-2 */
function devStartScreen(): Screen {
  if (__DEV__ && Platform.OS === 'web') {
    const id = new URLSearchParams(window.location.search).get('adv');
    for (const chapter of CHAPTERS) {
      const index = chapter.adventures.findIndex((a) => a.id === id);
      if (index >= 0) return { name: 'game', chapter, index, run: 0 };
    }
  }
  return { name: 'title' };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(devStartScreen);
  // Progress lives in memory for now (see README: persistence is a next step)
  const [done, setDone] = useState<Set<string>>(new Set());
  const [springLegs, setSpringLegs] = useState(false);

  const onWin = useCallback(
    (r: { springLegs: boolean }) => {
      if (screen.name !== 'game') return;
      const id = screen.chapter.adventures[screen.index].id;
      setDone((d) => new Set(d).add(id));
      if (r.springLegs) setSpringLegs(true);
    },
    [screen],
  );

  let content: React.ReactNode;
  if (screen.name === 'title') content = <TitleScreen onPlay={() => setScreen({ name: 'map' })} />;
  else if (screen.name === 'map')
    content = <WorldMap done={done} onBack={() => setScreen({ name: 'title' })} onOpen={(chapter) => setScreen({ name: 'chapter', chapter })} />;
  else if (screen.name === 'chapter')
    content = (
      <ChapterScreen
        chapter={screen.chapter}
        done={done}
        onBack={() => setScreen({ name: 'map' })}
        onPlay={(index) => setScreen({ name: 'game', chapter: screen.chapter, index, run: Date.now() })}
      />
    );
  else {
    const { chapter, index, run } = screen;
    content = (
      <GameScreen
        key={`${chapter.id}-${index}-${run}`}
        chapter={chapter}
        adventure={chapter.adventures[index]}
        springLegs={springLegs}
        hasNext={index + 1 < chapter.adventures.length}
        onExit={() => setScreen({ name: 'chapter', chapter })}
        onWin={onWin}
        onNext={() => setScreen({ name: 'game', chapter, index: index + 1, run: Date.now() })}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1b1410' }}>
      <StatusBar hidden />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24 },
  titleText: { maxWidth: 420, gap: 8 },
  h1: { color: '#ffc857', fontSize: 64, fontWeight: '900', letterSpacing: 6 },
  h2: { color: '#f6ead0', fontSize: 24, fontWeight: '700' },
  tag: { color: '#c9b89a', fontSize: 15, fontStyle: 'italic', marginBottom: 16 },
  play: { alignSelf: 'flex-start', backgroundColor: '#c8743a', borderColor: '#f6ead0', borderWidth: 2, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  playTxt: { color: '#fff8ea', fontSize: 22, fontWeight: '800' },
  keys: { color: '#8f7f66', fontSize: 12, marginTop: 14 },
  screen: { flex: 1, backgroundColor: '#1b1410', paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#c8743a', alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: '#f6ead0', fontSize: 26, fontWeight: '800', marginTop: -3 },
  screenTitle: { color: '#f6ead0', fontSize: 22, fontWeight: '800' },
  cards: { gap: 14, padding: 16, alignItems: 'stretch' },
  card: { width: 230, minHeight: 230, borderRadius: 18, borderWidth: 2, padding: 16, gap: 6 },
  advCard: { backgroundColor: 'rgba(255,255,255,0.06)' },
  cardNum: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  cardName: { color: '#fff8ea', fontSize: 20, fontWeight: '800' },
  cardGoal: { color: '#f6ead0', fontSize: 13 },
  physicsTag: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginVertical: 4 },
  physicsTxt: { fontSize: 12, fontWeight: '700' },
  cardBlurb: { color: '#e6dccb', fontSize: 12, fontStyle: 'italic' },
  cardFoot: { color: '#fff8ea', fontSize: 13, fontWeight: '700' },
});
