// سكون (Sukoon) · project config. Loaded first: the engine reads PROJECT (size, duration, tempo, audio)
// and the palette P (default colours for the figure rig and scenery).

// Palette: empty for now. Fill it in before relying on the engine's default colours
// (figure() uses P.ink; sky() and moon() use P.night0/night1/dusk/cream).
const P = {};

const PROJECT = {
  title: 'سكون',
  width: 1080, height: 1920,   // vertical 9:16
  duration: 60,                // placeholder length in seconds; set it to the episode's length
  tempo: null,                 // spoken audio: no beat grid (sway/bob/beatPulse stay calm)
  audio: null,                 // e.g. 'assets/episode.mp3' (the episode's own audio). null = silent clock
  background: '#000',
};
