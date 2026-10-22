// Renderiza index.html quadro a quadro (determinístico) e codifica em MP4 H.264.
// Uso:
//   node render-video.mjs                    -> itcont-retrospectiva.mp4      (1080x1920, Reels/Stories) + capa.png
//   node render-video.mjs --format 16x9      -> itcont-retrospectiva-16x9.mp4 (1920x1080, datashow)     + capa-16x9.png
//   node render-video.mjs --stills 5,12.5    -> só quadros PNG (pasta stills/ ou stills-16x9/)
//   --workers 3                              -> processos de renderização em paralelo
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const wide = opt("--format") === "16x9";
const [VW, VH] = wide ? [1920, 1080] : [1080, 1920];
const suffix = wide ? "-16x9" : "";
const url = pathToFileURL(path.join(here, "index.html")).href + "?render" + (wide ? "&format=16x9" : "");
const OUT = path.join(here, `itcont-retrospectiva${suffix}.mp4`);
const WORKERS = Number(opt("--workers") || 3);

async function openPage() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(async () => { await document.fonts.ready; await window.__preload(); });
  if (!(await page.evaluate(() => ["800 80px Sora", "600 30px Manrope"].every((f) => document.fonts.check(f))))) throw new Error("Fontes não carregaram.");
  const meta = await page.evaluate(() => ({ duration: window.__duration, fps: window.__fps }));
  const stage = page.locator("#stage");
  const frameAt = async (t, o = {}) => { await page.evaluate((t) => window.__seek(t), t); return stage.screenshot({ type: "png", animations: "disabled", ...o }); };
  return { browser, frameAt, meta };
}

const stills = opt("--stills");
if (stills) {
  const { browser, frameAt } = await openPage();
  const dir = path.join(here, "stills" + suffix); fs.mkdirSync(dir, { recursive: true });
  for (const s of stills.split(",").map(Number)) { await frameAt(s, { path: path.join(dir, `t${s.toFixed(2).padStart(6, "0")}.png`) }); console.log("still", s); }
  await browser.close(); process.exit(0);
}

const probe = await openPage();
const { duration, fps } = probe.meta;
const total = Math.round(duration * fps);
console.log(`Renderizando ${total} quadros (${duration.toFixed(2)} s @ ${fps} fps) com ${WORKERS} processos…`);
const tmp = fs.mkdtempSync(path.join(here, "media", ".seg-"));
const per = Math.ceil(total / WORKERS);
const t0 = Date.now();

async function worker(k, ctx) {
  const a = k * per, b = Math.min(total, a + per);
  const seg = path.join(tmp, `seg${k}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2", "-r", String(fps), seg],
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c)))));
  for (let i = a; i < b; i++) {
    const buf = await ctx.frameAt(i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if ((i - a) % 90 === 0) console.log(`  [${k}] quadro ${i - a}/${b - a}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end(); await done; await ctx.browser.close();
  return seg;
}

const ctxs = [probe, ...(await Promise.all(Array.from({ length: WORKERS - 1 }, openPage)))];
const segs = await Promise.all(ctxs.map((c, k) => worker(k, c)));
const list = path.join(tmp, "list.txt");
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join("\n"));
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${list}" -c copy -movflags +faststart "${OUT}"`);
fs.rmSync(tmp, { recursive: true, force: true });

const cover = await openPage();
await cover.frameAt(duration - 1.0, { path: path.join(here, `capa${suffix}.png`) });
await cover.browser.close();
console.log(`ok → ${path.basename(OUT)} e capa${suffix}.png  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
