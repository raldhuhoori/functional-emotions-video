# Engine reference

The painted-animation engine behind *Functional Emotions*, split out so other projects (first: **Sukoon**) can use it. Everything in `engine/` is shared and story-free; everything a particular video needs (its size, audio, timing data, palette, characters, scenes) lives in its own folder under `projects/`.

## How a frame is made

Every frame is a **pure function of time `t`** (seconds). Each shot draws two Canvas2D layers in full-size coordinates (`W`×`H`, e.g. 1920×1080 or 1080×1920; the layers run at half resolution internally):

- **`s`, the underpainting:** flat shapes, gradients, silhouettes. The GPU repaints it with tens of thousands of instanced, textured brushstrokes in three size layers. Each stroke samples its colour from `s` and aligns to the local edge, and in flat areas it follows a flow field. Value contrast and big clear shapes read best. Details under ~8 px dissolve into paint.
- **`f`, the light layer:** starts black every frame. Whatever you draw on it is **added as light** with bloom, and it isn't repainted, so it stays crisp. It has no depth: use `occlude()` to block light behind a body.

Strokes re-roll a few times a second (`boil`), which gives the hand-painted look. `whip()` smears them along a motion. The finish adds canvas weave, grain and vignette. Brush sizes are in pixels, so a vertical frame gets the same brush scale as a horizontal one.

Because frames depend only on `t`, the player can show them live in sync with audio, and `tools/render.mjs` can render them out of order in parallel. **No state between frames and no `Math.random()`:** use `hash(i)`, `rng(seed)`, `noise1`/`snoise`.

## Anatomy of a project

```
projects/<name>/
  index.html        the player page: loads project config, engine, cast, chapters, then the player (see order below)
  js/project.js     PROJECT config + palette P (loaded first)
  js/data.js        optional: window.LYRICS (timed words) and window.FEAT (audio features, beats)
  js/cast.js        optional: this project's characters / props (built on the rig)
  js/ch/c1.js …     the chapters (one file each)
  assets/           this project's own audio and media
```

Script order in `index.html` (all plain scripts sharing globals, so it works from `file://`):

```html
<script src="js/project.js"></script>
<script src="js/data.js"></script>              <!-- optional -->
<script src="../../engine/paint.js"></script>
<script src="../../engine/core.js"></script>
<script src="../../engine/timeline.js"></script>
<script src="../../engine/rig.js"></script>
<script src="../../engine/scenery.js"></script>
<script src="js/cast.js"></script>              <!-- optional -->
<script src="js/ch/c1.js"></script>             <!-- chapters, in time order -->
<script src="../../engine/player.js"></script>
```

### `PROJECT` (js/project.js)

| Field | Meaning |
|---|---|
| `title` | Page title |
| `width`, `height` | Output size in px; multiples of 8. Default 1920×1080. Vertical: 1080×1920 |
| `duration` | Length in seconds (`DUR`) |
| `tempo` | `{ beat, offset }`: seconds per beat and the time of beat 0 (`BEAT`, `B0`), or `null` for speech/no grid |
| `audio` | Path to the soundtrack, relative to the project folder, or `null` (the player then runs on a silent clock and renders are silent) |
| `background` | Colour painted under every frame before the shots |

`P` is the project palette, an object of named colours. The rig and scenery use it for defaults (`figure()` → `P.ink`, `sky()` → `P.night0/night1/dusk`, `moon()` → `P.cream`). Pass explicit colours, or define those keys.

### `js/data.js` (optional)

```js
window.LYRICS = [{ text, s, e, words: [{ t, s, e }, …] }, …];       // lines and words with start/end seconds
window.FEAT = { fps, beats: [seconds…], rms: [], low: [], mid: [], high: [], onset: [], perc: [], cent: [] };  // 0..~1 per frame
```

Without it, `F()` returns 0, beats come from `PROJECT.tempo` (or there are none), and `when()` has no words to find.

## A chapter file

```js
// js/ch/c1.js — name (start – end)
(() => {
  function opening(t, lt, dur) { /* paint the ENTIRE frame on s (and f as needed) */ }
  function close(t, lt, dur) { … }
  chapter('intro', 0, 12.5, [
    [0, opening],
    [6.2, close, { paint: { boil: 10 }, xin: .4 }],   // optional per-shot paint settings, cross-fade in
  ], { paint: (t) => ({ boil: 8, bloom: 1.2 }) });    // chapter default paint settings
})();
```

- A shot is `fn(t, lt, dur)`: global time, time since the shot started, shot length. It paints the whole frame, background included.
- Wrap each file in an IIFE so helpers stay private. Each chapter must end exactly where the next one starts.

## Paint settings (`paint:` per shot/chapter, or `paintSet({...})` per frame)

`boil` (stroke re-rolls per second, 6–12), `bloom` (~1–2), `flowK` (swirl in flat areas, 0.5–1.5), `strokeK` (stroke size, 0.7–1.5), `grain`, `vig`. `whip(dx, dy)` smears strokes along a direction (magnitude ~60 is full smear).

## API

**core.js · math & time:** `clamp lerp inv(a,b,x) smooth`, `ease.out/in/inOut/back/sine`, `hash(i)`, `rng(seed)`, `noise1(x, seed)`, `snoise`, `TAU`. `kf(t, [[t0, v0], [t1, v1], …], easeFn)` keyframes numbers or arrays (use it for every camera move and choreography). `hit(t, t0, decay)` gives a 1→0 envelope for impacts.

**core.js · camera & transitions:** `cam(cx, cy, zoom, rot)` puts world point (cx, cy) at screen centre; call it once at the top of a shot. `shake(t, amt)` → [dx, dy]. Screen-space effects (after drawing): `flash(k, colour)`, `blackout(k)`, `iris(cx, cy, r)`, `screen(fn)`.

**core.js · drawing** (`g` is `s` or `f`): `fill`, `vgrad`, `rgrad`, `dot`, `poly`, `stroke`, `ridge`, `bez` → points, `at(pts, u)`, `glow(x, y, r, colour)` (soft light on `f`), `occlude(fn)`. **Registry:** `chapter(...)`, `shot(...)`, `SHOTS`.

**timeline.js:** `DUR`, `F(name, t, smoothFrames)`, `BT(n)` beat time, `lastBeat(t)`, `beatAfter(t)`, `beatPulse(t, decay)`, `beatPhase(t)`, `sway(t)`, `bob(t)`, `BEAT`, `B0`, `BEATS`. `when(word, after)` is the start time of the first matching word after `after`. It is Arabic-aware: tashkeel, tatweel and Quranic marks are ignored, أ/إ/آ/ٱ → ا, ى → ي, ة → ه, and Arabic-Indic digits → 0-9. Without a tempo, `sway`, `bob` and `beatPhase` are 0 and `beatPulse` is 0.

**rig.js:** `figure(g, pose, { x, y, sc, color, coat, headC, limbC, width })` is the mannequin rig: (x, y) is the hip, the figure is ~1.9·`sc` tall, and it returns joints (`head`, `neck`, `hdL`, `hdR`, …). `taper(g, a, b, w1, w2, c)`. `POSE.stand rise reach write sit hold lean bow armsUp dance1 dance2` (radians; limbs from straight down, torso/head from straight up). `mixPose(a, b, k)`. `groove(base, style, t, amt)` → `{ pose, dx, dy }` with styles `idle nod sway bounce funk walk row`. The beat-driven styles need a tempo.

**scenery.js:** `sky(top, mid, low, horizonY)`, `clouds(t, seed, y0, y1, colour, n, speed)`, `stars(t, seed, n, yMax, a)`, `moon(x, y, r)`.

**Globals:** `W`, `H` (output size), `s`, `f` (the two layers), `Paint`, `PROJECT`, `P`.

## Tools

```bash
node tools/check.mjs <project-dir> out/sheet.jpg 1.0 2.5 4.0     # contact sheet (3 columns), prints ms/frame and page errors
node tools/check.mjs <project-dir> --full out/stills 1.0 2.5      # full-size stills
node tools/render.mjs <project-dir> <t0> <t1> out/video.mp4 [workers] [fps]   # MP4 at the project's size, with its audio if any
```

Chrome on a real GPU is fast (`--use-angle=metal` on macOS). Without a GPU the tools use SwiftShader (software WebGL2), about 1.3 s per frame. Keep frames under ~150 ms on a GPU.

## Starting a new project

Copy `projects/sukoon/` as the skeleton (vertical, no audio, empty palette, no chapters). Set `PROJECT`, put the project's own audio in `assets/`, add chapter scripts to `index.html`, and check them with `tools/check.mjs`.
