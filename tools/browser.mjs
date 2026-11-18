// Shared by render.mjs and check.mjs: launch Chrome with the right GL backend and open a project's page offline.
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
// CommonJS resolution so a local `npm install` or a global install (NODE_PATH) both work
const { chromium } = createRequire(import.meta.url)('playwright');

// GPU flags per platform. macOS: Metal (fast on Apple GPUs). Elsewhere Chrome uses the real GPU when it has one;
// --enable-unsafe-swiftshader lets WebGL2 fall back to software rendering on machines without one (much slower).
const GL_ARGS = ['--ignore-gpu-blocklist', '--enable-gpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : ['--enable-unsafe-swiftshader'])];

export async function launch() {
  // Prefer installed Google Chrome (real GPU); fall back to Playwright's bundled Chromium.
  try { return await chromium.launch({ channel: 'chrome', headless: true, args: GL_ARGS }); }
  catch { return await chromium.launch({ headless: true, args: GL_ARGS }); }
}

export function projectDir(arg) {
  const dir = path.resolve(arg || '');
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`not a project folder (no index.html): ${dir}`);
  return dir;
}

// open the project's player in offline mode; returns { page, info, errors } where info = window.__project
export async function openProject(browser, dir) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(dir, 'index.html') + '?offline=1'); await page.evaluate(() => window.__ready);
  const info = await page.evaluate(() => window.__project);
  if (!info) throw new Error('page did not load the engine player:\n' + errors.join('\n'));
  return { page, info, errors };
}
