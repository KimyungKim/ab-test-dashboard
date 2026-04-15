import path from "node:path";
import { fileURLToPath } from "node:url";
import { storageRead, storageWrite } from "./storage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../data/abtest-conclusions.json");

async function load() {
  try { return await storageRead(STORE_PATH); }
  catch { return {}; }
}

async function save(data) {
  await storageWrite(STORE_PATH, data);
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
