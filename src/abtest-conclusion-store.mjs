import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../data/abtest-conclusions.json");

async function load() {
  try { return JSON.parse(await readFile(STORE_PATH, "utf8")); }
  catch { return {}; }
}

async function save(data) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function getAllConclusions() {
  return await load();
}

export async function setConclusion(primaryId, conclusion) {
  const all = await load();
  if (!conclusion) {
    delete all[String(primaryId)];
  } else {
    all[String(primaryId)] = conclusion;
  }
  await save(all);
}
