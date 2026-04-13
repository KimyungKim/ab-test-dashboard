const OUTCOME_KEYWORDS = [
  "롤아웃", "rollout", "roll out", "roll-out",
  "롤백", "rollback"
];

function includesAny(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * 공지: testId 중 하나 이상 포함 + "시작" 또는 "start" 포함
 */
function containsId(text, id) {
  // 앞뒤가 숫자/알파벳/한글이 아닌 경우에만 매칭 (UUID 등 혼합 문자열 오매칭 방지)
  return new RegExp(`(?<![0-9A-Za-z\uAC00-\uD7A3])${id}(?![0-9A-Za-z\uAC00-\uD7A3])`).test(text);
}

function isAnnouncement(msg, testIds) {
  if (!msg.text) return false;
  // testId가 숫자 단독으로 등장하면 공지로 인정 (앞뒤가 숫자가 아닌 경우만)
  return testIds.some(id => containsId(msg.text, String(id)));
}

/**
 * 분석: "결과" 포함 + 이미지 있음
 */
function isAnalysis(msg) {
  if (!msg.text) return false;
  const hasResult = msg.text.includes("결과");
  const hasImages = (msg.images?.length || 0) > 0;
  return hasResult && hasImages;
}

/**
 * 결론: 롤아웃/롤백 관련 단어 포함
 */
function isOutcome(msg) {
  if (!msg.text) return false;
  return includesAny(msg.text, OUTCOME_KEYWORDS);
}

/**
 * 스레드 메시지를 규칙 기반으로 분류
 * @param {Array} messages - 각 msg: { ts, text, images }
 * @param {Array} testIds - 테스트 ID 목록
 * @returns {{ announcement, analysisResults, outcome }}
 */
export function classifyThreadMessages(messages, testIds = []) {
  // 공지: ID + 시작/start 포함한 메시지. 없으면 공지 없는 A/B Test.
  const announcementMsg = messages.find(msg => isAnnouncement(msg, testIds)) || null;

  if (!announcementMsg) {
    return { announcement: null, analysisResults: [], outcome: null };
  }

  const announcementTs = Number(announcementMsg.ts);

  // 공지 이후 메시지만
  const afterAnnouncement = messages.filter(msg => Number(msg.ts) > announcementTs);

  // 분석: 결과 + 이미지 (롤아웃 키워드가 포함되어 있어도 분석 우선)
  const analysisResults = afterAnnouncement
    .filter(isAnalysis)
    .map(msg => ({
      ts: msg.ts,
      text: msg.text,
      images: msg.images || []
    }));

  // 결론: 롤아웃/롤백 키워드 포함한 메시지 중 분석 메시지가 아닌 것의 마지막
  const analysisTs = new Set(analysisResults.map(r => r.ts));
  const outcomeMsg =
    afterAnnouncement.filter(msg => isOutcome(msg) && !analysisTs.has(msg.ts)).at(-1) || null;

  return {
    announcement: { ts: announcementMsg.ts, text: announcementMsg.text },
    analysisResults,
    outcome: outcomeMsg ? { ts: outcomeMsg.ts, text: outcomeMsg.text } : null
  };
}
