// Sukoon engine · timeline: song/episode time, audio features, the beat grid, and word timing.
//
// Driven by the project:
//   PROJECT.duration          length in seconds (DUR)
//   PROJECT.tempo             optional { beat: seconds per beat, offset: time of beat 0 } -> BEAT, B0
//   window.FEAT  (optional)   audio features + detected beats, from the project's js/data.js
//   window.LYRICS (optional)  timed lines/words, from the project's js/data.js
// Everything degrades gracefully when a project has no music, no data file, or no tempo:
// F() returns 0, beat helpers return calm constants, and when() throws a clear error.

const DUR = PROJECT.duration;
const HAS_FEAT = typeof FEAT !== 'undefined';
const BEAT = PROJECT.tempo ? PROJECT.tempo.beat : 0, B0 = PROJECT.tempo ? PROJECT.tempo.offset : 0;
// beat times: detected beats when the data file has them, otherwise the tempo grid, otherwise none
const BEATS = HAS_FEAT && FEAT.beats ? FEAT.beats
  : BEAT > 0 ? Array.from({ length: Math.max(0, Math.floor((DUR - B0) / BEAT) + 1) }, (_, n) => +(B0 + n * BEAT).toFixed(3)) : [];

// ---- audio features: F(name, t, smoothFrames) -> 0..~1 (0 when the project has no feature data) ----
function F(name, t, sm = 0) {
  if (!HAS_FEAT || !FEAT[name]) return 0;
  const a = FEAT[name]; const f = t * FEAT.fps;
  if (!sm) { const i = Math.floor(f), u = f - i; return lerp(a[clamp(i, 0, a.length - 1)] || 0, a[clamp(i + 1, 0, a.length - 1)] || 0, u); }
  let s = 0, n = 0; const c = Math.round(f); for (let k = -sm; k <= sm; k++) { const v = a[c + k]; if (v !== undefined) { s += v; n++; } } return n ? s / n : 0;
}

// ---- beats ----
function lastBeat(t) { const b = BEATS; if (!b.length || t < b[0]) return -1; let lo = 0, hi = b.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (b[m] <= t) lo = m; else hi = m - 1; } return lo; }
function beatPulse(t, decay = 6) { const i = lastBeat(t); return i < 0 ? 0 : Math.exp(-decay * (t - BEATS[i])); }
const beatPhase = (t) => BEAT > 0 ? (((t - B0) / BEAT) % 1 + 1) % 1 : 0;
// lazy swing: bodies sway across two beats with the backbeat dragged late (0 without a tempo)
function sway(t) { if (!(BEAT > 0)) return 0; const ph = (((t - B0) / (BEAT * 2)) % 1 + 1) % 1; const sw = ph < .5 ? ph * 1.16 : .58 + (ph - .5) * .84; return Math.sin(sw * TAU); }
function bob(t) { const ph = beatPhase(t); return Math.pow(Math.sin(ph * Math.PI), 2); } // dips each beat
// beat time by index; in the original song downbeats fall on indices ≡ 2 (mod 4)
const BT = (n) => BEATS[n];
function beatAfter(t) { const i = lastBeat(t); return BEATS[i + 1] ?? t; }

// ---- word timing (lyrics or spoken words; timing only, almost never drawn) ----
const LINES = typeof LYRICS !== 'undefined' ? LYRICS : [];
// Word normalisation for matching. Latin: lowercase, keep only a-z0-9 (exactly the original behaviour).
// Arabic: drop tashkeel, tatweel and Quranic marks; unify alef forms (أ إ آ ٱ -> ا), ى -> ي, ة -> ه;
// Arabic-Indic and Persian digits -> 0-9; keep Arabic letters.
const norm = (s) => s.toLowerCase()
  .replace(/[ً-ٰٟـۖ-ۭ]/g, '')
  .replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
  .replace(/[^a-z0-9ء-ي]/g, '');
// start time of the first word matching `word` at or after `after`
function when(word, after = 0) { const w = norm(word); for (const l of LINES) for (const x of l.words) if (x.s >= after - .01 && norm(x.t) === w) return x.s; throw new Error('no word ' + word + ' after ' + after); }
