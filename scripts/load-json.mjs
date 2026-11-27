import fs from "node:fs/promises";
export async function readJson(path){ return JSON.parse(await fs.readFile(path,"utf-8")); }
export async function writeJson(path,obj){ await fs.writeFile(path, JSON.stringify(obj,null,2)+"\n","utf-8"); }
