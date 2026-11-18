// Sukoon engine · rig: the mannequin figure, poses, and beat-synced grooves.
// Default colours read the project palette P at call time (P.ink).
// ---- the figure rig ----
// pose angles are radians from straight down (limbs) / straight up (torso, head); + is toward screen-right
const POSE = {
  stand: { lean: 0, head: 0, aL: [.12, .05], aR: [-.12, -.05], lL: [.06, 0], lR: [-.06, 0] },
  rise: { lean: 0, head: -.1, aL: [.5, .9], aR: [-.5, -.9], lL: [0, 0], lR: [0, 0] },
  reach: { lean: .1, head: .15, aL: [.3, .2], aR: [-2.2, -2.5], lL: [.08, 0], lR: [-.1, .1] },
  write: { lean: .45, head: .5, aL: [-.8, -1.6], aR: [-.6, -1.4], lL: [-1.3, 0], lR: [-1.4, .05] },
  sit: { lean: .05, head: .1, aL: [-.5, -1.2], aR: [-.4, -1.1], lL: [-1.5, 0], lR: [-1.55, .05] },
  hold: { lean: 0, head: .05, aL: [.1, .1], aR: [-.9, -1.6], lL: [.06, 0], lR: [-.06, 0] },
  lean: { lean: -.15, head: -.2, aL: [.2, .3], aR: [-.35, -.2], lL: [.1, .02], lR: [-.02, 0] },
  bow: { lean: .9, head: 1.1, aL: [.2, .1], aR: [-.2, -.1], lL: [.1, 0], lR: [-.1, 0] },
  armsUp: { lean: 0, head: -.3, aL: [2.6, 2.9], aR: [-2.6, -2.9], lL: [.12, 0], lR: [-.12, 0] },
  dance1: { lean: .15, head: .3, aL: [1.2, 2.2], aR: [-.5, -1.5], lL: [.35, -.3], lR: [-.15, .1] },
  dance2: { lean: -.15, head: -.3, aL: [.5, 1.5], aR: [-1.2, -2.2], lL: [.15, -.1], lR: [-.35, .3] },
};
function mixPose(a, b, k) {
  const o = {}; for (const key of Object.keys(a)) o[key] = Array.isArray(a[key]) ? a[key].map((v, i) => lerp(v, b[key][i], k)) : lerp(a[key], b[key], k); return o;
}
// tapered limb segment
function taper(g, a, b, w1, w2, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.fillStyle = c; g.beginPath();
  g.moveTo(a[0] + nx * w1, a[1] + ny * w1); g.lineTo(b[0] + nx * w2, b[1] + ny * w2); g.lineTo(b[0] - nx * w2, b[1] - ny * w2); g.lineTo(a[0] - nx * w1, a[1] - ny * w1); g.fill();
  dot(g, a[0], a[1], w1, c); dot(g, b[0], b[1], w2, c);
}
// draws a mannequin-like figure; returns joints. o: x,y = hip point, sc = px per unit (figure ~1.9 units tall)
function figure(g, pose, o) {
  const { x, y, sc = 100, color = P.ink, coat = null, headC = null, width = 1, limbC = null } = o;
  const seg = (p, ang, len, up = false) => [p[0] + Math.sin(ang) * len * sc, p[1] + (up ? -1 : 1) * Math.cos(ang) * len * sc];
  const hip = [x, y];
  const neck = seg(hip, pose.lean, .6, true);
  const head = seg(neck, pose.lean + pose.head, .19, true);
  const cl = Math.cos(pose.lean), sl = Math.sin(pose.lean);
  const shL = [neck[0] - .17 * sc * cl + .03 * sc * sl, neck[1] + .17 * sc * sl * 0 + .04 * sc], shR = [neck[0] + .17 * sc * cl + .03 * sc * sl, neck[1] + .04 * sc];
  const hpL = [hip[0] - .12 * sc * cl, hip[1] + .12 * sc * sl * .3], hpR = [hip[0] + .12 * sc * cl, hip[1] - .12 * sc * sl * .3];
  const elL = seg(shL, pose.aL[0], .3), hdL = seg(elL, pose.aL[1], .29);
  const elR = seg(shR, pose.aR[0], .3), hdR = seg(elR, pose.aR[1], .29);
  const knL = seg(hpL, pose.lL[0], .44), ftL = seg(knL, pose.lL[1], .45);
  const knR = seg(hpR, pose.lR[0], .44), ftR = seg(knR, pose.lR[1], .45);
  const W_ = width * sc, lc = limbC || color;
  // legs
  taper(g, hpL, knL, .085 * W_, .06 * W_, lc); taper(g, knL, ftL, .06 * W_, .04 * W_, lc);
  taper(g, hpR, knR, .085 * W_, .06 * W_, lc); taper(g, knR, ftR, .06 * W_, .04 * W_, lc);
  // torso: shoulders -> waist -> hips
  const waist = [lerp(hip[0], neck[0], .42), lerp(hip[1], neck[1], .42)];
  g.fillStyle = coat || color; g.beginPath();
  g.moveTo(shL[0], shL[1] - .02 * sc); g.quadraticCurveTo(neck[0], neck[1] - .03 * sc, shR[0], shR[1] - .02 * sc);
  g.quadraticCurveTo(waist[0] + .15 * W_ * cl, waist[1], hpR[0] + .03 * sc, hpR[1] + .04 * sc);
  if (coat) { const kn = [(knL[0] + knR[0]) / 2, (knL[1] + knR[1]) / 2]; g.lineTo(kn[0] + .22 * W_, kn[1] + .05 * sc); g.lineTo(kn[0] - .22 * W_, kn[1] + .05 * sc); }
  g.lineTo(hpL[0] - .03 * sc, hpL[1] + .04 * sc); g.quadraticCurveTo(waist[0] - .15 * W_ * cl, waist[1], shL[0], shL[1] - .02 * sc); g.fill();
  if (coat && coat[0] === '#') { // lab coat detail: shaded side, lapels, button line, pocket
    const kn = [(knL[0] + knR[0]) / 2, (knL[1] + knR[1]) / 2], hem = [kn[0], kn[1] + .05 * sc];
    g.save(); g.clip();
    g.fillStyle = 'rgba(10,12,30,.28)'; g.beginPath(); g.moveTo(neck[0], neck[1] - .1 * sc); g.lineTo(hem[0] - .02 * sc, hem[1]); g.lineTo(hem[0] - .5 * sc, hem[1]); g.lineTo(shL[0] - .2 * sc, shL[1] - .1 * sc); g.fill();
    g.fillStyle = 'rgba(10,12,30,.45)'; g.beginPath(); g.moveTo(neck[0] - .07 * sc * cl, neck[1] - .01 * sc); g.lineTo(waist[0], waist[1] + .02 * sc); g.lineTo(neck[0] + .07 * sc * cl, neck[1] - .01 * sc); g.lineTo(neck[0], neck[1] + .06 * sc); g.fill();
    g.strokeStyle = 'rgba(10,12,30,.35)'; g.lineWidth = Math.max(1, .012 * sc); g.beginPath(); g.moveTo(waist[0], waist[1] + .02 * sc); g.lineTo(hem[0], hem[1]); g.stroke();
    g.fillStyle = 'rgba(10,12,30,.22)'; g.fillRect(waist[0] + .05 * sc * cl, waist[1] + .1 * sc, .09 * sc, .07 * sc);
    g.restore();
  }
  // arms
  const ac = coat || lc;
  taper(g, shL, elL, .065 * W_, .05 * W_, ac); taper(g, elL, hdL, .05 * W_, .035 * W_, coat ? lc : ac);
  taper(g, shR, elR, .065 * W_, .05 * W_, ac); taper(g, elR, hdR, .05 * W_, .035 * W_, coat ? lc : ac);
  // neck + head (an egg, tilted with the head angle)
  taper(g, neck, seg(neck, pose.lean + pose.head, .08, true), .045 * sc, .04 * sc, headC || color);
  g.save(); g.translate(head[0], head[1]); g.rotate(pose.lean + pose.head); g.fillStyle = headC || color;
  g.beginPath(); g.ellipse(0, -.01 * sc, .085 * sc, .11 * sc, 0, 0, TAU); g.fill(); g.restore();
  return { hip, neck, head, hdL, hdR, elL, elR, knL, knR, ftL, ftR, shL, shR, waist };
}

// ---- the figure's grooves: beat-synced pose offsets with the song's lazy swing ----
// returns { pose, dx, dy } to apply on top of a base pose; amt scales it
function groove(base, style, t, amt = 1) {
  const ph = beatPhase(t), sw = sway(t), b = bob(t), bp = BEAT > 0 ? (t - B0) / BEAT : 0;
  const p = JSON.parse(JSON.stringify(base)); let dx = 0, dy = 0;
  const add = (k, i, v) => { if (i < 0) p[k] += v * amt; else p[k][i] += v * amt; };
  switch (style) {
    case 'idle': add('lean', -1, sw * .03); add('head', -1, sw * .04); dy = -b * 2 * amt; break;
    case 'nod': add('head', -1, .12 * b); add('lean', -1, sw * .04); dy = b * 4 * amt; break;
    case 'sway': dx = sw * 14 * amt; add('lean', -1, -sw * .09); add('head', -1, sw * .12); add('aL', 0, sw * .25); add('aR', 0, sw * .25); dy = b * 5 * amt; break;
    case 'bounce': dy = b * 14 * amt; add('lL', 0, b * .25); add('lL', 1, -b * .45); add('lR', 0, -b * .25); add('lR', 1, b * .45); add('aL', 1, b * .4); add('aR', 1, -b * .4); add('head', -1, b * .15); break;
    case 'funk': dy = b * 12 * amt; add('lean', -1, sw * .12); add('aL', 0, .6 + sw * .5); add('aL', 1, 1.6 + b * .6); add('aR', 0, -.6 + sw * .5); add('aR', 1, -1.6 - b * .6); add('lL', 0, .25 + b * .2); add('lR', 0, -.25 - b * .2); add('head', -1, -sw * .2); break;
    case 'walk': { const w = Math.sin(bp * Math.PI); add('lL', 0, .45 * w); add('lR', 0, -.45 * w); add('lL', 1, .35 * Math.max(0, -w)); add('lR', 1, .35 * Math.max(0, w)); add('aL', 0, -.3 * w); add('aR', 0, .3 * w); dy = -Math.abs(w) * 6 * amt; break; }
    case 'row': { const r = Math.sin(bp * Math.PI * .5); add('lean', -1, .25 * r); add('aL', 0, -1.2 - .5 * r); add('aR', 0, 1.2 + .5 * r); add('aL', 1, -1.6); add('aR', 1, 1.6); break; }
  }
  return { pose: p, dx, dy };
}
