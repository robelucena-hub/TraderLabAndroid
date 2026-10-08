// Renderiza as camadas gráficas (trás + frente) quadro a quadro com Chromium/Playwright.
// uso: node render_graphics.mjs <timeline.json> <saida_dir> [workers] [quadros: "a-b" ou "f1,f2,..."]
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require((process.env.NODE_PATH || "/opt/node22/lib/node_modules") + "/playwright"); }
const { chromium } = pw;
import fs from "fs"; import path from "path"; import url from "url";
const here = path.dirname(url.fileURLToPath(import.meta.url));
const [tlPath, outDir, workersArg, framesArg] = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const gdir = path.join(here, "graphics");
fs.writeFileSync(path.join(gdir, "timeline.js"), "window.T = " + JSON.stringify(T) + ";");
fs.mkdirSync(outDir, { recursive: true });
let frames = [...Array(T.total_frames).keys()];
if (framesArg) frames = framesArg.includes("-") ? (([a, b]) => frames.slice(+a, +b + 1))(framesArg.split("-")) : framesArg.split(",").map(Number);
const W = Math.max(1, +(workersArg || 3));
const browser = await chromium.launch({ args: ["--disable-gpu", "--font-render-hinting=none", "--allow-file-access-from-files"] });
const t0 = Date.now(); let done = 0;
await Promise.all([...Array(W).keys()].map(async (k) => {
  const page = await browser.newPage({ viewport: { width: 1080, height: 3840 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  await page.goto("file://" + path.join(gdir, "index.html"));
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => document.fonts.ready);
  for (let i = k; i < frames.length; i += W) {
    const f = frames[i];
    await page.evaluate((f) => window.renderAt(f), f);
    await page.screenshot({ path: path.join(outDir, `g_${String(f).padStart(5, "0")}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 1080, height: 3840 } });
    if (++done % 100 === 0) console.log(`${done}/${frames.length} ${((Date.now() - t0) / done).toFixed(0)} ms/quadro`);
  }
}));
await browser.close();
console.log(`ok ${frames.length} quadros em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
