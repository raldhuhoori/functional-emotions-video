// Sukoon engine · scenery: sky, clouds, stars, moon. Default colours read the project palette P at call time.

function sky(top = P.night0, mid = P.night1, low = P.dusk, horizon = 760) {
  s.fillStyle = vgrad(s, 0, horizon, [[0, top], [.55, mid], [1, low]]); s.fillRect(-100, -100, W + 200, horizon + 100);
  s.fillStyle = low; s.fillRect(-100, horizon, W + 200, H);
}
function clouds(t, seed, y0, y1, col, n = 7, speed = 6) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = ((r() * (W + 800) + t * speed * (.5 + r())) % (W + 800)) - 400, y = lerp(y0, y1, r()), w = 260 + r() * 520, h = 40 + r() * 70;
    s.fillStyle = col; s.beginPath(); s.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); s.fill();
  }
}
function stars(t, seed, n = 140, yMax = 600, a = 1) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * yMax, tw = .5 + .5 * Math.sin(t * (1 + r() * 3) + i); dot(f, x, y, .8 + r() * 1.6, `rgba(255,240,220,${a * (.25 + .6 * tw) * r()})`); }
}
function moon(x, y, r, a = 1) {
  dot(s, x, y, r, P.cream); dot(s, x + r * .38, y - r * .12, r * .92, '#18234e');
  glow(x, y, r * 5, `rgba(255,230,190,${.22 * a})`);
}

