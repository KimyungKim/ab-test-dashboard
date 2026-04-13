import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "../config/abtest-manual.json");

async function load() {
  try { return JSON.parse(await readFile(STORE_PATH, "utf8")); }
  catch { return {}; }
}

async function save(data) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function emptyRecord() {
  return { announcement: null, analysisItems: [], outcome: null };
}

export async function getManualData(key) {
  return (await load())[key] || emptyRecord();
}

export async function setManualAnnouncement(key, item) {
  const all = await load();
  if (!all[key]) all[key] = emptyRecord();
  all[key].announcement = { id: randomUUID(), ...item };
  await save(all);
  return all[key].announcement;
}

export async function clearManualAnnouncement(key) {
  const all = await load();
  if (!all[key]) return false;
  all[key].announcement = null;
  await save(all);
  return true;
}

export async function addManualAnalysisItem(key, item) {
  const all = await load();
  if (!all[key]) all[key] = emptyRecord();
  const newItem = { id: randomUUID(), ...item };
  all[key].analysisItems.push(newItem);
  await save(all);
  return newItem;
}

export async function removeManualAnalysisItem(key, id) {
  const all = await load();
  if (!all[key]) return false;
  const before = all[key].analysisItems.length;
  all[key].analysisItems = all[key].analysisItems.filter(i => i.id !== id);
  await save(all);
  return all[key].analysisItems.length < before;
}

export async function reorderManualAnalysisItems(key, orderedIds) {
  const all = await load();
  if (!all[key]) return false;
  const map = Object.fromEntries(all[key].analysisItems.map(i => [i.id, i]));
  all[key].analysisItems = orderedIds.map(id => map[id]).filter(Boolean);
  await save(all);
  return true;
}

export async function setManualOutcome(key, item) {
  const all = await load();
  if (!all[key]) all[key] = emptyRecord();
  all[key].outcome = { id: randomUUID(), ...item };
  await save(all);
  return all[key].outcome;
}

export async function clearManualOutcome(key) {
  const all = await load();
  if (!all[key]) return false;
  all[key].outcome = null;
  await save(all);
  return true;
}

export async function clearManualData(key) {
  const all = await load();
  if (!all[key]) return false;
  delete all[key];
  await save(all);
  return true;
}
