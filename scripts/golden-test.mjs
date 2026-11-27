import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "@playwright/test";
import {readJson} from "./load-json.mjs";
import {buildGoldenPlan,EXPECTED_RENDERS} from "./golden-plan.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
async function main(){
 const jobs=await buildGoldenPlan(p=>readJson(path.join(root,p)));
 const isRoot=typeof process.getuid==="function"&&process.getuid()===0;
 const browser=await chromium.launch({args:isRoot?["--no-sandbox","--disable-dev-shm-usage"]:[]});
 let passed=0,failed=0;
 try{
  const page=await browser.newPage();
  await page.goto("http://127.0.0.1:5173/#golden",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof window.__evoforgeGoldenRender==="function");
  for(const job of jobs){
   const got=await page.evaluate(({recipe,render})=>window.__evoforgeGoldenRender({recipe,render}),job);
   if(got!==job.render.sha256){failed++;console.error("MISMATCH",job.id,"expected",job.render.sha256,"got",got);}
   else passed++;
  }
 }finally{await browser.close();}
 console.log(JSON.stringify({gate:"golden",expected:EXPECTED_RENDERS,executed:passed+failed,passed,failed}));
 if(failed||passed!==EXPECTED_RENDERS)throw Error("Golden replay incomplete or mismatched");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
