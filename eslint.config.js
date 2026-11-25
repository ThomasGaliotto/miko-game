// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // The game engine is a mutable object kept in a ref and advanced by a requestAnimationFrame
    // loop that forces a re-render every frame, so reading it during render is intentional.
    files: ['src/game/GameScreen.tsx'],
    rules: { 'react-hooks/refs': 'off' },
  },
]);
