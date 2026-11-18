// Functional Emotions · project config. Loaded first: the engine reads PROJECT (size, duration, tempo, audio)
// and the palette P (default colours for the figure rig and scenery).
// ---- palette ----
const P = {
  night0: '#070b1f', night1: '#0e1a45', night2: '#233a7a', dusk: '#4b3f7e', haze: '#6d5a8e',
  ink: '#0a0d1c', hill: '#10183a', hill2: '#1a2552', city: '#0d1330',
  ember: '#ff5a1f', amber: '#ffb347', gold: '#ffd98a', cream: '#f3e6c9', coat: '#d8d4c6', coatShade: '#8f91a0',
  red: '#e0301e', sea: '#0f2a4a', sea2: '#1f4a6e', skin: '#e8b98a',
};
const PROJECT = {
  title: 'Functional Emotions',
  width: 1920, height: 1080,
  duration: 372.7,
  tempo: { beat: 0.7, offset: 1.7 },   // 85.7 bpm grid (BEAT, B0); detected beats come from js/data.js
  audio: 'assets/functional-emotions.mp3',
  background: P.night0,
};
