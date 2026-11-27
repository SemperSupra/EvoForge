import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { readJson, writeJson } from "./load-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function arg(name){
  const i = process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}

async function main(){
  const engine = arg("--engine") || "mosaic";
  const version = arg("--version") || "1.0.0";

  const manifestPath = path.join(repoRoot, "tests", "golden", engine, version, "manifest.json");
  const baseDir = path.dirname(manifestPath);

  const manifest = await readJson(manifestPath);

  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const browser = await chromium.launch({
    args: isRoot ? ["--no-sandbox", "--disable-dev-shm-usage"] : []
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/#golden", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__evoforgeGoldenRender === "function");

  for (const fix of manifest.fixtures){
    const recipe = await readJson(path.join(baseDir, fix.recipePath));
    for (const r of fix.renders){
      const got = await page.evaluate(async (payload) => {
        // @ts-ignore
        return await window.__evoforgeGoldenRender(payload);
      }, { recipe, render: r });
      r.sha256 = got;
    }
  }

  await browser.close();
  await writeJson(manifestPath, manifest);
  console.log(`Updated golden manifest: ${manifestPath}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
