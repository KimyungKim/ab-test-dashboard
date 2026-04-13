import "./src/env-loader.mjs";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storageRead, storageWrite } from "./src/storage.mjs";
import { getAppSession } from "./src/app-core.mjs";
import { fetchAbTestSlackData, fetchSlackThread, getChannelInfo } from "./src/slack-client.mjs";
import { classifyThreadMessages } from "./src/slack-classifier.mjs";
import { getManualData, setManualAnnouncement, clearManualAnnouncement, addManualAnalysisItem, removeManualAnalysisItem, reorderManualAnalysisItems, setManualOutcome, clearManualOutcome, clearManualData } from "./src/abtest-manual-store.mjs";
import { writeAuditEvent } from "./src/audit.mjs";
import { getDatabricksConnectionMode, runDatabricksStatement } from "./src/databricks-client.mjs";
import { runAbtestAnalysis } from "./src/abtest-analysis.mjs";
import { getAllConclusions, setConclusion } from "./src/abtest-conclusion-store.mjs";
import { getProductConfig, setProductConfig, clearProductConfig } from "./src/abtest-product-config-store.mjs";
import { getViewerFromHeaders } from "./src/security.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const analysisCacheDir = path.join(__dirname, "data", "analysis-cache");
mkdir(analysisCacheDir, { recursive: true }).catch(() => {});
const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function writeJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  });
  response.end(body);
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Request body is too large."));
    });
    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });
}

function sanitizePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, `http://${host}:${port}`).pathname);
  if (pathname === "/" || pathname === "/abtest" || pathname === "/abtest/") {
    return path.join(publicDir, "abtest.html");
  }
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}

async function serveStatic(request, response) {
  const filePath = sanitizePath(request.url || "/");
  if (!filePath) { writeJson(response, 403, { error: "Forbidden" }); return; }
  try {
    const contents = await readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT") { writeJson(response, 404, { error: "Not found" }); return; }
    console.error("static-file-failure", error);
    writeJson(response, 500, { error: "Unable to serve the requested file." });
  }
}

async function handleApi(request, response) {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const viewer = getViewerFromHeaders(request.headers);

  try {
    // ── 세션 ──────────────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api/session") {
      writeJson(response, 200, await getAppSession(viewer));
      return;
    }

    // ── 헬스체크 ──────────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api/health") {
      writeJson(response, 200, { ok: true, mode: getDatabricksConnectionMode(), timestamp: new Date().toISOString() });
      return;
    }

    // ── Slack 파일 프록시 ─────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api/slack-file") {
      const fileUrl = url.searchParams.get("url");
      if (!fileUrl || !fileUrl.startsWith("https://files.slack.com/")) {
        writeJson(response, 400, { error: "Invalid Slack file URL." }); return;
      }
      const token = (process.env.SLACK_USER_TOKEN || "").trim();
      if (!token) { writeJson(response, 503, { error: "SLACK_USER_TOKEN is not configured." }); return; }
      const fileResponse = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!fileResponse.ok) { writeJson(response, 502, { error: "Failed to fetch Slack file." }); return; }
      const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
      response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": contentType, "X-Content-Type-Options": "nosniff" });
      fileResponse.body.pipeTo(new WritableStream({
        write(chunk) { response.write(chunk); },
        close() { response.end(); }
      }));
      return;
    }

    // ── Slack A/B Test 데이터 조회 ────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/slack-abtest") {
      const rawBody = await readRequestBody(request);
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const rawIds = payload.testIds;
      const testIds = Array.isArray(rawIds)
        ? rawIds.map(id => String(id).trim()).filter(Boolean)
        : String(payload.testId || "").split(",").map(s => s.trim()).filter(Boolean);
      const slackData = await fetchAbTestSlackData({
        testIds,
        testName: String(payload.testName || "").trim(),
        startDate: String(payload.startDate || "").trim() || undefined,
        endDate: String(payload.endDate || "").trim() || undefined
      });
      if (!slackData.found) { writeJson(response, 200, slackData); return; }
      const classifiedThreads = slackData.threads
        .map(thread => {
          const classified = classifyThreadMessages(thread.messages, testIds);
          if (!classified.announcement) return null;
          return { channelId: thread.channelId, channelName: thread.channelName, permalink: thread.permalink, announcement: classified.announcement, analysisResults: classified.analysisResults, outcome: classified.outcome };
        })
        .filter(Boolean);
      writeJson(response, 200, { found: classifiedThreads.length > 0, threads: classifiedThreads, images: slackData.images });
      return;
    }

    // ── 수동 데이터 ───────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api/abtest-manual") {
      writeJson(response, 200, await getManualData(url.searchParams.get("key") || ""));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/abtest-manual/announcement") {
      const { key, slackUrl, testIds = [] } = JSON.parse(await readRequestBody(request));
      const m = String(slackUrl).match(/archives\/([A-Z0-9]+)\/p(\d+)/);
      if (!m) { writeJson(response, 400, { error: "유효한 Slack 링크가 아닙니다." }); return; }
      const channelId = m[1], tsRaw = m[2];
      const msgTs = `${tsRaw.slice(0, -6)}.${tsRaw.slice(-6)}`;
      const threadTs = new URL(slackUrl).searchParams.get("thread_ts") || msgTs;
      const channelInfo = await getChannelInfo(channelId);
      if (channelInfo.isPrivate) { writeJson(response, 403, { error: "비공개 채널 또는 DM은 추가할 수 없습니다." }); return; }
      const allMessages = await fetchSlackThread(channelId, threadTs);
      const classified = classifyThreadMessages(allMessages, testIds.map(String));
      const msg = classified.announcement || (allMessages[0] ? { text: allMessages[0].text } : null);
      if (!msg?.text) { writeJson(response, 400, { error: "공지 메시지를 찾을 수 없습니다." }); return; }
      writeJson(response, 200, { item: await setManualAnnouncement(key, { slackUrl, text: msg.text, channelName: channelInfo.name, permalink: slackUrl }) });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/abtest-manual/announcement") {
      const { key } = JSON.parse(await readRequestBody(request));
      await clearManualAnnouncement(key);
      writeJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/abtest-manual/analysis") {
      const { key, slackUrl, testIds = [] } = JSON.parse(await readRequestBody(request));
      const m = String(slackUrl).match(/archives\/([A-Z0-9]+)\/p(\d+)/);
      if (!m) { writeJson(response, 400, { error: "유효한 Slack 링크가 아닙니다." }); return; }
      const channelId = m[1], tsRaw = m[2];
      const msgTs = `${tsRaw.slice(0, -6)}.${tsRaw.slice(-6)}`;
      const threadTs = new URL(slackUrl).searchParams.get("thread_ts") || msgTs;
      const channelInfo = await getChannelInfo(channelId);
      if (channelInfo.isPrivate) { writeJson(response, 403, { error: "비공개 채널 또는 DM은 추가할 수 없습니다." }); return; }
      const allMessages = await fetchSlackThread(channelId, threadTs);
      const classified = classifyThreadMessages(allMessages, testIds.map(String));
      const toAdd = classified.analysisResults?.length
        ? classified.analysisResults
        : [allMessages.find(msg => Number(msg.ts) === Number(msgTs)) || allMessages[0]].filter(Boolean).map(msg => ({ text: msg.text, images: msg.images || [] }));
      if (!toAdd.length) { writeJson(response, 400, { error: "추가할 분석 메시지를 찾을 수 없습니다." }); return; }
      const added = [];
      for (const r of toAdd) added.push(await addManualAnalysisItem(key, { slackUrl, text: r.text || "", images: r.images || [], channelName: channelInfo.name, permalink: slackUrl }));
      writeJson(response, 200, { added });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/abtest-manual/analysis") {
      const { key, id } = JSON.parse(await readRequestBody(request));
      const ok = await removeManualAnalysisItem(key, id);
      writeJson(response, ok ? 200 : 404, { ok });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/abtest-manual/analysis-reorder") {
      const { key, orderedIds } = JSON.parse(await readRequestBody(request));
      const ok = await reorderManualAnalysisItems(key, orderedIds);
      writeJson(response, ok ? 200 : 404, { ok });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/abtest-manual/outcome") {
      const { key, slackUrl, testIds = [] } = JSON.parse(await readRequestBody(request));
      const m = String(slackUrl).match(/archives\/([A-Z0-9]+)\/p(\d+)/);
      if (!m) { writeJson(response, 400, { error: "유효한 Slack 링크가 아닙니다." }); return; }
      const channelId = m[1], tsRaw = m[2];
      const msgTs = `${tsRaw.slice(0, -6)}.${tsRaw.slice(-6)}`;
      const threadTs = new URL(slackUrl).searchParams.get("thread_ts") || msgTs;
      const channelInfo = await getChannelInfo(channelId);
      if (channelInfo.isPrivate) { writeJson(response, 403, { error: "비공개 채널 또는 DM은 추가할 수 없습니다." }); return; }
      const allMessages = await fetchSlackThread(channelId, threadTs);
      const classified = classifyThreadMessages(allMessages, testIds.map(String));
      const msg = classified.outcome || allMessages.at(-1);
      if (!msg?.text) { writeJson(response, 400, { error: "결과 메시지를 찾을 수 없습니다." }); return; }
      writeJson(response, 200, { item: await setManualOutcome(key, { slackUrl, text: msg.text, channelName: channelInfo.name, permalink: slackUrl }) });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/abtest-manual/outcome") {
      const { key } = JSON.parse(await readRequestBody(request));
      await clearManualOutcome(key);
      writeJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/abtest-manual/all") {
      const { key } = JSON.parse(await readRequestBody(request));
      await clearManualData(key);
      writeJson(response, 200, { ok: true });
      return;
    }

    // ── 이미지 업로드 ─────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/abtest-upload") {
      const ext = (request.headers.get("x-filename") || "file.jpg").split(".").pop().slice(0, 5).toLowerCase();
      const allowed = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!allowed.includes(ext)) { writeJson(response, 400, { error: "지원하지 않는 파일 형식입니다." }); return; }
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      if (buffer.length > 15 * 1024 * 1024) { writeJson(response, 400, { error: "파일 크기가 너무 큽니다 (최대 15MB)." }); return; }
      const { randomUUID } = await import("node:crypto");
      const { writeFile: wf, mkdir: md } = await import("node:fs/promises");
      const uploadsDir = path.join(__dirname, "public/abtest-uploads");
      await md(uploadsDir, { recursive: true });
      const filename = `${randomUUID()}.${ext}`;
      await wf(path.join(uploadsDir, filename), buffer);
      writeJson(response, 200, { url: `/abtest-uploads/${filename}` });
      return;
    }

    // ── A/B Test 목록 ─────────────────────────────────────────────
    if (request.method === "GET" && (url.pathname === "/api/abtest-list" || url.pathname === "/api/abtest-analysis-list")) {
      const gameCode = url.searchParams.get("game") || "cvs";
      const dbSchemas = { cvs: "slots1_db_prod", cbn: "slots3_db_prod", jpm: "slots4_db_prod" };
      const schema = dbSchemas[gameCode] || dbSchemas.cvs;
      const result = await runDatabricksStatement({
        catalog: "cvs", schema,
        statement: `SELECT id, start_timestamp, end_timestamp, setting, description
          FROM ab_test
          WHERE setting NOT LIKE '%"population_weight": [1]%'
            AND (
              lower(description) NOT LIKE '%not a/b%'
              AND lower(description) NOT LIKE '%prod test%'
              AND description NOT LIKE '%사내테스트%'
              OR description IS NULL
            )
            AND lower(setting) NOT LIKE '%not a/b%'
            AND lower(setting) NOT LIKE '%not for a/b%'
            AND lower(setting) NOT LIKE '%prod test%'
          ORDER BY CAST(id AS INT) DESC`,
        parameters: [], rowLimit: 2000
      });
      function toIso(ts) {
        if (!ts && ts !== 0) return null;
        const num = Number(ts);
        if (!Number.isNaN(num)) return new Date(num).toISOString();
        const d = new Date(String(ts).replace(" ", "T"));
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      }
      const mapped = (result.rows || []).map(row => {
        let name = "", populationWeight = null;
        try {
          const setting = typeof row.setting === "string" ? JSON.parse(row.setting) : (row.setting || {});
          name = setting.name || setting.test_name || setting.title || "";
          if (Array.isArray(setting.population_weight)) populationWeight = setting.population_weight;
        } catch { name = ""; }
        return { id: row.id, startTs: toIso(row.start_timestamp), endTs: toIso(row.end_timestamp), name, populationWeight };
      });
      const groups = new Map();
      for (const row of mapped) {
        const groupKey = `${row.name}||${row.startTs || ""}||${row.endTs || ""}`;
        if (!groups.has(groupKey)) groups.set(groupKey, { ids: [], startTs: row.startTs, endTs: row.endTs, name: row.name, populationWeight: row.populationWeight });
        groups.get(groupKey).ids.push(row.id);
      }
      const conclusions = await getAllConclusions();
      const rows = [...groups.values()]
        .map(g => { const primaryId = String(Math.min(...g.ids.map(Number))); return { ...g, primaryId, conclusion: conclusions[primaryId] || null }; })
        .sort((a, b) => !a.startTs ? 1 : !b.startTs ? -1 : b.startTs < a.startTs ? -1 : b.startTs > a.startTs ? 1 : 0);
      writeJson(response, 200, { rows });
      return;
    }

    // ── 결론 ──────────────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/abtest-conclusion") {
      const { primaryId, conclusion } = JSON.parse(await readRequestBody(request));
      await setConclusion(primaryId, conclusion || null);
      writeJson(response, 200, { ok: true });
      return;
    }

    // ── Product Config ─────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/api/abtest-product-config") {
      writeJson(response, 200, await getProductConfig(url.searchParams.get("key") || ""));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/abtest-product-config") {
      const { key, productTypes } = JSON.parse(await readRequestBody(request));
      writeJson(response, 200, await setProductConfig(key, productTypes));
      return;
    }
    if (request.method === "DELETE" && url.pathname === "/api/abtest-product-config") {
      const { key } = JSON.parse(await readRequestBody(request));
      await clearProductConfig(key);
      writeJson(response, 200, { ok: true });
      return;
    }

    // ── 분석 실행 ─────────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/api/abtest-analysis/run") {
      const rawBody = await readRequestBody(request);
      const { abTestId, gameCode } = rawBody ? JSON.parse(rawBody) : {};
      const sortedIds = String(abTestId).split(",").map(s => s.trim()).filter(Boolean).map(Number).sort((a, b) => b - a).join(",");
      const testKey = String(abTestId).split(",").map(s => s.trim()).filter(Boolean).map(Number).sort((a, b) => a - b).join(",");
      const productConfig = await getProductConfig(`${gameCode || "cvs"}-${testKey}`);
      const selectedProductTypes = productConfig.productTypes || [];
      const ptHash = selectedProductTypes.length ? `-pt${[...selectedProductTypes].sort().join("+")}` : "";
      const cacheKey = `${gameCode || "cvs"}-${sortedIds}${ptHash}`;
      const cachePath = path.join(analysisCacheDir, `${cacheKey}.json`);
      try {
        const cached = await storageRead(cachePath);
        if (!Array.isArray(cached.dailyPreRevRows)) throw new Error("stale cache");
        console.log(`[cache] hit: ${cacheKey}`);
        writeJson(response, 200, cached);
        return;
      } catch {}
      const result = await runAbtestAnalysis({ abTestId, gameCode, selectedProductTypes });
      if (result?.meta?.endPst) {
        const daysSinceEnd = (Date.now() - new Date(result.meta.endPst).getTime()) / 86_400_000;
        if (daysSinceEnd >= 60) {
          storageWrite(cachePath, result)
            .then(() => console.log(`[cache] saved: ${cacheKey}`))
            .catch(err => console.error(`[cache] write error: ${cacheKey}`, err));
        }
      }
      writeJson(response, 200, result);
      return;
    }

    // ── 캐시 삭제 (전체) ──────────────────────────────────────────
    if (request.method === "DELETE" && url.pathname === "/api/abtest-analysis/cache/all") {
      const s3Bucket = (process.env.S3_BUCKET || "").trim();
      if (s3Bucket) {
        try {
          const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
          const s3 = new S3Client({ region: process.env.S3_REGION || "ap-northeast-2" });
          const prefix = (process.env.S3_PREFIX ? process.env.S3_PREFIX + "/" : "") + "data/analysis-cache/";
          const listed = await s3.send(new ListObjectsV2Command({ Bucket: s3Bucket, Prefix: prefix }));
          const objects = (listed.Contents || []).map(o => ({ Key: o.Key }));
          if (objects.length) await s3.send(new DeleteObjectsCommand({ Bucket: s3Bucket, Delete: { Objects: objects } }));
          console.log(`[cache] cleared all S3 (${objects.length} files)`);
          writeJson(response, 200, { ok: true, count: objects.length });
        } catch { writeJson(response, 200, { ok: false }); }
      } else {
        const { readdir, unlink } = await import("node:fs/promises");
        try {
          const files = await readdir(analysisCacheDir);
          await Promise.all(files.filter(f => f.endsWith(".json")).map(f => unlink(path.join(analysisCacheDir, f))));
          console.log(`[cache] cleared all (${files.length} files)`);
          writeJson(response, 200, { ok: true, count: files.length });
        } catch { writeJson(response, 200, { ok: false }); }
      }
      return;
    }

    // ── 캐시 삭제 (개별) ──────────────────────────────────────────
    if (request.method === "DELETE" && url.pathname === "/api/abtest-analysis/cache") {
      const { abTestId, gameCode } = JSON.parse(await readRequestBody(request));
      const sortedIds2 = String(abTestId).split(",").map(s => s.trim()).filter(Boolean).map(Number).sort((a, b) => b - a).join(",");
      const cacheKey = `${gameCode || "cvs"}-${sortedIds2}`;
      const cachePath = path.join(analysisCacheDir, `${cacheKey}.json`);
      const s3Bucket = (process.env.S3_BUCKET || "").trim();
      if (s3Bucket) {
        try {
          const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
          const s3 = new S3Client({ region: process.env.S3_REGION || "ap-northeast-2" });
          const { storageRead: _r } = await import("./src/storage.mjs");
          const key = (process.env.S3_PREFIX ? process.env.S3_PREFIX + "/" : "") + `data/analysis-cache/${cacheKey}.json`;
          await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));
          console.log(`[cache] cleared S3: ${cacheKey}`);
          writeJson(response, 200, { ok: true });
        } catch { writeJson(response, 200, { ok: false, reason: "no cache" }); }
      } else {
        try {
          const { unlink } = await import("node:fs/promises");
          await unlink(cachePath);
          console.log(`[cache] cleared: ${cacheKey}`);
          writeJson(response, 200, { ok: true });
        } catch { writeJson(response, 200, { ok: false, reason: "no cache" }); }
      }
      return;
    }

    writeJson(response, 404, { error: "Unknown API route." });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    writeAuditEvent(statusCode === 403 || statusCode === 401 ? "query-denied" : "query-failed", {
      path: url.pathname,
      viewerEmail: viewer.email || null,
      viewerGroups: viewer.groups,
      statusCode,
      message: error.message || "Failed to execute query."
    });
    writeJson(response, statusCode, { error: error.message || "Failed to execute query." });
  }
}

const server = createServer(async (request, response) => {
  try {
    if ((request.url || "").startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    console.error("server-failure", error);
    writeJson(response, 500, { error: "Unexpected server error." });
  }
});

server.listen(port, host, () => {
  console.log(`A/B Test Dashboard listening at http://${host}:${port}`);
});
