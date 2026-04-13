import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../config/abtest-product-config.json");

async function load() {
  try { return JSON.parse(await readFile(STORE_PATH, "utf8")); }
  catch { return {}; }
}

async function save(data) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function getProductConfig(key) {
  return (await load())[key] || { productTypes: [] };
}

export async function setProductConfig(key, productTypes) {
  const all = await load();
  all[key] = { productTypes: Array.isArray(productTypes) ? productTypes : [] };
  await save(all);
  return all[key];
}

export async function clearProductConfig(key) {
  const all = await load();
  delete all[key];
  await save(all);
}
