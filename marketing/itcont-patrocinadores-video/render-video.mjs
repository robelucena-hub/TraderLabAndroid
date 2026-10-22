// Renderiza index.html quadro a quadro (determinístico) e codifica em MP4 H.264 com ffmpeg.
// Uso:
//   node render-video.mjs                      -> itcont-patrocinadores.mp4 (1080x1920, 30 fps) + capa.png
//   node render-video.mjs --format 16x9        -> itcont-patrocinadores-16x9.mp4 (1920x1080, datashow) + capa-16x9.png
//   node render-video.mjs --stills 1,5,12.3    -> apenas quadros PNG nesses segundos (pasta stills/)
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
const stillsArg = args.includes("--stills") ? args[args.indexOf("--stills") + 1] : null;
const wide = args.includes("--format") && args[args.indexOf("--format") + 1] === "16x9";
const [VW, VH] = wide ? [1920, 1080] : [1080, 1920];
const suffix = wide ? "-16x9" : "";
const url = pathToFileURL(path.join(here, "index.html")).href + "?render" + (wide ? "&format=16x9" : "");
const OUT = path.join(here, `itcont-patrocinadores${suffix}.mp4`);
const COVER_AT = 26.2; // segundo usado como capa (mural completo)

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
const ok = await page.evaluate(() => ["800 80px Sora", "600 30px Sora"].every((f) => document.fonts.check(f)));
if (!ok) throw new Error("Fontes não carregaram.");
const { duration, fps } = await page.evaluate(() => ({ duration: window.__duration, fps: window.__fps }));
const stage = page.locator("#stage");

async function frameAt(t, opts = {}) {
  await page.evaluate((t) => window.__seek(t), t);
  return stage.screenshot({ type: "png", animations: "disabled", ...opts });
}

if (stillsArg) {
  const dir = path.join(here, "stills" + suffix); fs.mkdirSync(dir, { recursive: true });
  for (const s of stillsArg.split(",").map(Number)) {
    await frameAt(s, { path: path.join(dir, `t${s.toFixed(2).padStart(6, "0")}.png`) });
    console.log("still", s);
  }
  await browser.close(); process.exit(0);
}

const total = Math.round(duration * fps);
console.log(`Renderizando ${total} quadros (${duration.toFixed(2)} s @ ${fps} fps)…`);
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
  "-r", String(fps), "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg saiu com " + c)))));

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const buf = await frameAt(i / fps);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 60 === 0) console.log(`  quadro ${i}/${total}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end();
await done;
await frameAt(COVER_AT, { path: path.join(here, `capa${suffix}.png`) });
await browser.close();
console.log("ok →", path.basename(OUT), `e capa${suffix}.png`);
