/* Enregistrement automatique du protocole de test (voir tests/PROTOCOLE.md).
 * Lance Chrome (puppeteer-core), joue chaque niveau en pilote automatique image par image (pas fixe 1/30 s, déterministe),
 * capture la zone de jeu en 1132x637 (même taille que la vidéo de référence recadrée) et encode avec ffmpeg.
 *
 * Usage : node tools/record.js v002 [niveaux=1,2,3,4,5,6,7] [--seconds=N]
 * Sorties : recordings/<version>_L<n>_<id>.mp4, recordings/<version>_L<n>_<id>.json (télémétrie), recordings/<version>.mp4 (montage) */
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const ROOT = path.resolve(__dirname, '..');
const REC = path.join(ROOT, 'recordings');
const W = 1132, H = 637, FPS = 30;
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));

const version = process.argv[2] || 'v001';
const levels = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '1,2,3,4,5,6,7').split(',').map(Number);
const secArg = process.argv.find((a) => a.startsWith('--seconds='));
const maxSeconds = secArg ? parseFloat(secArg.split('=')[1]) : 30;

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      fs.readFile(f, (e, d) => { if (e) { rsp.writeHead(404); return rsp.end(); } rsp.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); rsp.end(d); });
    }).listen(0, () => res(srv));
  });
}

(async () => {
  if (!CHROME) throw new Error('Chrome/Edge introuvable (définir CHROME_PATH)');
  const srv = await serve();
  const port = srv.address().port;
  const outputs = [];
  // un navigateur neuf par niveau (évite l'accumulation mémoire) ; une nouvelle tentative en cas d'échec
  const recordLevel = async (lv) => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1132,637', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`http://localhost:${port}/?test=1&level=${lv}&autopilot=1&fps=${FPS}`, { waitUntil: 'load' });
      await page.waitForFunction('window.CC && CC.harness && CC.harness.ready', { timeout: 30000 });
      const info = await page.evaluate(() => ({ id: CC.game.level.id, name: CC.game.level.name }));
      const tmp = path.join(REC, `_frames_${version}_L${lv}`);
      fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
      let i = 0, after = -1;
      const t0 = Date.now();
      while (i < maxSeconds * FPS) {
        const r = await page.evaluate(() => { CC.harness.step(1); return { st: CC.harness.state(), img: CC.harness.capture() }; });
        const st = r.st;
        fs.writeFileSync(path.join(tmp, `f_${String(i).padStart(5, '0')}.png`), Buffer.from(r.img.split(',')[1], 'base64'));
        i++;
        if (st.done && after < 0) after = 20;              // quelques images de l'écran de résultats
        if (after >= 0 && --after <= 0) break;
      }
      const tel = await page.evaluate(() => CC.harness.telemetry());
      tel.errors = errors; tel.fps = FPS; tel.frameCount = i;
      const base = `${version}_L${lv}_${info.id}`;
      fs.writeFileSync(path.join(REC, base + '.json'), JSON.stringify(tel));
      execFileSync(ffmpeg, ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f_%05d.png'), '-vf', 'crop=1132:636:0:0', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(REC, base + '.mp4')]);
      fs.rmSync(tmp, { recursive: true, force: true });
      outputs.push(base + '.mp4');
      const hits = tel.events.filter((e) => e.type === 'targetHit').length, crashes = tel.events.filter((e) => e.type === 'crash').length;
      console.log(`L${lv} ${info.name}: ${i} images (${((Date.now() - t0) / 1000).toFixed(1)} s), cibles touchées ${hits}, crashs ${crashes}, erreurs ${errors.length}`);
      await page.close();
    } finally {
      try { await browser.close(); } catch (e) { /* profil temporaire verrouillé : sans conséquence */ }
    }
  };
  for (const lv of levels) {
    try { await recordLevel(lv); } catch (e) {
      console.log(`L${lv} : échec (${e.message}), nouvelle tentative`);
      await recordLevel(lv);
    }
  }
  srv.close();
  // montage : tous les niveaux enregistrés pour cette version
  for (let n = 1; n <= 7; n++) { const f = fs.readdirSync(REC).find((x) => x.startsWith(`${version}_L${n}_`) && x.endsWith('.mp4')); if (f && !outputs.includes(f)) outputs.push(f); }
  outputs.sort();
  if (outputs.length > 1) {
    const list = path.join(REC, `_concat_${version}.txt`);
    fs.writeFileSync(list, outputs.map((f) => `file '${path.join(REC, f).replace(/\\/g, '/')}'`).join('\n'));
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(REC, version + '.mp4')]);
    fs.rmSync(list);
    console.log('Montage : recordings/' + version + '.mp4');
  }
})().catch((e) => { console.error(e); process.exit(1); });
