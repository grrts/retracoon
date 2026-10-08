// Opens every screen at several phone sizes and checks that no two pieces of text
// overlap and that no text runs off screen. Also saves a screenshot of each screen.
//   npm run build && node tools/ui-check.mjs [outDir]
// Needs Playwright with a Chromium build (PLAYWRIGHT_BROWSERS_PATH or a local install).
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const { chromium } = pw.default ?? pw;
const out = process.argv[2] ?? 'ui-check';
mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const SIZES = [
  [640, 360], // 16:9 small phone
  [844, 390], // iPhone 14 landscape
  [915, 412], // Pixel 7 landscape
  [1024, 768], // iPad-ish 4:3
];

// In-page: collect visible bitmap texts of active scenes, in game pixels.
const collect = () => {
  const g = window.__game;
  const W = g.scale.gameSize.width;
  const H = g.scale.gameSize.height;
  const found = [];
  const visible = (o) => {
    for (let x = o; x; x = x.parentContainer) if (!x.visible || x.alpha === 0) return false;
    return true;
  };
  for (const sc of g.scene.getScenes(true)) {
    const walk = (list) => {
      for (const o of list) {
        if (o.list) walk(o.list);
        if (o.type !== 'BitmapText' || !o.text.trim() || !visible(o) || o.scale === 0) continue;
        if (o.getData && o.getData('float')) continue;
        const b = o.getBounds();
        // Ignore depth-sorted floating combat text and tweening titles.
        found.push({ scene: sc.scene.key, text: o.text.replace(/\n/g, ' / ').slice(0, 40), x: b.x, y: b.y, w: b.width, h: b.height, depth: o.depth + (o.parentContainer?.depth ?? 0) });
      }
    };
    walk(sc.children.list);
  }
  return { W, H, found };
};

const problems = [];
function check(tag, { W, H, found }) {
  for (const t of found) {
    if (t.x < -0.5 || t.y < -0.5 || t.x + t.w > W + 0.5 || t.y + t.h > H + 0.5) problems.push(`${tag}: off screen "${t.text}" (${t.x.toFixed(0)},${t.y.toFixed(0)} ${t.w.toFixed(0)}x${t.h.toFixed(0)} in ${W}x${H})`);
  }
  // Text in a scene on top hides text below it, so only compare within the topmost scene
  // that covers a spot. Simplest useful rule: compare texts of the same scene.
  for (let i = 0; i < found.length; i++)
    for (let j = i + 1; j < found.length; j++) {
      const a = found[i];
      const b = found[j];
      if (a.scene !== b.scene) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      // The outline adds a pixel on each side; touching outlines are fine.
      if (ix > 2 && iy > 2) problems.push(`${tag}: "${a.text}" overlaps "${b.text}"`);
    }
}

const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => problems.push(`${w}x${h}: page error ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__game?.scene?.isActive('Ad') || window.__game?.scene?.isActive('Title'), null, { timeout: 15000 });
  const shot = async (name) => {
    await sleep(450);
    check(`${w}x${h} ${name}`, await page.evaluate(collect));
    await page.screenshot({ path: `${out}/${w}x${h}-${name}.png` });
  };
  const start = (key, data = {}) =>
    page.evaluate(([k, d]) => {
      const g = window.__game;
      for (const s of g.scene.getScenes(true)) if (s.scene.key !== k) s.scene.stop();
      g.scene.start(k, d);
    }, [key, data]);

  if (await page.evaluate(() => window.__game.scene.isActive('Ad'))) await shot('ad');
  await start('Title');
  await shot('title');
  for (const tab of ['sale', 'holiday', 'fur', 'outfit', 'owned', 'gems']) {
    await start('Store', { tab });
    await shot(`store-${tab}`);
  }
  // A run, then every overlay on top of it.
  await start('Run');
  await sleep(600);
  await shot('run-walk');
  await page.evaluate(() => {
    const r = window.__game.scene.getScene('Run');
    r.tweens.killAll();
    r.time.removeAllEvents();
    r.approach('fight');
  });
  await sleep(1600);
  await shot('run-prompt');
  await page.evaluate(() => window.__game.scene.getScene('Run').beginFight());
  await sleep(900);
  await shot('run-combat');
  const overlay = (key, data = {}) =>
    page.evaluate(([k, d]) => {
      const g = window.__game;
      for (const s of g.scene.getScenes(true)) if (s.scene.key !== 'Run') s.scene.stop();
      const run = g.scene.getScene('Run').run;
      run.statPoints = Math.max(run.statPoints, 3);
      g.scene.launch(k, { ...d, run, done: () => {} });
    }, [key, data]);
  for (const [key, data] of [['Reward', { title: 'BOSS LOOT', min: 2 }], ['Fork', {}], ['Shop', {}], ['Camp', {}], ['LevelUp', {}], ['Pause', {}]]) {
    await overlay(key, data);
    await shot(key.toLowerCase());
  }
  // Every event, by forcing each one in turn.
  const nEvents = await page.evaluate(() => window.__debug.events.length);
  for (let i = 0; i < nEvents; i++) {
    await page.evaluate((idx) => {
      const ev = window.__debug.events;
      const saved = ev.slice();
      ev.splice(0, ev.length, { ...saved[idx], minDanger: 0, themes: undefined });
      window.__restoreEvents = () => ev.splice(0, ev.length, ...saved);
    }, i);
    await overlay('Event', {});
    await sleep(350);
    check(`${w}x${h} event ${i}`, await page.evaluate(collect));
    if (i < 3) await page.screenshot({ path: `${out}/${w}x${h}-event-${i}.png` });
    await page.evaluate(() => window.__restoreEvents());
  }
  for (const reason of ['death', 'retreat']) {
    await page.evaluate((why) => {
      const g = window.__game;
      for (const s of g.scene.getScenes(true)) if (s.scene.key !== 'Run') s.scene.stop();
      g.scene.launch('GameOver', { run: g.scene.getScene('Run').run, reason: why, newBest: true, caps: 123 });
    }, reason);
    await shot(`gameover-${reason}`);
  }
  await page.close();
}

await browser.close();
server.close();
const uniq = [...new Set(problems)];
if (uniq.length) {
  console.log(uniq.join('\n'));
  console.log(`\n${uniq.length} problem(s). Screenshots in ${out}/`);
  process.exit(1);
}
console.log(`No overlapping or off-screen text. Screenshots in ${out}/`);
