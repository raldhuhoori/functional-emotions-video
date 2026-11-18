// node tools/check.mjs <project-dir> <out.jpg> t1 t2 t3 ...   contact sheet of those times (3 columns), prints ms/frame + errors
// node tools/check.mjs <project-dir> --full <dir> t1 t2 ...   writes full-res stills instead
// Tiles keep the project's aspect: 640x360 for 16:9, 360x640 for 9:16.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process';
import { launch, projectDir, openProject } from './browser.mjs';
const args = process.argv.slice(2); const dirP = projectDir(args.shift());
const full = args[0] === '--full'; if (full) args.shift();
const out = args.shift(); const times = args.map(Number);
if (!out || !times.length) { console.log('usage: node tools/check.mjs <project-dir> [--full] <out> t1 t2 ...'); process.exit(1); }
const tmp = full ? out : fs.mkdtempSync(path.join(os.tmpdir(), 'chk_')); fs.mkdirSync(tmp, { recursive: true });
const b = await launch();
const { page: p, info, errors: errs } = await openProject(b, dirP);
const files = []; let ms = 0;
for (const t of times) {
  const t0 = Date.now(); const url = await p.evaluate((t) => window.__frameJPEG(t, .9), t); ms += Date.now() - t0;
  const f = path.join(tmp, `t_${t.toFixed(2).padStart(6, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); files.push([t, f]);
}
await b.close();
console.log(`${times.length} frames, ${(ms / times.length).toFixed(0)} ms/frame, ${info.width}x${info.height}`);
if (!full) {
  const k = 640 / Math.max(info.width, info.height), tw = Math.round(info.width * k / 2) * 2, th = Math.round(info.height * k / 2) * 2;
  const n = files.length, cols = Math.min(3, n), rows = Math.ceil(n / cols), pad = rows * cols - n;
  let inputs = files.map(([, f]) => `-i "${f}"`).join(' '); let filt = files.map(([t], i) => `[${i}:v]scale=${tw}:${th},drawtext=text='${t}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6[v${i}];`).join('');
  for (let j = 0; j < pad; j++) { inputs += ` -f lavfi -i color=black:s=${tw}x${th}:d=1`; filt += `[${n + j}:v]null[v${n + j}];`; }
  const ins = [...Array(n + pad).keys()].map(i => `[v${i}]`).join('');
  fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
  execSync(`ffmpeg -y -loglevel error ${inputs} -filter_complex "${filt}${ins}xstack=inputs=${n + pad}:grid=${cols}x${rows}[o]" -map "[o]" -frames:v 1 -q:v 3 "${out}"`);
  console.log('sheet', out);
} else console.log('stills in', out);
if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 20).join('\n'));
