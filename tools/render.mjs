// node tools/render.mjs <project-dir> <t0> <t1> <out.mp4> [workers] [fps]
// Renders a project's frames in parallel pages, then muxes them with the project's audio (if it has any) via ffmpeg.
// Size comes from the project's PROJECT.width/height.
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process';
import { launch, projectDir, openProject } from './browser.mjs';
const dirP = projectDir(process.argv[2]);
const [t0, t1] = [Number(process.argv[3]), Number(process.argv[4])]; const out = process.argv[5];
if (!(t1 > t0) || !out) { console.log('usage: node tools/render.mjs <project-dir> <t0> <t1> <out.mp4> [workers] [fps]'); process.exit(1); }
const WK = Number(process.argv[6] || 6), FPS = Number(process.argv[7] || 30);
const dir = `out/frames_${path.basename(dirP)}_${t0}_${t1}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const n = Math.round((t1 - t0) * FPS); let done = 0; const start = Date.now(); let info, errors = [];
const b = await launch();
await Promise.all([...Array(WK)].map(async (_, w) => {
  const o = await openProject(b, dirP); info = o.info;
  for (let i = w; i < n; i += WK) {
    const url = await o.page.evaluate((t) => window.__frameJPEG(t, .92), t0 + i / FPS);
    fs.writeFileSync(`${dir}/f_${String(i).padStart(6, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    if (++done % 300 === 0) console.log(`${done}/${n} ${((Date.now() - start) / 1000).toFixed(0)}s`);
  }
  errors = errors.concat(o.errors);
}));
await b.close();
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const audio = info.audio ? path.join(dirP, info.audio) : null;
const aIn = audio ? `-ss ${t0} -t ${t1 - t0} -i "${audio}"` : '';
const aOut = audio ? '-c:a aac -b:a 256k -shortest' : '-an';
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${dir}/f_%06d.jpg ${aIn} -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p ${aOut} -movflags +faststart "${out}"`);
console.log(`wrote ${out} (${info.width}x${info.height}, ${audio ? 'with audio' : 'silent'})`);
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
