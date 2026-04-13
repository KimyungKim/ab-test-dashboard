import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const configDir = path.join(process.cwd(), "config");
const configPath = path.join(configDir, "runtime-overrides.json");

const defaultOverrides = {
  runtime: {},
  queries: {}
};

export async function loadRuntimeOverrides() {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      runtime: parsed.runtime || {},
      queries: parsed.queries || {}
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...defaultOverrides };
    }
    throw error;
  }
}

export async function saveRuntimeOverrides(nextOverrides) {
  await mkdir(configDir, { recursive: true });
  const payload = {
    runtime: nextOverrides.runtime || {},
    queries: nextOverrides.queries || {}
  };
  await writeFile(configPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function getRuntimeOverridesPath() {
  return configPath;
}
