import path from "node:path";
import { fileURLToPath } from "node:url";
import { storageRead, storageWrite } from "./storage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../config/abtest-product-config.json");

async function load() {
  try { return await storageRead(STORE_PATH); }
  catch { return {}; }
}

async function save(data) {
  await storageWrite(STORE_PATH, data);
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
