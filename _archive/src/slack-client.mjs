import "./env-loader.mjs";

const SLACK_API = "https://slack.com/api";

function getToken() {
  const token = (process.env.SLACK_USER_TOKEN || "").trim();
  if (!token) {
    const error = new Error("SLACK_USER_TOKEN is not configured.");
    error.statusCode = 503;
    throw error;
  }
  return token;
}

async function slackGet(method, params, retries = 3) {
  const token = getToken();
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  const payload = await response.json();
  if (!payload.ok) {
    if (payload.error === "ratelimited" && retries > 0) {
      const retryAfter = Number(response.headers.get("Retry-After") || 1);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return slackGet(method, params, retries - 1);
    }
    const error = new Error(`Slack API error: ${payload.error || "unknown"}`);
    error.statusCode = 502;
    throw error;
  }

  return payload;
}

const ALLOWED_CHANNELS = ["cvs-economy", "cvs-ba", "cvs-team-crm", "cvs-metadesign"];

/**
 * AB test 이름/ID로 허용된 채널 내에서 Slack 메시지 검색.
 * 채널별로 쿼리를 분리하여 검색 정확도를 높임.
 */
async function searchAbTestMessages({ testName, testIds = [], startDate, endDate }) {
  const allMatches = new Map();

  let afterStr = "";
  let beforeStr = "";
  if (startDate) {
    const after = new Date(startDate);
    after.setDate(after.getDate() - 7);
    afterStr = ` after:${after.toISOString().slice(0, 10)}`;
  }
  if (endDate) {
    const before = new Date(endDate);
    before.setDate(before.getDate() + 30);
    beforeStr = ` before:${before.toISOString().slice(0, 10)}`;
  }

  // [TAG], (괄호 내용) 제거한 핵심 이름 키워드
  const nameKeyword = testName
    ? testName
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40)
    : "";

  // 검색 쿼리: 이름 키워드 + 대표 ID 1개 (채널당 각 1번)
  const queries = [];
  if (nameKeyword) {
    for (const channel of ALLOWED_CHANNELS) {
      queries.push(`${nameKeyword} in:${channel}${afterStr}${beforeStr}`);
    }
  }
  if (testIds.length > 0) {
    // ID가 여러 개여도 첫 번째 하나로만 검색 — 이후 다른 ID로 필터링
    const firstId = testIds[0];
    for (const channel of ALLOWED_CHANNELS) {
      queries.push(`"${firstId}" in:${channel}${afterStr}${beforeStr}`);
    }
  }

  for (const query of queries) {
    const result = await slackGet("search.messages", {
      query,
      count: 20,
      sort: "timestamp",
      sort_dir: "desc"
    });

    for (const match of result.messages?.matches || []) {
      const channelName = match.channel?.name || "";
      if (!ALLOWED_CHANNELS.includes(channelName)) continue;

      const rootTs = match.thread_ts || match.ts;
      const key = `${match.channel?.id}:${rootTs}`;
      if (!allMatches.has(key)) {
        allMatches.set(key, { ...match, _rootTs: rootTs });
      }
    }
  }

  return [...allMatches.values()];
}

/**
 * 특정 메시지의 스레드 전체를 가져옴
 */
async function getThread(channelId, threadTs) {
  const messages = [];
  let cursor;
  do {
    const result = await slackGet("conversations.replies", {
      channel: channelId,
      ts: threadTs,
      limit: 200,
      ...(cursor ? { cursor } : {})
    });
    messages.push(...(result.messages || []));
    cursor = result.response_metadata?.next_cursor;
  } while (cursor);
  return messages;
}

function extractImages(messages) {
  const images = [];
  for (const msg of messages) {
    for (const file of msg.files || []) {
      if (file.mimetype?.startsWith("image/")) {
        images.push({
          fileId: file.id,
          name: file.name,
          url: file.url_private,
          thumb: file.thumb_360 || file.thumb_160,
          messageTs: msg.ts
        });
      }
    }
  }
  return images;
}

const SIX_MONTHS_SEC = 6 * 30 * 24 * 3600;

/**
 * thread_ts와 ts 간 시간차가 6개월 이내면 thread_ts(상위 스레드)를 root로,
 * 초과하면 ts(공지 메시지)를 root로 사용.
 * Slack 검색 결과에서 thread_ts가 누락될 수 있으므로 permalink URL에서도 추출.
 */
function resolveRootTs(match) {
  const ts = Number(match.ts);

  let threadTsStr = match.thread_ts;
  if (!threadTsStr && match.permalink) {
    const m = match.permalink.match(/[?&]thread_ts=([0-9.]+)/);
    if (m) threadTsStr = m[1];
  }

  const threadTs = threadTsStr ? Number(threadTsStr) : null;
  if (threadTs && threadTs !== ts && (ts - threadTs) <= SIX_MONTHS_SEC) {
    return String(threadTs);
  }
  return String(ts);
}

/**
 * AB test의 Slack 데이터를 종합해서 반환
 * - 허용된 채널에서만 검색
 * - 공지 메시지 기준으로 스레드 결정 (6개월 초과 상위 스레드는 무시)
 * - 텍스트와 이미지 플랫하게 반환
 */
/**
 * 특정 채널+스레드의 메시지를 구조화해서 반환 (수동 추가용)
 */
export async function getChannelInfo(channelId) {
  try {
    const result = await slackGet("conversations.info", { channel: channelId });
    const ch = result.channel || {};
    return { name: ch.name || channelId, isPrivate: !!(ch.is_private || ch.is_im || ch.is_mpim) };
  } catch {
    return { name: channelId, isPrivate: null }; // null = 확인 불가
  }
}

export async function fetchSlackThread(channelId, threadTs) {
  const allMessages = await getThread(channelId, threadTs);
  return allMessages
    .map(msg => ({
      ts: msg.ts,
      text: msg.text || "",
      images: (msg.files || [])
        .filter(f => f.mimetype?.startsWith("image/"))
        .map(f => ({
          fileId: f.id,
          name: f.name,
          url: f.url_private,
          proxyUrl: `/api/slack-file?url=${encodeURIComponent(f.url_private)}`,
          width: f.original_w || null,
          height: f.original_h || null
        }))
    }))
    .filter(msg => msg.text || msg.images.length > 0);
}

export async function fetchAbTestSlackData({ testName, testIds = [], startDate, endDate }) {
  const matches = await searchAbTestMessages({ testName, testIds, startDate, endDate });

  if (matches.length === 0) {
    return { found: false, threads: [], images: [] };
  }

  const threads = [];
  const allImages = [];
  const seenThreads = new Set();

  for (const match of matches) {
    const channelId = match.channel?.id;
    if (!channelId) continue;

    const threadTs = resolveRootTs(match);
    const threadKey = `${channelId}:${threadTs}`;
    if (seenThreads.has(threadKey)) continue;
    seenThreads.add(threadKey);

    let allMessages;
    try {
      allMessages = await getThread(channelId, threadTs);
    } catch (err) {
      continue;
    }

    // 스레드 전체 메시지를 구조화 (classifier가 공지 위치를 직접 판단)
    const messages = allMessages
      .map(msg => ({
        ts: msg.ts,
        text: msg.text || "",
        images: (msg.files || [])
          .filter(f => f.mimetype?.startsWith("image/"))
          .map(f => ({
            fileId: f.id,
            name: f.name,
            url: f.url_private,
            thumb: f.thumb_360 || f.thumb_160,
            proxyUrl: `/api/slack-file?url=${encodeURIComponent(f.url_private)}`,
            width: f.original_w || null,
            height: f.original_h || null
          }))
      }))
      .filter(msg => msg.text || msg.images.length > 0);

    const images = extractImages(allMessages);
    allImages.push(...images);

    threads.push({
      channelId,
      channelName: match.channel?.name || channelId,
      permalink: match.permalink,
      threadTs,
      messages
    });
  }

  // 스레드가 여러 개이고 testId도 여러 개면, 다른 ID가 포함된 스레드만 남김
  const filteredThreads = filterThreadsByIds(threads, testIds);

  return { found: filteredThreads.length > 0, threads: filteredThreads, images: allImages };
}

function idPattern(id) {
  return new RegExp(`(?<![0-9A-Za-z\uAC00-\uD7A3])${id}(?![0-9A-Za-z\uAC00-\uD7A3])`);
}

function threadContainsId(thread, id) {
  return thread.messages.some(m => idPattern(id).test(m.text));
}

function filterThreadsByIds(threads, testIds) {
  if (threads.length <= 1 || testIds.length <= 1) return threads;

  const otherIds = testIds.slice(1);
  const filtered = threads.filter(t => otherIds.some(id => threadContainsId(t, id)));
  return filtered.length > 0 ? filtered : threads;
}
