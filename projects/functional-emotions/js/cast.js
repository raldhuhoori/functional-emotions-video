// Functional Emotions · story cast: the researcher, the embers, the Poured One and its close-up bust.
// (Moved here from the shared lib.js / cast.js; code unchanged.)
// a researcher: coat, faceless head, optional lantern (light layer)
function researcher(pose, x, y, sc, { lantern = 0, t = 0, hand = 'R', rim = 1, rimC = 'rgba(255,150,80,.9)', coat = '#2b2d44', lit = false, face = 0, glint = .6 } = {}) {
  // backlit by default: a warm rim on the right edge, dark body; lit = pale coat facing the light
  if (rim && !lit) figure(s, pose, { x: x + 4 * rim * sc / 200, y: y - 1, sc, color: rimC, coat: rimC, headC: rimC });
  const J = figure(s, pose, { x, y, sc, color: '#0b0c16', coat: lit ? P.coat : coat, headC: lit ? '#3a3a48' : '#12131f' });
  // round glasses: two small glints. face: -1 looking left, 0 at camera, 1 right; face = null hides them (seen from behind)
  if (face !== null && glint > 0) for (const d of [-1, 1]) { const gx = J.head[0] + face * .045 * sc + d * .035 * sc * (1 - .5 * Math.abs(face)), gy = J.head[1] - .005 * sc; dot(f, gx, gy, .018 * sc, `rgba(230,240,255,${glint})`); }
  if (lantern > 0) {
    const h = hand === 'R' ? J.hdR : J.hdL; const lx = h[0], ly = h[1] + .1 * sc;
    stroke(s, [h, [lx, ly]], '#111', 2);
    dot(s, lx, ly + .04 * sc, .045 * sc, P.gold);
    glow(lx, ly + .04 * sc, .7 * sc, `rgba(255,180,100,${.22 * lantern})`); glow(lx, ly + .04 * sc, .1 * sc, `rgba(255,235,190,${.9 * lantern})`);
  }
  return J;
}

// ---- the embers: the 171, as little flame creatures ----
// x,y = base of the flame; sz = height px; o: { eyes (0..1), look [-1..1], mood: 'calm'|'scared'|'happy'|'fierce', hue 0..1 (0 = gold, 1 = red), seed, lit (0..1) }
function ember(t, x, y, sz, o = {}) {
  if (!(sz > .5)) return;
  const { eyes = 1, look = 0, mood = 'calm', hue = .3, seed = 0, lit = 1, lean = 0 } = o;
  const fl = Math.sin(t * 9 + seed * 7) * .08 + Math.sin(t * 5.3 + seed) * .06;
  const r = lerp(255, 235, hue), g = lerp(200, 70, hue), bb = lerp(90, 30, hue);
  const tip = [x + (lean + fl) * sz, y - sz * (1 + fl * .5)];
  s.fillStyle = `rgb(${r * .85 | 0},${g * .7 | 0},${bb * .6 | 0})`;
  s.beginPath(); s.moveTo(tip[0], tip[1]); s.bezierCurveTo(x + sz * .55, y - sz * .45, x + sz * .42, y, x, y); s.bezierCurveTo(x - sz * .42, y, x - sz * .55, y - sz * .45, tip[0], tip[1]); s.fill();
  f.save(); f.globalCompositeOperation = 'lighter';
  f.fillStyle = `rgba(${r},${g},${bb},${(eyes > 0 && sz > 10 ? .22 : .55) * lit})`; f.beginPath(); f.moveTo(tip[0], tip[1]); f.bezierCurveTo(x + sz * .45, y - sz * .4, x + sz * .32, y, x, y); f.bezierCurveTo(x - sz * .32, y, x - sz * .45, y - sz * .4, tip[0], tip[1]); f.fill();
  f.restore();
  glow(x, y - sz * .35, sz * 1.1, `rgba(${r},${g},${bb},${.28 * lit})`);
  if (eyes > 0 && sz > 10) {
    const ey = y - sz * .32, ex = sz * .13, lx = look * sz * .06;
    const h2 = mood === 'scared' ? .09 : mood === 'happy' ? .03 : mood === 'fierce' ? .04 : .06;
    for (const d of [-1, 1]) { s.fillStyle = '#2a0c04'; s.beginPath(); s.ellipse(x + d * ex + lx, ey, sz * .05, sz * h2 * eyes, 0, 0, TAU); s.fill(); }
    if (mood === 'fierce') stroke(s, [[x - ex * 1.8 + lx, ey - sz * .12], [x + lx, ey - sz * .05], [x + ex * 1.8 + lx, ey - sz * .12]], '#2a0c04', sz * .04);
  }
}

// the poured one: amber body, light inside
function pouredOne(t, pose, x, y, sc, { emerge = 1, heat = 1, eyes = 0, clip = null } = {}) {
  s.save(); f.save();
  if (clip) { for (const g of [s, f]) { g.beginPath(); g.rect(-2000, -2000, 6000, clip + 2000); g.clip(); } }
  const J = figure(s, pose, { x, y, sc, color: '#c8641e', headC: '#d77526' });
  // translucent inner glow on the light layer
  f.globalCompositeOperation = 'lighter';
  stroke(f, [J.hip, J.neck], `rgba(255,120,40,${.12 * heat})`, .16 * sc);
  const r = rng(171);
  for (let i = 0; i < 40; i++) { // embers inside the torso
    const u = r(), v = r() - .5; const px = lerp(J.hip[0], J.neck[0], u) + v * .12 * sc + Math.sin(t * (1 + r() * 2) + i) * .02 * sc;
    const py = lerp(J.hip[1], J.neck[1], u) + Math.cos(t * (1 + r()) + i) * .02 * sc;
    dot(f, px, py, (.6 + r() * 1.2) * sc / 100, `rgba(255,${160 + (r() * 80 | 0)},90,${.8 * heat * (.5 + .5 * Math.sin(t * 3 + i))})`);
  }
  glow(J.head[0], J.head[1], .35 * sc, `rgba(255,150,70,${.12 * heat})`);
  if (eyes > 0) { const e = .045 * sc; for (const d of [-1, 1]) { dot(f, J.head[0] + d * e, J.head[1] - .01 * sc, .018 * sc * eyes, `rgba(255,240,200,${eyes})`); glow(J.head[0] + d * e, J.head[1], .08 * sc, `rgba(255,200,120,${.6 * eyes})`); } }
  s.restore(); f.restore();
  return J;
}
// a close-up bust of the poured one
function bust(t, x, y, sc, { turn = 0, eyes = 0, heat = 1, tilt = 0 } = {}) {
  s.save(); s.translate(x, y); s.rotate(tilt);
  const body = s.createLinearGradient(-sc, -sc, sc, sc * .6); body.addColorStop(0, '#f09a45'); body.addColorStop(.5, '#c4561b'); body.addColorStop(1, '#6e2a12');
  s.fillStyle = body;
  // shoulders + chest
  s.beginPath(); s.moveTo(-sc * 1.25, sc * 1.1); s.bezierCurveTo(-sc * 1.2, sc * .25, -sc * .7, sc * .12, -sc * .22, sc * .05);
  s.lineTo(sc * .22, sc * .05); s.bezierCurveTo(sc * .7, sc * .12, sc * 1.2, sc * .25, sc * 1.25, sc * 1.1); s.closePath(); s.fill();
  // neck
  s.fillRect(-sc * .17, -sc * .35, sc * .34, sc * .5);
  // head: egg, turning
  s.save(); s.translate(turn * sc * .06, -sc * .62); s.rotate(turn * .08);
  const hg = s.createRadialGradient(-sc * .12 + turn * sc * .1, -sc * .1, sc * .05, 0, 0, sc * .5); hg.addColorStop(0, '#ffc07a'); hg.addColorStop(.6, '#d86a24'); hg.addColorStop(1, '#7a2e10');
  s.fillStyle = hg; s.beginPath(); s.ellipse(0, 0, sc * .34, sc * .44, 0, 0, TAU); s.fill();
  s.restore();
  // drips running off the jaw and shoulders
  for (let i = 0; i < 9; i++) { const dx = (hash(i) - .5) * sc * 2.1, len = sc * (.1 + hash(i + 3) * .3) * (.8 + .2 * Math.sin(t * .8 + i)); const y0 = Math.abs(dx) > sc * .4 ? sc * (.2 + Math.abs(dx) / sc * .25) : sc * .02;
    s.fillStyle = '#b44c16'; s.beginPath(); s.ellipse(dx, y0 + len * .5, sc * .03, len * .5, 0, 0, TAU); s.fill(); dot(s, dx, y0 + len, sc * .04, '#b44c16'); }
  s.restore();
  // inner light + eyes on the light layer
  const hx = x + turn * sc * .06, hy = y - sc * .62;
  glow(x, y + sc * .5, sc * 1.1, `rgba(255,110,40,${.3 * heat})`);
  glow(hx, hy, sc * .6, `rgba(255,150,70,${.22 * heat})`);
  for (let i = 0; i < 60; i++) { const a = hash(i) * TAU + t * (.2 + hash(i + 1) * .5), rr = sc * (.15 + hash(i + 2) * .8); dot(f, x + Math.cos(a) * rr, y + sc * .55 + Math.sin(a) * rr * .35, 1.5 + hash(i + 3) * 2.5, `rgba(255,${150 + hash(i + 4) * 90 | 0},80,${heat * (.4 + .5 * Math.sin(t * 2.3 + i))})`); }
  if (eyes > 0) for (const d of [-1, 1]) { const ex = hx + d * sc * .12 + turn * sc * .08, ey = hy - sc * .02; s.fillStyle = '#3a1406'; s.beginPath(); s.ellipse(ex, ey, sc * .06, sc * .035 * eyes, 0, 0, TAU); s.fill(); dot(f, ex, ey, sc * .022 * eyes, `rgba(255,245,215,${eyes})`); glow(ex, ey, sc * .12, `rgba(255,210,140,${.7 * eyes})`); }
}
