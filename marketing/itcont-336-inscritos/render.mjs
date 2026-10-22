// Renderiza index.html em PNG 1080 × 1350 com Playwright (Chromium).
// Uso:  node render.mjs            -> itcont-336-inscritos.png
//       node render.mjs --guides   -> também gera a versão com guias de margem (64 px)
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  // fallback: instalação global do Playwright
  const globalRoot = require("node:child_process").execSync("npm root -g").toString().trim();
  playwright = require(path.join(globalRoot, "playwright"));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const page_url = pathToFileURL(path.join(here, "index.html")).href;
const withGuides = process.argv.includes("--guides");

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

async function shoot(url, out) {
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  const fontsOk = await page.evaluate(() =>
    ["800 100px Sora", "600 40px Sora", "700 27px Manrope"].every((f) => document.fonts.check(f))
  );
  if (!fontsOk) throw new Error("Fontes Sora/Manrope não carregaram.");
  // validação dos dados: soma dos cards = número principal
  const { total, parts } = await page.evaluate(() => ({
    total: Number(document.querySelector(".hero .num.face").textContent),
    parts: [...document.querySelectorAll(".card .value")].map((e) => Number(e.textContent)),
  }));
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== total) throw new Error(`Soma dos cards (${parts.join(" + ")} = ${sum}) difere do total ${total}.`);
  await page.locator("#stage").screenshot({ path: path.join(here, out), animations: "disabled" });
  console.log("ok →", out);
}

await shoot(page_url, "itcont-336-inscritos.png");
if (withGuides) await shoot(page_url + "?guides", "preview-guias.png");

await browser.close();
