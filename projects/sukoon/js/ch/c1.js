// js/ch/c1.js — الطريق القديم · The Old Street (0 – 10)
// One continuous tracking shot, vertical 1080x1920: a solitary walker on an old street at sunset.
// The walk is procedural: a planted-foot gait solved with two-bone IK each frame and fed to the engine's figure() rig.
(() => {
  // ---------- palette (local to this scene) ----------
  const C = {
    sky: [[0, '#2b2033'], [.3, '#5e3440'], [.56, '#b05a3a'], [.78, '#e39a52'], [1, '#f4c678']],
    sun: '#ffe9b0', far: '#8c5341', farTop: '#a8654a',
    trousers: '#211916', coat: 'rgb(64,42,31)', head: '#5a3a2a', hat: '#1e1714', scarf: '#8a3a24', shoe: '#1a1311', rim: '#eaa05a',
    shadow: 'rgba(34,16,10,.55)', winDark: '#221814', winLit: '#e9a858', wood: '#43291a', woodLit: '#7a5234',
    walkA: '#8a6040', walkB: '#b8885a', curbTop: '#d0a068', curbFace: '#4a3222', street: '#4a3426',
    stones: ['#8a6442', '#7a5638', '#9a7048', '#6a4a30', '#83603e'], iron: '#1e1815', glassOff: '#5e4a38', glassOn: '#ffdc98',
  };
  // facade: [sunlit upper wall, warm wall at street level, shade at the foot]
  const FACADES = [['#d89a56', '#b07448', '#5e3f2c'], ['#c8804e', '#a2633e', '#55352a'], ['#e6a35c', '#bb7a44', '#66492f'], ['#bc8654', '#94643e', '#4a3326'], ['#dc9858', '#ad6c40', '#5a4434']];

  const ell = (g, x, y, rx, ry, rot, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, TAU); g.fill(); };
  const arch = (g, x, y, w, h, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
  const alpha = (g, a, fn) => { if (a <= .003) return; g.save(); g.globalAlpha *= a; fn(); g.restore(); };

  // ---------- the walk: planted feet, two-bone IK ----------
  const SC = 228;                          // figure scale: ~430 px tall
  const T = 1.3;                           // one gait cycle (two steps), seconds: an unhurried walk
  const STEP = .5 * SC, V = 2 * STEP / T;  // step length, walking speed (px/s)
  const ST = .62;                          // stance share of the cycle (both feet down around each contact)
  const G = 1588;                          // ankle line on the pavement
  const L1 = .44 * SC, L2 = .45 * SC;      // thigh, shin (the rig's proportions)
  const hipX = (t) => 40 + V * t;

  // where a foot is at time t. off: phase offset (0 right, .5 left); jx: that hip joint's x offset
  function foot(t, off, jx) {
    const c = t / T + off, n = Math.floor(c), p = c - n, tl = (n - off) * T;  // tl: when this foot last landed
    const plant = hipX(tl) + jx + .62 * STEP;                                 // lands ahead of the hip, leaves behind it
    if (p < ST) return { p: [plant, G], swing: 0 };
    const u = (p - ST) / (1 - ST);
    return { p: [lerp(plant, plant + 2 * STEP, smooth(u)), G - .085 * SC * Math.sin(Math.PI * u)], swing: u };
  }
  // hip joint -> foot target: [thigh, shin] angles from straight down (+ = screen-right), knee bending forward
  function ik(h, ft) {
    let dx = ft[0] - h[0], dy = ft[1] - h[1], d = Math.hypot(dx, dy); const mx = (L1 + L2) * .998;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    const a1 = Math.atan2(dx, dy) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const kx = h[0] + Math.sin(a1) * L1, ky = h[1] + Math.cos(a1) * L1;
    return [a1, Math.atan2(h[0] + dx - kx, h[1] + dy - ky)];
  }
  function gait(t) {
    const pR = ((t / T) % 1 + 1) % 1;
    const up = Math.cos(TAU * 2 * (pR - .31));          // hips ride highest at each mid-stance
    const lean = .065 + .012 * up;
    const x = hipX(t), y = G - (.815 + .02 * up) * SC;
    const cl = Math.cos(lean), sl = Math.sin(lean);
    const hpL = [x - .12 * SC * cl, y + .12 * SC * sl * .3], hpR = [x + .12 * SC * cl, y - .12 * SC * sl * .3]; // as figure() places them
    const fR = foot(t, 0, .12 * SC * cl), fL = foot(t, .5, -.12 * SC * cl);
    const sw = .27 * Math.cos(TAU * pR);                 // arms counter-swing the legs
    const arm = (a) => [.03 + a, .03 + a + .15 + .22 * Math.max(0, a / .27)];
    // head: lowered in thought, lifts toward the light around 5–7 s, then settles
    const head = kf(t, [[0, .2], [4.3, .2], [5.9, -.07], [7.3, -.07], [9.2, .12]], ease.inOut) + .025 * up;
    return { pose: { lean, head, aL: arm(sw), aR: arm(-sw), lL: ik(hpL, fL.p), lR: ik(hpR, fR.p) }, x, y, fR, fL };
  }
  // body + long coat + coat tail + scarf + hat + shoes, in one set of colours (for the rim, body, light-occlusion and shadow passes)
  function walker(g, t, w, c, dx = 0) {
    const J = figure(g, w.pose, { x: w.x + dx, y: w.y, sc: SC, color: c.trousers, coat: c.coat, headC: c.head });
    const km = [(J.knL[0] + J.knR[0]) / 2, (J.knL[1] + J.knR[1]) / 2];
    const fl = SC * (.04 + .025 * Math.sin(t * 4.6) + .02 * snoise(t * 1.4, 11));   // the coat tail lifts and settles
    poly(g, [[J.waist[0] - .1 * SC, J.waist[1]], [J.hip[0] - .15 * SC, J.hip[1] + .06 * SC], [km[0] - .19 * SC - fl, km[1] + .11 * SC + fl * .3],
      [km[0] - .02 * SC, km[1] + .08 * SC], [J.hip[0] + .02 * SC, J.hip[1]]], c.coat);
    for (const [ft, st] of [[J.ftL, w.fL], [J.ftR, w.fR]]) ell(g, ft[0] + .045 * SC, ft[1] + .018 * SC, .078 * SC, .032 * SC, -.3 * Math.sin(Math.PI * st.swing), c.shoe);
    // scarf: wrapped at the neck, its end trailing and rippling behind
    dot(g, J.neck[0], J.neck[1] + .005 * SC, .07 * SC, c.scarf);
    const tail = []; for (let i = 0; i <= 10; i++) { const u = i / 10; tail.push([J.neck[0] - .03 * SC - u * .28 * SC, J.neck[1] + .02 * SC + u * .16 * SC + Math.sin(t * 5.2 - u * 4.5) * .035 * SC * u]); }
    stroke(g, tail, c.scarf, .05 * SC);
    // hat: crown and a brim that points the way the walker faces
    g.save(); g.translate(J.head[0], J.head[1]); g.rotate(w.pose.lean + w.pose.head);
    ell(g, 0, -.125 * SC, .08 * SC, .06 * SC, 0, c.hat); ell(g, .03 * SC, -.075 * SC, .145 * SC, .024 * SC, 0, c.hat);
    g.restore();
    return J;
  }
  const solid = (col) => ({ trousers: col, coat: col, head: col, hat: col, scarf: col, shoe: col });

  // ---------- camera: a slow tracking dolly that lets the walker drift from left third to centre ----------
  const camX = (t) => hipX(t) + 150 - 22 * t + snoise(t * .35, 3) * 8;
  const camY = (t) => kf(t, [[0, 960], [10, 1040]], ease.sine) + snoise(t * .3, 5) * 5;
  const zoom = (t) => kf(t, [[0, 1], [10, 1.09]], ease.sine);
  // draw a depth layer: p = parallax (1 = the walker's plane)
  function layer(t, p, fn) { for (const g of [s, f]) g.save(); cam(camX(t) * p, camY(t), zoom(t)); fn(camX(t) * p); for (const g of [s, f]) g.restore(); }

  // ---------- the street (generated once, deterministically) ----------
  const BASE = 1510, GF = 330;               // facade foot, ground-floor height
  const BLD = (() => {
    const r = rng(1931), o = []; let x = -1000, i = 0;
    while (x < 2900) {
      const w = 420 + r() * 300, top = 230 + r() * 480, pal = FACADES[(r() * FACADES.length) | 0];
      const span = BASE - GF - top - 50, upper = Math.max(1, Math.round(span / 330));
      o.push({ x, w, top, upper, uh: span / upper, lit: pal[0], mid: pal[1], shade: pal[2], seed: i * 101 + 17,
        balc: r() < .7 ? (r() * upper) | 0 : -1, shop: r() < .6, awn: r() < .65, hut: r() < .45 });
      x += w + (r() < .34 ? 90 + r() * 90 : 0); i++;
    }
    return o;
  })();
  const FAR = (() => {
    const r = rng(77), o = []; let x = -1000;
    while (x < 1600) { const w = 120 + r() * 170; o.push({ x, w, top: 830 + r() * 170, dome: r() < .3 }); x += w + r() * 40; }
    return o;
  })();
  const LAMPS = [...Array(6)].map((_, i) => ({ x: 330 + i * 640, tOn: 2.4 + i * .5 + hash(i + 3) * .35 }));
  const lampLevel = (t, L, i) => {
    const k = smooth(inv(L.tOn, L.tOn + .25, t));
    if (t > L.tOn && t < L.tOn + .7) return k * (hash(Math.floor(t * 20) * 7 + i * 131) > .4 ? 1 : .25);  // sputters on
    return k * (.94 + .06 * Math.sin(t * 11 + i * 2));
  };

  function farSkyline(t) {
    for (const b of FAR) {
      s.fillStyle = vgrad(s, b.top, 1400, [[0, C.farTop], [.4, C.far], [1, C.far]]); s.fillRect(b.x, b.top, b.w, 1720 - b.top);
      if (b.dome) ell(s, b.x + b.w / 2, b.top, b.w * .32, b.w * .3, 0, C.farTop);
    }
    // a distant minaret against the glow
    const mx = 430; s.fillStyle = C.far; s.fillRect(mx - 17, 600, 34, 800); s.fillRect(mx - 26, 700, 52, 16); s.fillRect(mx - 23, 820, 46, 14);
    poly(s, [[mx - 18, 602], [mx + 18, 602], [mx, 540]], C.far); dot(s, mx, 532, 5, C.far);
    occlude(() => {
      f.fillStyle = 'rgba(0,0,0,.8)'; for (const b of FAR) f.fillRect(b.x, b.top, b.w, 1720 - b.top);
      f.fillRect(mx - 17, 600, 34, 800); poly(f, [[mx - 18, 602], [mx + 18, 602], [mx, 540]], 'rgba(0,0,0,.8)');
    });
  }

  function building(t, b) {
    const { x, w, top, seed } = b, h = (k) => hash(seed * 13 + k);
    if (b.hut) { s.fillStyle = b.shade; s.fillRect(x + w * .58, top - 64, 96, 70); s.fillStyle = 'rgba(255,200,140,.3)'; s.fillRect(x + w * .58 + 86, top - 64, 10, 70); }
    // facade: sun-warmed above, cooling into shade toward the street
    s.fillStyle = vgrad(s, top, BASE, [[0, b.lit], [.8, b.mid], [1, b.shade]]); s.fillRect(x, top, w, BASE - top + 8);
    for (let k = 0; k < 5; k++) ell(s, x + h(k) * w, top + 90 + h(k + 9) * (BASE - top - 260), 40 + h(k + 3) * 80, 26 + h(k + 4) * 50, 0, k % 2 ? 'rgba(255,224,170,.13)' : 'rgba(40,20,10,.14)');
    s.fillStyle = 'rgba(255,216,160,.4)'; s.fillRect(x - 8, top + 28, w + 16, 14);           // cornice catching the sun
    s.fillStyle = 'rgba(30,15,10,.35)'; s.fillRect(x - 8, top + 42, w + 16, 12);
    s.fillStyle = 'rgba(30,15,10,.3)'; s.fillRect(x, top, 18, BASE - top);                     // shaded left edge
    s.fillStyle = 'rgba(255,200,130,.32)'; s.fillRect(x + w - 7, top, 7, BASE - top);           // sunlit right edge
    occlude(() => { f.fillStyle = 'rgba(0,0,0,.92)'; f.fillRect(x, top - (b.hut ? 64 : 0), w, BASE - top + 12 + (b.hut ? 64 : 0)); });

    const n = w > 560 ? 3 : 2;
    for (let fl = 0; fl < b.upper; fl++) {
      const y0 = top + 50 + fl * b.uh, wh = b.uh * .56, ww = Math.min(124, w / (n * 2.1)), wy = y0 + b.uh * .2;
      for (let k = 0; k < n; k++) {
        const cx = x + w * (k + .5) / n, id = seed * 7 + fl * 5 + k;
        arch(s, cx - ww / 2 - 9, wy - 9, ww + 18, wh + 14, 'rgba(255,226,180,.24)');
        arch(s, cx - ww / 2, wy, ww, wh, C.winDark);
        const lit = hash(id) < .38, tOn = hash(id + 5) * 10 - 2.5, k2 = lit ? smooth(inv(tOn, tOn + .5, t)) : 0;
        if (k2 > 0) { alpha(s, k2, () => arch(s, cx - ww / 2, wy, ww, wh, C.winLit)); glow(cx, wy + wh * .55, ww * .95, 'rgba(255,165,80,.22)', k2); }
        stroke(s, [[cx, wy + 6], [cx, wy + wh]], 'rgba(30,18,12,.8)', 5); stroke(s, [[cx - ww / 2, wy + wh * .45], [cx + ww / 2, wy + wh * .45]], 'rgba(30,18,12,.8)', 5);
        if (!lit && hash(id + 2) < .55) { s.fillStyle = hash(id + 3) < .5 ? '#5e4a36' : '#6a5a46'; s.fillRect(cx - ww / 2 - ww * .48 - 4, wy + ww * .3, ww * .48, wh - ww * .3); s.fillRect(cx + ww / 2 + 4, wy + ww * .3, ww * .48, wh - ww * .3); }
        if (hash(id + 7) < .3) for (let q = 0; q < 4; q++) ell(s, cx - ww * .4 + q * ww * .27, wy + wh - 4 + Math.sin(t * 1.3 + q + id) * 2, 15, 11, Math.sin(t * 1.1 + q) * .25, q % 2 ? '#3f3a22' : '#4d4528'); // sill plants
      }
      if (fl === b.balc) { // wooden mashrabiya balcony, its long shadow raked across the wall by the low sun
        const bw = Math.min(w * .52, 320), bh = b.uh * .64, bx = x + (w - bw) / 2, by = y0 + b.uh * .16;
        s.fillStyle = 'rgba(35,18,10,.36)'; s.beginPath(); s.moveTo(bx, by + 10); s.lineTo(bx - 120, by + 34); s.lineTo(bx - 120, by + bh + 40); s.lineTo(bx, by + bh + 16); s.fill();
        s.fillStyle = vgrad(s, by, by + bh, [[0, C.woodLit], [1, C.wood]]); s.fillRect(bx, by, bw, bh);
        for (let xs = bx + 12; xs < bx + bw - 8; xs += 17) { s.fillStyle = 'rgba(22,12,7,.6)'; s.fillRect(xs, by + 16, 6, bh - 34); }
        if (h(40) < .55) glow(bx + bw / 2, by + bh / 2, bw * .45, 'rgba(255,170,90,.14)', smooth(inv(1 + h(41) * 5, 2 + h(41) * 5, t)));
        s.fillStyle = '#5a3a24'; s.fillRect(bx - 12, by - 16, bw + 24, 18); s.fillRect(bx - 6, by + bh - 4, bw + 12, 14);
        poly(s, [[bx + 10, by + bh + 10], [bx + 40, by + bh + 10], [bx + 14, by + bh + 50]], '#4a2f1e'); poly(s, [[bx + bw - 10, by + bh + 10], [bx + bw - 40, by + bh + 10], [bx + bw - 14, by + bh + 50]], '#4a2f1e');
      }
    }
    // street level: an arched door with a lamp, and maybe a lit shop under a striped awning
    const dx = x + w * (b.shop ? .14 : .4);
    arch(s, dx - 12, BASE - 300, 164, 300, 'rgba(255,220,170,.22)'); arch(s, dx, BASE - 290, 140, 290, '#3a2418');
    stroke(s, [[dx + 70, BASE - 220], [dx + 70, BASE]], 'rgba(20,10,6,.6)', 5);
    s.fillStyle = '#a0805c'; s.fillRect(dx - 16, BASE - 10, 172, 14);
    const sOn = smooth(inv(1.5 + h(60) * 6, 1.9 + h(60) * 6, t)) * (.92 + .08 * Math.sin(t * 9 + seed));
    dot(s, dx + 170, BASE - 240, 11, '#6a4a2a'); glow(dx + 170, BASE - 240, 110, 'rgba(255,180,100,.4)', sOn); glow(dx + 170, BASE - 240, 20, 'rgba(255,230,180,.9)', sOn);
    if (b.shop) {
      const sx = x + w * .48, sw = w * .42, sy = BASE - 240;
      s.fillStyle = '#3a2418'; s.fillRect(sx - 10, sy - 10, sw + 20, 250);
      s.fillStyle = '#b8763c'; s.fillRect(sx, sy, sw, 220); glow(sx + sw / 2, sy + 110, sw * .8, 'rgba(255,160,75,.24)');
      stroke(s, [[sx + sw / 2, sy], [sx + sw / 2, sy + 220]], '#3a2418', 7);
      if (b.awn) { // striped awning, its scalloped hem stirring in the evening air
        const ay = sy - 50, ax0 = sx - 26, ax1 = sx + sw + 26, hem = (q) => ay + 84 + 7 * Math.sin(t * 2.4 + q * .9 + seed);
        const nS = Math.max(4, Math.round((ax1 - ax0) / 36));
        for (let q = 0; q < nS; q++) {
          const a0 = lerp(ax0, ax1, q / nS), a1 = lerp(ax0, ax1, (q + 1) / nS);
          poly(s, [[a0 + 10, ay], [a1 + 10, ay], [a1, hem(q + 1)], [a0, hem(q)]], q % 2 ? '#7c3a28' : '#c49a64');
          ell(s, (a0 + a1) / 2, (hem(q) + hem(q + 1)) / 2, (a1 - a0) / 2, 10, 0, q % 2 ? '#7c3a28' : '#c49a64');
        }
      }
    }
  }
  function cables(t) {
    for (let i = 0; i + 1 < BLD.length; i++) {
      const a = BLD[i], b = BLD[i + 1]; if (hash(i + 400) < .35) continue;
      const p0 = [a.x + a.w - 24, a.top + 70], p3 = [b.x + 24, b.top + 90], sag = 70 + hash(i + 401) * 60 + Math.sin(t * .9 + i) * 4;
      stroke(s, bez(p0, [lerp(p0[0], p3[0], .3), Math.max(p0[1], p3[1]) + sag], [lerp(p0[0], p3[0], .7), Math.max(p0[1], p3[1]) + sag], p3, 20), '#2a1d18', 4);
    }
  }

  function lampShape(g, x, iron, glass) {
    const b = 1640, top = 1000;
    g.fillStyle = iron; g.fillRect(x - 30, b - 14, 60, 14); g.fillRect(x - 22, b - 74, 44, 62); g.fillRect(x - 13, b - 210, 26, 12); g.fillRect(x - 11, top + 110, 22, 10);
    taper(g, [x, b - 74], [x, top + 66], 10, 6, iron);
    poly(g, [[x - 42, top + 4], [x + 42, top + 4], [x, top - 42]], iron); dot(g, x, top - 50, 7, iron);
    poly(g, [[x - 31, top + 6], [x + 31, top + 6], [x + 22, top + 62], [x - 22, top + 62]], glass);
    g.fillStyle = iron; g.fillRect(x - 27, top + 60, 54, 10); stroke(g, [[x, top + 8], [x, top + 60]], iron, 4);
  }
  // long low-sun shadows: shear what stands on the ground at y0 down-left onto it (light from the right, a little behind the houses)
  function shadowOf(y0, fn) { s.save(); s.translate(0, y0); s.transform(1, 0, .95, -.5, 0, 0); s.translate(0, -y0); fn(); s.restore(); }

  // ---------- the shot ----------
  function oldStreet(t, lt, dur) {
    const z = zoom(t);
    // sky, clouds, the low sun, birds (screen space)
    s.fillStyle = vgrad(s, 0, 1350, C.sky); s.fillRect(-10, -10, W + 20, H + 20);
    clouds(t, 7, 120, 430, 'rgba(110,55,60,.5)', 6, 5); clouds(t, 9, 220, 520, 'rgba(240,150,90,.32)', 5, 7);
    const sx = 760 - (camX(t) - 150) * .03, sy = kf(t, [[0, 565], [10, 620]], ease.sine);
    dot(s, sx, sy, 64, C.sun);
    glow(sx, sy, 950, 'rgba(255,135,60,.26)'); glow(sx, sy, 330, 'rgba(255,190,110,.5)'); glow(sx, sy, 110, 'rgba(255,242,205,.95)');
    for (let i = 0; i < 3; i++) {
      const bx = -120 + ((t * 55 + i * 420) % 1350), by = 250 + i * 50 + Math.sin(t * .8 + i) * 16, fl = Math.sin(t * 8 + i * 2.1);
      stroke(s, [[bx - 15, by - 9 * fl], [bx, by], [bx + 15, by - 9 * fl]], '#3a2224', 5);
    }
    layer(t, .25, () => farSkyline(t));
    layer(t, .78, () => { for (const b of BLD) building(t, b); cables(t); });
    // warm dust hanging over the street
    s.fillStyle = vgrad(s, 900, 1650, [[0, 'rgba(240,160,90,0)'], [1, 'rgba(240,160,90,.17)']]); s.fillRect(-10, 800, W + 20, 900);
    // god rays through the air from the low sun
    f.save(); f.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const a = .016 + .014 * noise1(t * .6, k + 20), a0 = 2.35 + k * .17, a1 = a0 + .07 + .03 * k, R = 2600;
      f.fillStyle = rgrad(f, sx, sy, 0, R, [[0, `rgba(255,185,110,${a})`], [1, 'rgba(255,185,110,0)']]);
      poly(f, [[sx, sy], [sx + Math.cos(a0) * R, sy + Math.sin(a0) * R], [sx + Math.cos(a1) * R, sy + Math.sin(a1) * R]], f.fillStyle);
    }
    f.restore();

    // the ground: pavement, kerb, cobbles that slide faster the nearer they are
    layer(t, .92, (cx) => {
      s.fillStyle = vgrad(s, BASE, 1616, [[0, C.walkA], [1, C.walkB]]); s.fillRect(cx - 900, BASE, 1800, 110);
      for (let k = Math.floor((cx - 800) / 130); k < (cx + 800) / 130; k++) { const xk = k * 130; stroke(s, [[xk, BASE + 4], [xk + (xk - cx) * .12, 1612]], 'rgba(45,28,16,.45)', 3); }
    });
    layer(t, 1, (cx) => { s.fillStyle = C.curbTop; s.fillRect(cx - 900, 1612, 1800, 18); s.fillStyle = C.curbFace; s.fillRect(cx - 900, 1630, 1800, 22); });
    let y = 1652;
    for (let r = 0; r < 16; r++) {
      const hR = 24 + r * 6, p = 1 + (y - 1650) * .0009, sw = 40 + r * 7;
      layer(t, p, (cx) => {
        s.fillStyle = C.street; s.fillRect(cx - 900, y, 1800, hR + 2);
        for (let k = Math.floor((cx - 760) / sw); k < (cx + 760) / sw; k++) {
          const xk = k * sw + (r % 2) * sw / 2 + (hash(k * 31 + r * 977) - .5) * sw * .15, yk = y + hR / 2;
          ell(s, xk, yk, sw * .44, hR * .4, 0, C.stones[(hash(k * 7 + r * 13) * C.stones.length) | 0]);
          ell(s, xk + sw * .08, yk - hR * .13, sw * .28, hR * .16, 0, 'rgba(215,150,85,.33)');
        }
      });
      y += hR;
    }

    // lamp pools and every long shadow, then the walker
    const w = gait(t);
    layer(t, 1.06, () => LAMPS.forEach((L, i) => {
      const on = lampLevel(t, L, i); alpha(s, on, () => ell(s, L.x, 1690, 230, 46, 0, 'rgba(255,175,95,.28)'));
      shadowOf(1640, () => lampShape(s, L.x, C.shadow, C.shadow));
    }));
    layer(t, 1, () => {
      shadowOf(G + .05 * SC, () => walker(s, t, w, solid(C.shadow)));
      walker(s, t, w, solid(C.rim), 3.5);                 // warm rim where the low sun grazes the right edge
      walker(s, t, w, C);
      occlude(() => walker(f, t, w, solid('#000')));      // the body blocks the light behind it
    });
    layer(t, 1.06, () => LAMPS.forEach((L, i) => {
      const on = lampLevel(t, L, i);
      lampShape(s, L.x, C.iron, C.glassOff); alpha(s, on, () => poly(s, [[L.x - 31, 1006], [L.x + 31, 1006], [L.x + 22, 1062], [L.x - 22, 1062]], C.glassOn));
      occlude(() => lampShape(f, L.x, '#000', '#000'));
      glow(L.x, 1033, 300, 'rgba(255,170,90,.3)', on); glow(L.x, 1033, 80, 'rgba(255,228,175,.9)', on); glow(L.x, 1690, 240, 'rgba(255,160,80,.12)', on);
    }));

    // drifting motes in the sunlight; a couple of leaves tumbling along the cobbles
    for (let i = 0; i < 80; i++) {
      const mx = ((hash(i) * 1500 - (camX(t) - 150) * .9 * (.6 + hash(i + 300) * .5) + t * 12) % 1500 + 1500) % 1500 - 200;
      const my = 650 + hash(i + 100) * 1000 + Math.sin(t * .7 + i) * 22 - t * 6, tw = .5 + .5 * Math.sin(t * (1.5 + hash(i + 200) * 2) + i);
      dot(f, mx, my, 1.2 + hash(i + 50) * 2.2, `rgba(255,214,160,${.55 * tw})`);
    }
    for (let i = 0; i < 2; i++) {
      const lx = W + 120 - ((t * (120 + i * 40) + i * 640) % (W + 360)), ly = 1730 + i * 110 - Math.abs(Math.sin(t * 3 + i * 2)) * 28;
      ell(s, lx, ly, 17, 7, t * 4 + i, i ? '#8a4a24' : '#a0602c');
    }
    whip(5, 0);                                           // a whisper of smear along the pan
    blackout(1 - smooth(t / .7)); blackout(smooth((t - 9.35) / .6));
  }

  chapter('old-street', 0, 10, [[0, oldStreet]], { paint: { boil: 7, bloom: 1.45, flowK: .85, strokeK: .92, grain: .085, vig: .5 } });
})();
