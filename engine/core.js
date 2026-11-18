// Sukoon engine · core: math, deterministic randomness, Canvas2D drawing helpers, keyframes, camera,
// screen-space transitions, per-frame paint overrides, the chapter/shot registry, light occlusion.
// Loaded after engine/paint.js (which defines W, H, SW, SH from PROJECT). Everything is a global, by design:
// chapter files are plain scripts that use these names directly.
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const ease = {
  out: (x) => 1 - Math.pow(1 - clamp(x), 3),
  in: (x) => Math.pow(clamp(x), 3),
  inOut: (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  back: (x) => { x = clamp(x); if (x <= 0) return 0; const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  sine: (x) => .5 - .5 * Math.cos(Math.PI * clamp(x)),
};
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const a = hash(i * 7919 + seed * 104729), b = hash((i + 1) * 7919 + seed * 104729); const u = f * f * (3 - 2 * f); return a + (b - a) * u; }
const snoise = (x, seed = 0) => noise1(x, seed) * 2 - 1;

// ---- drawing helpers (s = src ctx, f = light ctx), all in 1920x1080 coords ----
let s, f;
function bindCtx() { s = Paint.sctx; f = Paint.fctx; }
function fill(g, c) { g.fillStyle = c; g.fillRect(-50, -50, W + 100, H + 100); }
function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function rgrad(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function glow(x, y, r, color, a = 1) { // soft light on the light layer
  if (!(r > .5)) return;
  f.save(); f.globalCompositeOperation = 'lighter'; f.globalAlpha = a;
  f.fillStyle = rgrad(f, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]); f.fillRect(x - r, y - r, r * 2, r * 2); f.restore();
}
function dot(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); g.fill(); }
function poly(g, pts, c, close = true) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (close) { g.closePath(); g.fillStyle = c; g.fill(); } else { g.strokeStyle = c; g.stroke(); } }
function ridge(g, y, amp, freq, seed, c, x0 = -60, x1 = W + 60, bottom = H + 60) { // a hill line filled below
  g.beginPath(); g.moveTo(x0, bottom);
  for (let x = x0; x <= x1; x += 16) g.lineTo(x, y + (noise1(x * freq, seed) - .5) * amp + (noise1(x * freq * 3.1, seed + 9) - .5) * amp * .3);
  g.lineTo(x1, bottom); g.closePath(); g.fillStyle = c; g.fill();
}
function stroke(g, pts, c, w, cap = 'round') { g.lineCap = cap; g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
function bez(p0, p1, p2, p3, n = 30) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; o.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]); } return o; }
function at(pts, u) { const i = clamp(u) * (pts.length - 1); const k = Math.floor(i), r = i - k; const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)]; return [lerp(a[0], b[0], r), lerp(a[1], b[1], r)]; }

// ---- keyframes, camera, shake ----
// kf(t, [[t0, v0], [t1, v1], ...], easeFn): values may be numbers or arrays
function kf(t, keys, e = ease.inOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a)); return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k); }
  return keys[keys.length - 1][1];
}
// put world point (cx, cy) at screen centre, zoomed and rotated; applies to both layers. Call once per shot, before drawing.
function cam(cx = W / 2, cy = H / 2, zoom = 1, rot = 0) { for (const g of [s, f]) { g.translate(W / 2, H / 2); g.rotate(rot); g.scale(zoom, zoom); g.translate(-cx, -cy); } }
// hand-held shake: [dx, dy], re-rolled 24x/s, decaying hits via amt
function shake(t, amt) { const k = Math.floor(t * 24); return [(hash(k * 3 + 1) - .5) * 2 * amt, (hash(k * 3 + 2) - .5) * 2 * amt]; }
// hit envelope: 1 at t0, decays
const hit = (t, t0, decay = 6) => t < t0 ? 0 : Math.exp(-decay * (t - t0));

// per-frame paint overrides a shot can set (e.g. smear for whip pans)
let PAINT_FRAME = {};
function paintSet(o) { Object.assign(PAINT_FRAME, o); }
function whip(dx, dy) { paintSet({ smear: [dx, dy] }); }

// full-frame effects in screen space (call after cam work is done; they reset the transform)
function screen(fn) { for (const g of [s, f]) { g.save(); g.setTransform(.5, 0, 0, .5, 0, 0); } fn(); for (const g of [s, f]) g.restore(); }
function flash(k, col = '#fff2dc') { if (k > .01) screen(() => { f.save(); f.globalCompositeOperation = 'lighter'; f.globalAlpha = clamp(k); f.fillStyle = col; f.fillRect(-10, -10, W + 20, H + 20); f.restore(); }); }
function blackout(k) { if (k > .01) screen(() => { for (const g of [s, f]) { g.save(); g.globalAlpha = clamp(k); g.fillStyle = '#000'; g.fillRect(-10, -10, W + 20, H + 20); g.restore(); } }); }
// paint everything outside a circle (iris transitions)
function iris(cx, cy, r, col = '#05060d') { screen(() => { for (const g of [s, f]) { g.save(); g.fillStyle = g === f ? '#000' : col; g.beginPath(); g.rect(-10, -10, W + 20, H + 20); g.arc(cx, cy, Math.max(0, r), 0, TAU, true); g.fill('evenodd'); g.restore(); } }); }

// ---- chapters and shots ----
// chapter(name, start, end, [[t0, fn], [t1, fn], ...]); fn(t, lt, dur) paints the entire frame. Cuts land on each t0.
const SHOTS = [];
function shot(name, a, b, fn, o = {}) { SHOTS.push({ name, a, b, fn, o }); }
function chapter(name, a, b, list, o = {}) {
  list.forEach(([t0, fn, so = {}], i) => { const t1 = i + 1 < list.length ? list[i + 1][0] : b; shot(`${name}:${fn.name || i}`, t0, t1, (t, p, lt) => fn(t, lt, t1 - t0), { paint: so.paint || o.paint, xin: so.xin }); });
}

// ---- light occlusion ----
// The light layer is additive and ignores depth, so a glow drawn behind a body shows through it.
// To block it, repaint the silhouette on f in black AFTER the light it should hide:
//   occlude(() => figure(f, pose, { x, y, sc, color: '#000', coat: coat ? '#000' : null, headC: '#000' }))
// Inside the callback draw on `f` with '#000' fills (poly(f, pts, '#000'), dot(f, …, '#000'), etc.).
function occlude(fn) { f.save(); f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1; fn(); f.restore(); }
