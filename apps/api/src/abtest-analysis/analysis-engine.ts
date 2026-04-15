// Pure TypeScript statistical analysis engine — no NestJS decorators.
// Ported from abtest-analysis.mjs.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Schemas {
  etl: string;
  events: string;
  db: string;
}

export interface DtRange {
  start: string;
  end: string;
  retEnd: string;
}

export interface RunAbtestAnalysisParams {
  abTestId: string | number;
  gameCode?: string;
  selectedProductTypes?: string[];
  runDatabricksStatement: (params: {
    statement: string;
    parameters: any[];
    rowLimit: number;
    catalog?: string;
    schema?: string;
  }) => Promise<{ rows: any[] }>;
}

// ---------------------------------------------------------------------------
// Schema lookup
// ---------------------------------------------------------------------------

export function getSchemas(gameCode: string): Schemas {
  const code = String(gameCode || 'cvs').toLowerCase();
  if (code === 'cbn') return { etl: 'cvs.slots3_etl_prod', events: 'cvs.slots3_events_prod', db: 'cvs.slots3_db_prod' };
  if (code === 'jpm') return { etl: 'cvs.slots4_etl_prod', events: 'cvs.slots4_events_prod', db: 'cvs.slots4_db_prod' };
  return { etl: 'cvs.v3_etl', events: 'cvs.v3_events', db: 'cvs.slots1_db_prod' };
}

// ---------------------------------------------------------------------------
// Statistical functions
// ---------------------------------------------------------------------------

// Normal CDF using rational approximation (Horner's method)
export function normalCDF(z: number): number {
  const a = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  let poly = 0;
  for (let i = 4; i >= 0; i--) poly = poly * t + a[i];
  poly *= t;
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// Two-proportion z-test: control=(n1,x1), treatment=(n2,x2)
export function propZTest(n1: number, x1: number, n2: number, x2: number): any {
  if (!n1 || !n2) return null;
  const p1 = x1 / n1, p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se < 1e-12) return { z: 0, p: 1, sig: false, delta: 0 };
  const z = (p2 - p1) / se;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return { z: +z.toFixed(3), p: +p.toFixed(4), sig: p < 0.05, delta: +(p2 - p1).toFixed(5) };
}

// Welch's t-test (large-sample normal approximation)
export function welchTTest(n1: number, mean1: number, std1: number, n2: number, mean2: number, std2: number): any {
  if (!n1 || !n2) return null;
  const se = Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2);
  if (se < 1e-12) return { t: 0, p: 1, sig: false, delta: 0 };
  const t = (mean2 - mean1) / se;
  const p = 2 * (1 - normalCDF(Math.abs(t)));
  return { t: +t.toFixed(3), p: +p.toFixed(4), sig: p < 0.05, delta: +(mean2 - mean1).toFixed(2) };
}

// Compute summary stats from raw per-user value array (revenue or wager)
export function computeStats(values: number[]): any {
  const n = values.length;
  if (!n) return { n: 0, mean: 0, std: 0, nonZeroCount: 0, nonZeroMean: 0, nonZeroStd: 0, p50: 0, p75: 0, p90: 0, p99: 0 };
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const nonZero = values.filter(v => v > 0).sort((a, b) => a - b);
  const nz = nonZero.length;
  const nzSum = nonZero.reduce((s, v) => s + v, 0);
  const nzMean = nz ? nzSum / nz : 0;
  const nzVar = nz > 1 ? nonZero.reduce((s, v) => s + (v - nzMean) ** 2, 0) / (nz - 1) : 0;
  function pctile(arr: number[], q: number): number {
    if (!arr.length) return 0;
    const idx = q * (arr.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
  }
  return {
    n, mean: +mean.toFixed(2), std: +Math.sqrt(variance).toFixed(2),
    nonZeroCount: nz, nonZeroMean: +nzMean.toFixed(2), nonZeroStd: +Math.sqrt(nzVar).toFixed(2),
    p50: +pctile(nonZero, 0.50).toFixed(2), p75: +pctile(nonZero, 0.75).toFixed(2),
    p90: +pctile(nonZero, 0.90).toFixed(2), p99: +pctile(nonZero, 0.99).toFixed(2),
  };
}

// Bootstrap CI for mean difference (treatment - control), B=2000
export function bootstrapMeanDiff(ctrlVals: number[], trtVals: number[], B = 2000): any {
  const n1 = ctrlVals.length, n2 = trtVals.length;
  if (!n1 || !n2) return null;
  const ctrl = new Float64Array(ctrlVals);
  const trt  = new Float64Array(trtVals);
  const obsDiff = (trt.reduce((s, v) => s + v, 0) / n2) - (ctrl.reduce((s, v) => s + v, 0) / n1);
  function sampleMean(arr: Float64Array): number {
    const n = arr.length; let sum = 0;
    for (let i = 0; i < n; i++) sum += arr[Math.floor(Math.random() * n)];
    return sum / n;
  }
  const diffs: number[] = [];
  for (let i = 0; i < B; i++) diffs.push(sampleMean(trt) - sampleMean(ctrl));
  diffs.sort((a, b) => a - b);
  const ci_lo = diffs[Math.floor(0.025 * B)];
  const ci_hi = diffs[Math.floor(0.975 * B)];
  const sig = ci_lo > 0 || ci_hi < 0;
  const pLeft = diffs.filter(d => d <= 0).length / B;
  const p = +(2 * Math.min(pLeft, 1 - pLeft)).toFixed(4);
  // Bayesian Bootstrap: P(treatment > control) = posterior probability of positive effect
  const probBetter = +(diffs.filter(d => d > 0).length / B * 100).toFixed(1);
  return { diff: +obsDiff.toFixed(2), ci_lo: +ci_lo.toFixed(2), ci_hi: +ci_hi.toFixed(2), p, sig, probBetter };
}

// Segment classification: Non-payer / Non-whale / Whale
// Whale = top 5% of prior 30-day purchasers (p95+)
// Non-whale = bottom 95% of purchasers
// Non-payer = pre_revenue = 0
export function percentileSegment(rows: any[]): { segments: string[]; whaleThreshold: number } {
  const segments = new Array(rows.length).fill('Non-payer');
  const payerIndices: { i: number; v: number }[] = [];
  rows.forEach((r, i) => { if (Number(r.pre_revenue) > 0) payerIndices.push({ i, v: Number(r.pre_revenue) }); });
  if (!payerIndices.length) return { segments, whaleThreshold: 0 };

  payerIndices.sort((a, b) => a.v - b.v);
  const p95Idx = Math.floor(payerIndices.length * 0.95);
  const whaleThreshold = payerIndices[p95Idx].v;

  payerIndices.forEach(({ i, v }) => {
    segments[i] = v >= whaleThreshold ? 'Whale' : 'Non-whale';
  });
  return { segments, whaleThreshold };
}

// Detect test mode based on payer ratio
export function detectTestMode(rows: any[]): string {
  const total = rows.length;
  if (!total) return 'unknown';
  const payers = rows.filter(r => Number(r.pre_revenue) > 0).length;
  const ratio = payers / total;
  if (ratio < 0.05) return 'NB/F2P';
  if (ratio < 0.30) return 'Mixed';
  return 'OB Paid';
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

// Build common CTEs (assigned_users inline)
// ids: number[] — first ID is the reference record; only users in intersection of all IDs are included
export function buildAssignedCTE(ids: number[], schemas: Schemas): string {
  const primaryId = ids[0];
  const intersectFilter = ids.length > 1
    ? `AND tag.user_id IN (
    SELECT user_id FROM ${schemas.db}.user_ab_test_tag
    WHERE ab_test_id IN (${ids.join(',')})
    GROUP BY user_id
    HAVING COUNT(DISTINCT ab_test_id) = ${ids.length}
  )`
    : '';
  return `
valid_users AS (
  SELECT user_id, register_datetime FROM ${schemas.etl}.user_information
  WHERE is_test_user = FALSE AND is_banned = 0
),
assigned AS (
  SELECT
    tag.user_id,
    tag.group_id,
    CASE WHEN tag.group_id = 0 THEN 'Control'
         WHEN tag.group_id = 1 THEN 'Treatment'
         ELSE CONCAT('Treatment ', CAST(tag.group_id AS STRING)) END AS group_name,
    tag.create_timestamp                                                                          AS assign_ts_ms,
    ab.start_timestamp                                                                            AS test_start_ts_ms,
    ab.end_timestamp                                                                              AS test_end_ts_ms,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(tag.create_timestamp / 1000), 'America/Los_Angeles')        AS assign_pst,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.start_timestamp   / 1000), 'America/Los_Angeles')        AS test_start_pst,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.end_timestamp     / 1000), 'America/Los_Angeles')        AS test_end_pst,
    HOUR(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.start_timestamp / 1000), 'America/Los_Angeles'))    AS test_start_hour,
    LEAST(GREATEST(DATEDIFF(
      DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(tag.create_timestamp / 1000), 'America/Los_Angeles')),
      DATE(v.register_datetime)
    ), 1), 30) AS pre_days
  FROM ${schemas.db}.user_ab_test_tag tag
  JOIN ${schemas.db}.ab_test ab ON tag.ab_test_id = ab.id
  JOIN valid_users v ON tag.user_id = v.user_id
  WHERE tag.ab_test_id = ${primaryId}
  ${intersectFilter}
)`;
}

export function buildMetaQuery(id: number, schemas: Schemas): string {
  return `
SELECT
  ab.id,
  ab.type,
  parse_json(ab.setting):name::STRING AS test_name,
  CAST(parse_json(ab.setting):population_weight AS STRING) AS population_weight,
  FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.start_timestamp / 1000), 'America/Los_Angeles') AS test_start_pst,
  FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.end_timestamp   / 1000), 'America/Los_Angeles') AS test_end_pst,
  DATEDIFF(
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.end_timestamp   / 1000), 'America/Los_Angeles'),
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.start_timestamp / 1000), 'America/Los_Angeles')
  ) AS duration_days,
  ab.start_timestamp AS test_start_ts_ms,
  ab.end_timestamp   AS test_end_ts_ms,
  HOUR(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ab.start_timestamp / 1000), 'America/Los_Angeles')) AS test_start_hour
FROM ${schemas.db}.ab_test ab
WHERE ab.id = ${id}`;
}

export function buildGroupsQuery(ids: number[], schemas: Schemas): string {
  return `WITH ${buildAssignedCTE(ids, schemas)}
SELECT group_name, group_id, COUNT(*) AS n
FROM assigned
GROUP BY group_name, group_id
ORDER BY group_id`;
}

export function buildRetentionQuery(ids: number[], schemas: Schemas, dtRange: DtRange): string {
  const assigned = buildAssignedCTE(ids, schemas);
  const dtStart = dtRange.start;
  const dtEnd   = dtRange.retEnd; // test_start + min(duration,360) + 2-day buffer
  return `WITH ${assigned},
login_ev AS (
  SELECT l.user_id, l.ts AS login_ts_ms
  FROM ${schemas.events}.server_login l
  JOIN assigned a ON l.user_id = a.user_id
  WHERE l.ts > a.assign_ts_ms
    AND l.ts < a.test_end_ts_ms
    AND l.dt BETWEEN DATE_SUB(DATE('${dtStart}'), 1) AND DATE_ADD(DATE('${dtEnd}'), 1)
),
ret AS (
  SELECT
    a.user_id, a.group_name,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 1,   1, 0)) AS d1,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 3,   1, 0)) AS d3,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 7,   1, 0)) AS d7,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 14,  1, 0)) AS d14,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 21,  1, 0)) AS d21,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 30,  1, 0)) AS d30,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 60,  1, 0)) AS d60,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 90,  1, 0)) AS d90,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 120, 1, 0)) AS d120,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 150, 1, 0)) AS d150,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 180, 1, 0)) AS d180,
    MAX(IF(FLOOR((l.login_ts_ms - a.test_start_ts_ms) / 86400000) - FLOOR((a.assign_ts_ms - a.test_start_ts_ms) / 86400000) = 360, 1, 0)) AS d360
  FROM assigned a
  LEFT JOIN login_ev l ON a.user_id = l.user_id
  GROUP BY a.user_id, a.group_name
)
SELECT group_name, COUNT(*) AS n,
  COUNT(d1)   AS n_d1,   SUM(d1)   AS x_d1,
  COUNT(d3)   AS n_d3,   SUM(d3)   AS x_d3,
  COUNT(d7)   AS n_d7,   SUM(d7)   AS x_d7,
  COUNT(d14)  AS n_d14,  SUM(d14)  AS x_d14,
  COUNT(d21)  AS n_d21,  SUM(d21)  AS x_d21,
  COUNT(d30)  AS n_d30,  SUM(d30)  AS x_d30,
  COUNT(d60)  AS n_d60,  SUM(d60)  AS x_d60,
  COUNT(d90)  AS n_d90,  SUM(d90)  AS x_d90,
  COUNT(d120) AS n_d120, SUM(d120) AS x_d120,
  COUNT(d150) AS n_d150, SUM(d150) AS x_d150,
  COUNT(d180) AS n_d180, SUM(d180) AS x_d180,
  COUNT(d360) AS n_d360, SUM(d360) AS x_d360
FROM ret GROUP BY group_name`;
}

export function buildRevenueQuery(ids: number[], schemas: Schemas, analysisEndPst: string): string {
  const assigned = buildAssignedCTE(ids, schemas);
  return `WITH ${assigned},
rev_raw AS (
  SELECT r.user_id,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(r.purchase_timestamp / 1000), 'America/Los_Angeles') AS purchase_pst,
    r.price
  FROM ${schemas.db}.revenue r
  JOIN valid_users v ON r.user_id = v.user_id
),
rev_in_test AS (
  SELECT r.user_id, SUM(r.price) AS revenue
  FROM rev_raw r
  JOIN assigned a ON r.user_id = a.user_id
  WHERE r.purchase_pst >= a.assign_pst AND r.purchase_pst < a.test_end_pst
  GROUP BY r.user_id
),
rev_pre AS (
  SELECT r.user_id,
    SUM(r.price)                               AS pre_revenue,
    COUNT(*)                                    AS pre_purchase_count,
    MAX(r.price)                                AS pre_max_price,
    COUNT(DISTINCT DATE(r.purchase_pst))        AS pre_purchase_days
  FROM rev_raw r
  JOIN assigned a ON r.user_id = a.user_id
  WHERE DATE(r.purchase_pst) BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
  GROUP BY r.user_id
),
per_user AS (
  SELECT a.user_id, a.group_name,
    COALESCE(t.revenue, 0)            AS revenue,
    COALESCE(p.pre_revenue, 0)        AS pre_revenue,
    COALESCE(p.pre_purchase_count, 0) AS pre_purchase_count,
    COALESCE(p.pre_max_price, 0)      AS pre_max_price,
    COALESCE(p.pre_purchase_days, 0)  AS pre_purchase_days
  FROM assigned a
  LEFT JOIN rev_in_test t ON a.user_id = t.user_id
  LEFT JOIN rev_pre     p ON a.user_id = p.user_id
)
SELECT group_name, revenue, pre_revenue, pre_purchase_count, pre_max_price, pre_purchase_days FROM per_user`;
}

export function buildWagerQuery(ids: number[], schemas: Schemas, useEtl: boolean, dtRange: DtRange, analysisEndPst: string): string {
  const assigned = buildAssignedCTE(ids, schemas);
  if (useEtl) {
    return `WITH ${assigned},
per_user AS (
  SELECT a.user_id, a.group_name,
    COALESCE(SUM(c.coin_sink_default_spin), 0) AS wager
  FROM assigned a
  LEFT JOIN ${schemas.etl}.coin_economy_revise c
    ON a.user_id = c.user_id AND c.date BETWEEN DATE(a.test_start_pst) AND DATE('${analysisEndPst}')
  GROUP BY a.user_id, a.group_name
)
SELECT group_name, wager FROM per_user`;
  }
  const dtStart = dtRange.start, dtEnd = dtRange.end;
  return `WITH ${assigned},
spins AS (
  SELECT s.user_id, NVL(s.bet, 0) AS bet
  FROM ${schemas.events}.server_spin s
  JOIN assigned a ON s.user_id = a.user_id
  WHERE s.ts >= a.test_start_ts_ms AND s.ts < a.test_end_ts_ms
    AND s.type = 'default' AND s.is_freespin = 0
    AND s.dt BETWEEN DATE_SUB(DATE('${dtStart}'), 1) AND DATE_ADD(DATE('${dtEnd}'), 2)
),
per_user AS (
  SELECT a.user_id, a.group_name,
    COALESCE(SUM(s.bet), 0) AS wager
  FROM assigned a LEFT JOIN spins s ON a.user_id = s.user_id
  GROUP BY a.user_id, a.group_name
)
SELECT group_name, wager FROM per_user`;
}

export function buildRoocQuery(ids: number[], schemas: Schemas, useEtl: boolean, dtRange: DtRange, analysisEndPst: string): string {
  const assigned = buildAssignedCTE(ids, schemas);
  const dtStart = dtRange.start;
  const dtEnd   = dtRange.end;
  if (useEtl) {
    return `WITH ${assigned},
daily_login AS (
  SELECT l.user_id, l.date AS event_day
  FROM ${schemas.etl}.login l
  WHERE l.user_id IN (SELECT user_id FROM assigned)
    AND l.date BETWEEN (SELECT MIN(DATE(test_start_pst)) FROM assigned) AND DATE('${analysisEndPst}')
  GROUP BY l.user_id, l.date
),
daily_rooc AS (
  SELECT ev.user_id, TO_DATE(CAST(ev.day AS STRING), 'yyyyMMdd') AS event_day
  FROM ${schemas.events}.client_all_in ev
  WHERE ev.user_id IN (SELECT user_id FROM assigned)
    AND ev.dt BETWEEN DATE_SUB(DATE('${dtStart}'), 1) AND DATE_ADD(DATE('${dtEnd}'), 2)
    AND TO_DATE(CAST(ev.day AS STRING), 'yyyyMMdd')
        BETWEEN (SELECT MIN(DATE(test_start_pst)) FROM assigned) AND DATE('${analysisEndPst}')
  GROUP BY ev.user_id, TO_DATE(CAST(ev.day AS STRING), 'yyyyMMdd')
),
login_agg AS (
  SELECT user_id, COUNT(*) AS login_days
  FROM daily_login
  GROUP BY user_id
),
rooc_agg AS (
  SELECT dl.user_id, COUNT(*) AS rooc_days
  FROM daily_login dl
  JOIN daily_rooc dr ON dl.user_id = dr.user_id AND dl.event_day = dr.event_day
  GROUP BY dl.user_id
),
per_user AS (
  SELECT a.user_id, a.group_name,
    COALESCE(la.login_days, 0) AS login_days,
    COALESCE(ra.rooc_days,  0) AS rooc_days
  FROM assigned a
  LEFT JOIN login_agg la ON a.user_id = la.user_id
  LEFT JOIN rooc_agg  ra ON a.user_id = ra.user_id
)
SELECT group_name, login_days, rooc_days FROM per_user`;
  }
  return `WITH ${assigned},
daily_login AS (
  SELECT l.user_id,
    DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(l.ts / 1000), 'America/Los_Angeles')) AS event_day
  FROM ${schemas.events}.client_login l
  WHERE l.user_id IN (SELECT user_id FROM assigned)
    AND l.ts >= (SELECT MIN(test_start_ts_ms) FROM assigned)
    AND l.ts <  (SELECT MAX(test_end_ts_ms)   FROM assigned)
    AND l.dt BETWEEN DATE_SUB(DATE('${dtStart}'), 1) AND DATE_ADD(DATE('${dtEnd}'), 2)
  GROUP BY l.user_id, DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(l.ts / 1000), 'America/Los_Angeles'))
),
daily_rooc AS (
  SELECT ev.user_id,
    DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ev.ts / 1000), 'America/Los_Angeles')) AS event_day
  FROM ${schemas.events}.client_all_in ev
  WHERE ev.user_id IN (SELECT user_id FROM assigned)
    AND ev.ts >= (SELECT MIN(test_start_ts_ms) FROM assigned)
    AND ev.ts <  (SELECT MAX(test_end_ts_ms)   FROM assigned)
    AND ev.dt BETWEEN DATE_SUB(DATE('${dtStart}'), 1) AND DATE_ADD(DATE('${dtEnd}'), 2)
  GROUP BY ev.user_id, DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(ev.ts / 1000), 'America/Los_Angeles'))
),
login_agg AS (
  SELECT user_id, COUNT(*) AS login_days
  FROM daily_login
  GROUP BY user_id
),
rooc_agg AS (
  SELECT dl.user_id, COUNT(*) AS rooc_days
  FROM daily_login dl
  JOIN daily_rooc dr ON dl.user_id = dr.user_id AND dl.event_day = dr.event_day
  GROUP BY dl.user_id
),
per_user AS (
  SELECT a.user_id, a.group_name,
    COALESCE(la.login_days, 0) AS login_days,
    COALESCE(ra.rooc_days,  0) AS rooc_days
  FROM assigned a
  LEFT JOIN login_agg la ON a.user_id = la.user_id
  LEFT JOIN rooc_agg  ra ON a.user_id = ra.user_id
)
SELECT group_name, login_days, rooc_days FROM per_user`;
}

export function buildDailySegCase(segBoundaries: number[]): string {
  const b = segBoundaries;
  if (b.length >= 3) {
    return `CASE WHEN COALESCE(pr.pre_revenue, 0) <= 0 THEN 'Non-payer'
           WHEN COALESCE(pr.pre_revenue, 0) < ${b[0]} THEN 'Light'
           WHEN COALESCE(pr.pre_revenue, 0) < ${b[1]} THEN 'Mid'
           WHEN COALESCE(pr.pre_revenue, 0) < ${b[2]} THEN 'Heavy'
           ELSE 'Whale' END`;
  } else if (b.length === 2) {
    return `CASE WHEN COALESCE(pr.pre_revenue, 0) <= 0 THEN 'Non-payer'
           WHEN COALESCE(pr.pre_revenue, 0) < ${b[0]} THEN 'Light'
           WHEN COALESCE(pr.pre_revenue, 0) < ${b[1]} THEN 'Mid'
           ELSE 'Whale' END`;
  } else if (b.length === 1) {
    return `CASE WHEN COALESCE(pr.pre_revenue, 0) <= 0 THEN 'Non-payer'
           WHEN COALESCE(pr.pre_revenue, 0) < ${b[0]} THEN 'Light'
           ELSE 'Whale' END`;
  }
  return `CASE WHEN COALESCE(pr.pre_revenue, 0) <= 0 THEN 'Non-payer' ELSE 'Whale' END`;
}

export function buildDailyRevenueQuery(ids: number[], schemas: Schemas, whaleThreshold: number): string {
  const primaryId = ids[0];
  const intersectFilter = ids.length > 1
    ? `AND tag.user_id IN (
    SELECT user_id FROM ${schemas.db}.user_ab_test_tag
    WHERE ab_test_id IN (${ids.join(',')})
    GROUP BY user_id HAVING COUNT(DISTINCT ab_test_id) = ${ids.length}
  )`
    : '';
  const segCase = whaleThreshold > 0
    ? `CASE WHEN COALESCE(rp.pre_revenue, 0) <= 0 THEN 'Non-payer'
           WHEN COALESCE(rp.pre_revenue, 0) >= ${whaleThreshold} THEN 'Whale'
           ELSE 'Non-whale' END`
    : `CASE WHEN COALESCE(rp.pre_revenue, 0) <= 0 THEN 'Non-payer' ELSE 'Non-whale' END`;
  return `WITH
dr_valid_users AS (
  SELECT user_id, register_datetime FROM ${schemas.etl}.user_information
  WHERE is_test_user = FALSE AND is_banned = 0
),
dr_assigned_raw AS (
  SELECT
    tag.user_id, tag.group_id, tag.create_timestamp,
    ab.start_timestamp, ab.end_timestamp,
    v.register_datetime,
    ROW_NUMBER() OVER (PARTITION BY tag.user_id ORDER BY tag.create_timestamp ASC) AS rn
  FROM ${schemas.db}.user_ab_test_tag tag
  JOIN ${schemas.db}.ab_test ab ON tag.ab_test_id = ab.id
  JOIN dr_valid_users v ON tag.user_id = v.user_id
  WHERE tag.ab_test_id = ${primaryId}
  ${intersectFilter}
),
dr_assigned AS (
  SELECT
    user_id, group_id,
    CASE WHEN group_id = 0 THEN 'Control'
         WHEN group_id = 1 THEN 'Treatment'
         ELSE CONCAT('Treatment ', CAST(group_id AS STRING)) END AS group_name,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(create_timestamp / 1000), 'America/Los_Angeles') AS assign_pst,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(end_timestamp   / 1000), 'America/Los_Angeles') AS test_end_pst,
    LEAST(GREATEST(DATEDIFF(
      DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(create_timestamp / 1000), 'America/Los_Angeles')),
      DATE(register_datetime)
    ), 1), 30) AS pre_days
  FROM dr_assigned_raw WHERE rn = 1
),
dr_rev_raw AS (
  SELECT r.user_id,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(r.purchase_timestamp / 1000), 'America/Los_Angeles') AS purchase_pst,
    CAST(r.price AS DOUBLE) AS price
  FROM ${schemas.db}.revenue r
  JOIN dr_valid_users v ON r.user_id = v.user_id
),
dr_rev_pre AS (
  SELECT r.user_id, COALESCE(SUM(r.price), 0) AS pre_revenue
  FROM dr_rev_raw r
  JOIN dr_assigned a ON r.user_id = a.user_id
  WHERE DATE(r.purchase_pst) BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
  GROUP BY r.user_id
),
dr_per_user AS (
  SELECT a.user_id, a.group_name, a.assign_pst, a.test_end_pst,
    ${segCase} AS segment
  FROM dr_assigned a
  LEFT JOIN dr_rev_pre rp ON a.user_id = rp.user_id
),
dr_rev_in_test AS (
  SELECT pu.group_name, pu.segment, pu.user_id, r.price,
    DATEDIFF(DATE(r.purchase_pst), DATE(pu.assign_pst)) AS day_num
  FROM dr_rev_raw r
  JOIN dr_per_user pu ON r.user_id = pu.user_id
  WHERE r.purchase_pst >= pu.assign_pst AND r.purchase_pst < pu.test_end_pst
),
dr_first_pay AS (
  SELECT user_id, MIN(day_num) AS first_pay_day
  FROM dr_rev_in_test
  GROUP BY user_id
),
dr_daily AS (
  SELECT rit.group_name, rit.segment, rit.day_num,
    SUM(rit.price) AS daily_revenue,
    COUNT(DISTINCT CASE WHEN fp.first_pay_day = rit.day_num THEN rit.user_id END) AS new_payers
  FROM dr_rev_in_test rit
  LEFT JOIN dr_first_pay fp ON rit.user_id = fp.user_id
  GROUP BY rit.group_name, rit.segment, rit.day_num
)
SELECT group_name, segment, day_num, daily_revenue, new_payers
FROM dr_daily
ORDER BY group_name, segment, day_num`;
}

export function buildDailyPreRevenueQuery(ids: number[], schemas: Schemas): string {
  const assigned = buildAssignedCTE(ids, schemas);
  return `WITH ${assigned},
pre_rev_raw AS (
  SELECT r.user_id,
    FROM_UTC_TIMESTAMP(FROM_UNIXTIME(r.purchase_timestamp / 1000), 'America/Los_Angeles') AS purchase_pst,
    CAST(r.price AS DOUBLE) AS price
  FROM ${schemas.db}.revenue r
  JOIN valid_users v ON r.user_id = v.user_id
),
group_counts AS (
  SELECT group_name, COUNT(DISTINCT user_id) AS n_users
  FROM assigned
  GROUP BY group_name
),
pre_daily_raw AS (
  SELECT a.group_name, a.user_id,
    DATEDIFF(DATE(r.purchase_pst), DATE(a.assign_pst)) AS day_num,
    r.price
  FROM assigned a
  JOIN pre_rev_raw r ON r.user_id = a.user_id
  WHERE DATE(r.purchase_pst) BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
),
pre_first_pay AS (
  SELECT user_id, MIN(day_num) AS first_pay_day
  FROM pre_daily_raw
  GROUP BY user_id
),
pre_daily AS (
  SELECT pdr.group_name, pdr.day_num,
    SUM(pdr.price) AS daily_revenue,
    COUNT(DISTINCT CASE WHEN pfp.first_pay_day = pdr.day_num THEN pdr.user_id END) AS new_payers
  FROM pre_daily_raw pdr
  LEFT JOIN pre_first_pay pfp ON pdr.user_id = pfp.user_id
  GROUP BY pdr.group_name, pdr.day_num
)
SELECT pd.group_name, pd.day_num, pd.daily_revenue, pd.new_payers, gc.n_users
FROM pre_daily pd
JOIN group_counts gc ON pd.group_name = gc.group_name
ORDER BY pd.group_name, pd.day_num`;
}

function getAppName(gameCode: string): string {
  const code = String(gameCode || 'cvs').toLowerCase();
  if (code === 'cbn') return 'CBN';
  if (code === 'jpm') return 'JPM';
  return 'CVS';
}

export function buildProductTypeCase(p = 'p'): string {
  return `CASE
      WHEN ${p}.item_type = 'Ad Revenue' THEN ${p}.item_type
      WHEN ${p}.shop_type IN ('COIN', 'COIN_BOOSTER') OR ${p}.shop_type LIKE 'COIN_WITH_%' THEN 'Coin'
      WHEN ${p}.shop_type IN ('PIGGY_BANK', 'POG_BOOSTER') THEN 'POG'
      WHEN ${p}.shop_type IN ('DAILY_BONUS', 'MEGA_WHEEL') THEN 'Wheel'
      WHEN ${p}.shop_type = 'VOUCHER' THEN 'Voucher'
      WHEN ${p}.shop_type LIKE '%GEM%' THEN 'Gem'
      WHEN ${p}.shop_type LIKE 'VIP_DEAL%' THEN 'VIP Deal'
      WHEN ${p}.shop_type LIKE 'SEASON_PASS%' THEN 'Epic Pass'
      WHEN ${p}.shop_type = 'TIER_UP' THEN 'Tier Up Deal'
      WHEN ${p}.shop_type = 'CLUB_OFFER' THEN 'Club Deal'
      WHEN ${p}.shop_type = 'DAILY_BOOST' THEN 'Daily Boost'
      WHEN ${p}.shop_type = 'CODA_SHOP' THEN 'Coda Shop'
      WHEN ${p}.shop_type = 'ALL_IN_BONUS' THEN 'FTD'
      WHEN ${p}.shop_type = 'ACTION' THEN
        CASE
          WHEN ${p}.shop_name ILIKE '%inhouse%' AND ${p}.shop_name ILIKE '%ads%' THEN 'Inhouse Ads'
          WHEN ${p}.shop_name LIKE '%ROOC%' AND ${p}.shop_name LIKE '%IAM%' THEN 'ROOC IAM'
          WHEN ${p}.shop_name ILIKE '%smart%' AND ${p}.shop_name LIKE '%IAM%' THEN 'Smart IAM'
          WHEN ${p}.shop_name ILIKE '%first purchase offer%' OR ${p}.shop_name LIKE '%SWRVE%' THEN 'FTD'
          WHEN ${p}.shop_name ILIKE '%instant bonus%' THEN 'INS'
          WHEN ${p}.shop_name ILIKE '%super bonus%' THEN 'SPB'
          WHEN ${p}.shop_name ILIKE '%buy a bonus deal%' THEN 'BAB Deal'
          WHEN ${p}.shop_name ILIKE '%spin deal%' THEN 'Spin Deal'
          WHEN ${p}.shop_name ILIKE '%scratcher%' THEN 'Scratcher Deal'
          WHEN ${p}.shop_name ILIKE '%friend%' OR ${p}.shop_name ILIKE '%social%' THEN 'Friends Deal'
          WHEN ${p}.shop_name ILIKE '%club deal%' THEN 'Club Deal'
          WHEN ${p}.shop_name ILIKE '%card deal%' THEN 'Card Deal'
          WHEN ${p}.shop_name ILIKE '%boss raiders%' THEN 'Boss Raiders Deal'
          WHEN ${p}.shop_name LIKE '%HOG%' THEN 'HOG Deal'
          WHEN ${p}.shop_name ILIKE '%early access%' THEN 'Early Access'
          WHEN ${p}.shop_name ILIKE '%santa%' THEN 'Santa Deal'
          WHEN ${p}.shop_name ILIKE '%coin deal%' THEN 'Coin Deal'
          WHEN ${p}.shop_name ILIKE '%gem deal%' THEN 'Gem Deal'
          WHEN ${p}.shop_name ILIKE '%bucks deal%' THEN 'Bucks Deal'
          WHEN ${p}.shop_name ILIKE '%dynamic offer%' THEN 'Dynamic Offer'
          WHEN ${p}.shop_name ILIKE '%hot offer%' THEN 'Hot Offer'
          WHEN ${p}.shop_name ILIKE '%uplifting deal%' THEN 'Uplifting Deal'
          WHEN ${p}.shop_name ILIKE '%betting deal%' THEN 'Betting Deal'
          WHEN ${p}.item_type = 'Daily Boost' THEN ${p}.item_type
          ELSE ${p}.shop_name
        END
      WHEN ${p}.shop_type = 'SPIN_BOOST' THEN
        CASE
          WHEN ${p}.previous_shop_name ILIKE '%inhouse%' AND ${p}.previous_shop_name ILIKE '%ads%' THEN 'Inhouse Ads'
          WHEN ${p}.previous_shop_name LIKE '%ROOC%' AND ${p}.previous_shop_name LIKE '%IAM%' THEN 'ROOC IAM'
          WHEN ${p}.previous_shop_name ILIKE '%spin deal%' THEN 'Spin Deal'
          ELSE 'Spin Deal'
        END
      WHEN ${p}.shop_type = 'TICKETED_BONUS_BOOSTER' THEN
        CASE
          WHEN ${p}.previous_shop_name ILIKE '%instant bonus%' THEN 'INS'
          WHEN ${p}.previous_shop_name ILIKE '%super bonus%' THEN 'SPB'
          WHEN ${p}.previous_shop_name ILIKE '%buy a bonus deal%' THEN 'BAB Deal'
          ELSE 'INS'
        END
      ELSE
        CASE
          WHEN ${p}.shop_name ILIKE '%wheel%' THEN 'Wheel'
          WHEN ${p}.shop_name ILIKE '%voucher%' THEN 'Voucher'
          WHEN ${p}.shop_name ILIKE '%mission%' AND ${p}.shop_name ILIKE '%deal%' THEN 'Mission Deal'
          WHEN ${p}.shop_name ILIKE '%scratcher%' THEN 'Scratcher Deal'
          WHEN ${p}.shop_name ILIKE '%epic%' AND ${p}.shop_name ILIKE '%miner%' THEN 'Epic Miners'
          WHEN ${p}.shop_name ILIKE '%bucks%' OR ${p}.item_type = 'Bucks' THEN 'Bucks'
          WHEN ${p}.item_type = 'Pot of Gold' THEN 'POG'
          WHEN ${p}.item_type = 'Daily Boost' THEN ${p}.item_type
          WHEN ${p}.item_type = 'Coin Pot of Gold' THEN 'FTD'
          WHEN ${p}.item_type = 'Daily Bonus Wheel' THEN 'Wheel'
          WHEN ${p}.item_type = 'Coin' THEN 'Coin'
          WHEN ${p}.product_name LIKE '%com.bagelcode.slot%' THEN 'Appcharge'
          ELSE ${p}.shop_name
        END
    END`;
}

export function buildProductDailyQuery(ids: number[], schemas: Schemas, gameCode: string, selectedTypes: string[]): string {
  const assigned = buildAssignedCTE(ids, schemas);
  const appName = getAppName(gameCode);
  const ptCase = buildProductTypeCase('p');
  const inList = selectedTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
  return `WITH ${assigned},
purch_raw_typed AS (
  SELECT
    p.user_id,
    CAST(p.price AS DOUBLE) AS price,
    FROM_UTC_TIMESTAMP(p.purchase_datetime, 'America/Los_Angeles') AS purchase_pst,
    ${ptCase} AS raw_type
  FROM bagelcode.company_tableau_etl.for_hourly_purchase_dashboard p
  WHERE p.app_name = '${appName}'
    AND p.item_type != 'Ad Revenue'
    AND DATE(p.purchase_datetime) BETWEEN
      (SELECT DATE_SUB(MIN(DATE(assign_pst)), 1) FROM assigned) AND
      (SELECT DATE_ADD(MAX(DATE(test_end_pst)), 1) FROM assigned)
),
purch_raw AS (
  SELECT user_id, price, purchase_pst,
    CASE WHEN raw_type IN (${inList}) THEN raw_type ELSE 'Others' END AS product_type
  FROM purch_raw_typed
),
purch_joined AS (
  SELECT
    a.group_name,
    pr.product_type,
    pr.user_id,
    DATEDIFF(DATE(pr.purchase_pst), DATE(a.assign_pst)) AS day_num,
    pr.price
  FROM purch_raw pr
  JOIN assigned a ON pr.user_id = a.user_id
  WHERE pr.purchase_pst >= a.assign_pst AND pr.purchase_pst < a.test_end_pst
),
first_pay AS (
  SELECT user_id, product_type, MIN(day_num) AS first_pay_day
  FROM purch_joined
  GROUP BY user_id, product_type
),
daily_agg AS (
  SELECT pj.group_name, pj.product_type, pj.day_num,
    SUM(pj.price) AS daily_revenue,
    COUNT(DISTINCT CASE WHEN fp.first_pay_day = pj.day_num THEN pj.user_id END) AS new_payers
  FROM purch_joined pj
  LEFT JOIN first_pay fp ON pj.user_id = fp.user_id AND pj.product_type = fp.product_type
  GROUP BY pj.group_name, pj.product_type, pj.day_num
)
SELECT group_name, product_type, day_num, daily_revenue, new_payers
FROM daily_agg
ORDER BY group_name, product_type, day_num`;
}

export function buildProductStatsQuery(ids: number[], schemas: Schemas, gameCode: string, selectedTypes: string[]): string {
  const assigned = buildAssignedCTE(ids, schemas);
  const appName = getAppName(gameCode);
  const ptCase = buildProductTypeCase('p');
  const inList = selectedTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(', ');
  return `WITH ${assigned},
purch_raw_typed AS (
  SELECT
    p.user_id,
    CAST(p.price AS DOUBLE) AS price,
    FROM_UTC_TIMESTAMP(p.purchase_datetime, 'America/Los_Angeles') AS purchase_pst,
    ${ptCase} AS raw_type
  FROM bagelcode.company_tableau_etl.for_hourly_purchase_dashboard p
  WHERE p.app_name = '${appName}'
    AND p.item_type != 'Ad Revenue'
    AND DATE(p.purchase_datetime) BETWEEN
      (SELECT DATE_SUB(MIN(DATE(assign_pst)), 1) FROM assigned) AND
      (SELECT DATE_ADD(MAX(DATE(test_end_pst)), 1) FROM assigned)
),
purch_raw AS (
  SELECT user_id, price, purchase_pst,
    CASE WHEN raw_type IN (${inList}) THEN raw_type ELSE 'Others' END AS product_type
  FROM purch_raw_typed
),
purch_in_test AS (
  SELECT
    a.group_name,
    pr.product_type,
    pr.user_id,
    SUM(pr.price) AS user_total_revenue
  FROM purch_raw pr
  JOIN assigned a ON pr.user_id = a.user_id
  WHERE pr.purchase_pst >= a.assign_pst AND pr.purchase_pst < a.test_end_pst
  GROUP BY a.group_name, pr.product_type, pr.user_id
)
SELECT group_name, product_type, user_total_revenue
FROM purch_in_test
ORDER BY group_name, product_type`;
}

export function buildPostRolloutQuery(ids: number[], schemas: Schemas, rolloutPst: string): string {
  const assigned = buildAssignedCTE(ids, schemas);
  return `WITH ${assigned},
post_rev AS (
  SELECT a.user_id, COALESCE(SUM(r.price), 0) AS revenue
  FROM assigned a
  LEFT JOIN (
    SELECT r2.user_id, r2.price
    FROM ${schemas.db}.revenue r2
    JOIN valid_users v ON r2.user_id = v.user_id
    WHERE FROM_UTC_TIMESTAMP(FROM_UNIXTIME(r2.purchase_timestamp / 1000), 'America/Los_Angeles')
      BETWEEN TIMESTAMP('${rolloutPst}') AND TIMESTAMPADD(DAY, 60, TIMESTAMP('${rolloutPst}'))
  ) r ON a.user_id = r.user_id
  GROUP BY a.user_id
),
post_wager AS (
  SELECT a.user_id, COALESCE(SUM(c.coin_sink_default_spin), 0) AS wager
  FROM assigned a
  LEFT JOIN ${schemas.etl}.coin_economy_revise c
    ON a.user_id = c.user_id
   AND c.date BETWEEN DATE('${rolloutPst}') AND DATE_ADD(DATE('${rolloutPst}'), 60)
  GROUP BY a.user_id
)
SELECT a.group_name, pr.revenue, pw.wager
FROM assigned a
JOIN post_rev pr ON a.user_id = pr.user_id
JOIN post_wager pw ON a.user_id = pw.user_id`;
}

export function buildPrePeriodQuery(ids: number[], schemas: Schemas): string {
  const assigned = buildAssignedCTE(ids, schemas);
  // pre-period dt range: up to 30 days before assignment (includes UTC buffer)
  const preStart = `(SELECT DATE_SUB(MIN(DATE(assign_pst)), 31) FROM assigned)`;
  const preEnd   = `(SELECT DATE_ADD(MAX(DATE(assign_pst)), 1) FROM assigned)`;
  return `WITH ${assigned},
pre_wager AS (
  SELECT
    a.user_id, a.group_name,
    COALESCE(SUM(c.coin_sink_default_spin), 0) AS pre_wager
  FROM assigned a
  LEFT JOIN ${schemas.etl}.coin_economy_revise c
    ON a.user_id = c.user_id
   AND c.date BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
  GROUP BY a.user_id, a.group_name
),
pre_rev AS (
  SELECT
    a.user_id, a.group_name,
    COALESCE(SUM(r.price), 0) AS pre_revenue
  FROM assigned a
  LEFT JOIN ${schemas.db}.revenue r
    ON a.user_id = r.user_id
   AND DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(r.purchase_timestamp / 1000), 'America/Los_Angeles'))
       BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
  GROUP BY a.user_id, a.group_name
),
pre_login AS (
  SELECT l.user_id, l.date AS event_day
  FROM ${schemas.etl}.login l
  WHERE l.user_id IN (SELECT user_id FROM assigned)
    AND l.date BETWEEN ${preStart} AND ${preEnd}
  GROUP BY l.user_id, event_day
),
pre_rooc AS (
  SELECT ev.user_id, TO_DATE(CAST(ev.day AS STRING), 'yyyyMMdd') AS event_day
  FROM ${schemas.events}.client_all_in ev
  WHERE ev.user_id IN (SELECT user_id FROM assigned)
    AND ev.dt BETWEEN ${preStart} AND ${preEnd}
    AND TO_DATE(CAST(ev.day AS STRING), 'yyyyMMdd') BETWEEN ${preStart} AND ${preEnd}
  GROUP BY ev.user_id, TO_DATE(CAST(ev.day AS STRING), 'yyyyMMdd')
),
pre_login_filtered AS (
  SELECT pl.user_id, pl.event_day
  FROM pre_login pl
  JOIN assigned a ON pl.user_id = a.user_id
  WHERE pl.event_day BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
),
pre_rooc_filtered AS (
  SELECT pr.user_id, pr.event_day
  FROM pre_rooc pr
  JOIN assigned a ON pr.user_id = a.user_id
  WHERE pr.event_day BETWEEN DATE_SUB(DATE(a.assign_pst), 30) AND DATE_SUB(DATE(a.assign_pst), 1)
),
pre_login_agg AS (
  SELECT user_id, COUNT(*) AS login_days FROM pre_login_filtered GROUP BY user_id
),
pre_rooc_agg AS (
  SELECT pl.user_id, COUNT(*) AS rooc_days
  FROM pre_login_filtered pl
  JOIN pre_rooc_filtered pr ON pl.user_id = pr.user_id AND pl.event_day = pr.event_day
  GROUP BY pl.user_id
),
pre_rooc_per_user AS (
  SELECT a.user_id, a.group_name,
    COALESCE(la.login_days, 0) AS login_days,
    COALESCE(ra.rooc_days,  0) AS rooc_days
  FROM assigned a
  LEFT JOIN pre_login_agg la ON a.user_id = la.user_id
  LEFT JOIN pre_rooc_agg  ra ON a.user_id = ra.user_id
)
SELECT
  pw.group_name,
  COUNT(*) AS n,
  AVG(pw.pre_wager)   AS mean_pre_wager,
  AVG(pr.pre_revenue) AS mean_pre_revenue,
  STDDEV_SAMP(pw.pre_wager)   AS std_pre_wager,
  STDDEV_SAMP(pr.pre_revenue) AS std_pre_revenue,
  COUNT(CASE WHEN pr.pre_revenue > 0 THEN 1 END) AS n_payers,
  AVG(CASE WHEN pr.pre_revenue > 0 THEN pr.pre_revenue ELSE NULL END) AS mean_pre_revenue_per_payer,
  STDDEV_SAMP(CASE WHEN pr.pre_revenue > 0 THEN pr.pre_revenue ELSE NULL END) AS std_pre_revenue_per_payer,
  AVG(CASE WHEN rp.login_days > 0 THEN rp.rooc_days / rp.login_days ELSE NULL END) AS mean_pre_rooc_rate,
  STDDEV_SAMP(CASE WHEN rp.login_days > 0 THEN rp.rooc_days / rp.login_days ELSE NULL END) AS std_pre_rooc_rate
FROM pre_wager pw
JOIN pre_rev pr ON pw.user_id = pr.user_id
JOIN pre_rooc_per_user rp ON pw.user_id = rp.user_id
GROUP BY pw.group_name`;
}

// ---------------------------------------------------------------------------
// Row utilities
// ---------------------------------------------------------------------------

// Parse rows from Databricks response into objects
export function parseRows(result: any): any[] {
  return result.rows || [];
}

export function groupByName(rows: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const row of rows) map[row.group_name] = row;
  return map;
}

// ---------------------------------------------------------------------------
// Main analysis entry point
// ---------------------------------------------------------------------------

export async function runAbtestAnalysis({
  abTestId,
  gameCode,
  selectedProductTypes,
  runDatabricksStatement,
}: RunAbtestAnalysisParams): Promise<any> {
  const ids = String(abTestId || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => n && !isNaN(n))
    .sort((a, b) => a - b); // ascending: lowest ID is primary (assign_ts, test_start/end reference)

  if (!ids.length) {
    throw Object.assign(new Error('Invalid A/B Test ID.'), { statusCode: 400 });
  }
  const primaryId = ids[0];

  const schemas = getSchemas(gameCode ?? 'cvs');

  // Step 1: Meta (based on primary ID)
  const metaResult = await runDatabricksStatement({ statement: buildMetaQuery(primaryId, schemas), parameters: [], rowLimit: 5 });
  const metaRows = parseRows(metaResult);
  if (!metaRows.length) {
    throw Object.assign(new Error(`A/B Test ID ${primaryId} not found.`), { statusCode: 404 });
  }
  const meta = metaRows[0];
  const duration = Number(meta.duration_days) || 0;
  const useEtl = duration > 60;

  // dt partition filter UTC date calculation (event tables partitioned by dt=UTC)
  function addDays(isoDate: string, n: number): string {
    const d = new Date(isoDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  const startUtc = new Date(Number(meta.test_start_ts_ms)).toISOString().slice(0, 10);
  const endUtc   = new Date(Number(meta.test_end_ts_ms)).toISOString().slice(0, 10);
  const dtRange: DtRange = {
    start:  startUtc,
    end:    endUtc,
    retEnd: addDays(startUtc, Math.min(duration, 360) + 2), // retention max D360 + 2-day buffer
  };

  // analysisEndPst = test_end_pst (= rollout reference)
  const analysisEndPst = String(meta.test_end_pst).slice(0, 10);

  // Step 2-5: Run remaining queries in parallel
  const [groupsResult, retResult, revResult, preResult] = await Promise.all([
    runDatabricksStatement({ statement: buildGroupsQuery(ids, schemas), parameters: [], rowLimit: 20 }),
    runDatabricksStatement({ statement: buildRetentionQuery(ids, schemas, dtRange), parameters: [], rowLimit: 20 }),
    runDatabricksStatement({ statement: buildRevenueQuery(ids, schemas, analysisEndPst), parameters: [], rowLimit: 100000 }),
    runDatabricksStatement({ statement: buildPrePeriodQuery(ids, schemas), parameters: [], rowLimit: 20 }),
  ]);

  const groups = parseRows(groupsResult);
  const retRows  = groupByName(parseRows(retResult));
  const preRows  = groupByName(parseRows(preResult));

  // Identify control/treatment groups
  const controlName = groups.find((g: any) => g.group_id == 0)?.group_name || 'Control';
  const treatmentNames = groups.filter((g: any) => g.group_id != 0).map((g: any) => g.group_name);

  // SRM check — based on population_weight expected values
  let srmWarning: string | null = null;
  if (groups.length >= 2) {
    // population_weight parsing: "[75,25]" or "[1,1]" format
    let weights: number[] | null = null;
    try {
      const raw = meta.population_weight;
      if (raw) weights = JSON.parse(String(raw).replace(/'/g, '"'));
    } catch { weights = null; }

    const total = groups.reduce((s: number, g: any) => s + Number(g.n), 0);
    let expectedArr: number[];
    if (Array.isArray(weights) && weights.length === groups.length) {
      const weightTotal = weights.reduce((s: number, w: any) => s + Number(w), 0);
      // groups sorted ascending by group_id
      const sortedGroups = [...groups].sort((a, b) => Number(a.group_id) - Number(b.group_id));
      expectedArr = sortedGroups.map((_: any, i: number) => total * Number(weights![i]) / weightTotal);
    } else {
      // fallback: equal distribution
      expectedArr = groups.map(() => total / groups.length);
    }

    const sortedGroups = [...groups].sort((a, b) => Number(a.group_id) - Number(b.group_id));
    const chiSq = sortedGroups.reduce((s: number, g: any, i: number) => s + Math.pow(Number(g.n) - expectedArr[i], 2) / expectedArr[i], 0);
    const df = groups.length - 1;
    // chi-sq critical value: df=1 → 3.841, df=2 → 5.991, df=3 → 7.815
    const criticals = [0, 3.841, 5.991, 7.815, 9.488];
    const critical = criticals[df] || 3.841 * df;
    const expectedRatio = Array.isArray(weights) ? weights.join(':') : '균등';
    if (chiSq > critical) {
      srmWarning = `SRM 감지됨 (χ²=${chiSq.toFixed(2)}, 기대비율 ${expectedRatio}). 할당 불균형을 확인하세요.`;
    }
  }

  // Group order (ascending group_id)
  const allGroupNames: string[] = groups
    .slice()
    .sort((a: any, b: any) => Number(a.group_id) - Number(b.group_id))
    .map((g: any) => g.group_name);

  // Retention aggregation by group
  const groupRetention: Record<string, any> = {};
  for (const row of parseRows(retResult)) groupRetention[row.group_name] = row;

  // Pre-period aggregation by group
  const groupPrePeriod: Record<string, any> = {};
  for (const row of parseRows(preResult)) groupPrePeriod[row.group_name] = row;

  function groupRawValues(rows: any[], key: string): Record<string, number[]> {
    const map: Record<string, number[]> = {};
    for (const row of rows) {
      if (!map[row.group_name]) map[row.group_name] = [];
      map[row.group_name].push(Number(row[key]));
    }
    return map;
  }

  // Revenue raw → percentile segmentation
  const revRawRows = parseRows(revResult);
  const testMode = detectTestMode(revRawRows);
  const segmentLabels = ['Whale', 'Non-whale', 'Non-payer'];
  const { segments: segmentAssignments, whaleThreshold } = revRawRows.length >= 3
    ? percentileSegment(revRawRows)
    : { segments: revRawRows.map(() => 'Non-payer'), whaleThreshold: 0 };
  const segmentedRows = revRawRows.map((r: any, i: number) => ({ ...r, segment: segmentAssignments[i] }));
  const segmentOrder = segmentLabels;

  const segDist: Record<string, Record<string, number>> = {};
  for (const seg of segmentOrder) segDist[seg] = {};
  for (const row of segmentedRows) {
    const s = row.segment;
    if (!segDist[s]) segDist[s] = {};
    segDist[s][row.group_name] = (segDist[s][row.group_name] || 0) + 1;
  }

  const revByGroup: Record<string, number[]> = {};
  for (const name of allGroupNames) {
    revByGroup[name] = segmentedRows.filter((r: any) => r.group_name === name).map((r: any) => Number(r.revenue));
  }

  // CUPED: θ = Cov(Y_intest, Y_pre) / Var(Y_pre), pooled across all users
  const allN = segmentedRows.length;
  const meanPre    = segmentedRows.reduce((s: number, r: any) => s + Number(r.pre_revenue), 0) / (allN || 1);
  const meanIntest = segmentedRows.reduce((s: number, r: any) => s + Number(r.revenue), 0)     / (allN || 1);
  const covYX  = segmentedRows.reduce((s: number, r: any) => s + (Number(r.revenue) - meanIntest) * (Number(r.pre_revenue) - meanPre), 0) / (allN || 1);
  const varX   = segmentedRows.reduce((s: number, r: any) => s + (Number(r.pre_revenue) - meanPre) ** 2, 0) / (allN || 1);
  const varY   = segmentedRows.reduce((s: number, r: any) => s + (Number(r.revenue) - meanIntest) ** 2, 0) / (allN || 1);
  const theta  = varX > 1e-10 ? covYX / varX : 0;
  const rho    = (varX > 1e-10 && varY > 1e-10) ? covYX / Math.sqrt(varX * varY) : 0;
  const varianceReduction = +(rho ** 2 * 100).toFixed(1); // CUPED variance reduction (%)
  // Adjusted per-user revenue: Y_adj_i = Y_intest_i - θ * (Y_pre_i - mean_pre)
  const cuperByGroup: Record<string, number[]> = {};
  for (const name of allGroupNames) {
    cuperByGroup[name] = segmentedRows
      .filter((r: any) => r.group_name === name)
      .map((r: any) => Number(r.revenue) - theta * (Number(r.pre_revenue) - meanPre));
  }

  // Segment-based pre_revenue min/max and approximate SQL CASE WHEN boundary derivation
  const segRevMap: Record<string, number[]> = {};
  for (const seg of segmentLabels) segRevMap[seg] = [];
  segmentedRows.forEach((r: any) => { const v = Number(r.pre_revenue); if (v > 0 && segRevMap[r.segment]) segRevMap[r.segment].push(v); });

  // Segment min/max (for display)
  const segmentStats: Record<string, { min: number; max: number }> = {};
  for (const seg of segmentLabels) {
    const vals = segRevMap[seg];
    if (vals.length) {
      segmentStats[seg] = { min: +Math.min(...vals).toFixed(2), max: +Math.max(...vals).toFixed(2) };
    }
  }

  // Post-rollout + Daily revenue (parallel)
  const [postResult, dailyRevResult, dailyPreRevResult, productDailyResult, productStatsResult] = await Promise.all([
    runDatabricksStatement({ statement: buildPostRolloutQuery(ids, schemas, analysisEndPst), parameters: [], rowLimit: 100000 }),
    runDatabricksStatement({ statement: buildDailyRevenueQuery(ids, schemas, whaleThreshold), parameters: [], rowLimit: 50000 }),
    runDatabricksStatement({ statement: buildDailyPreRevenueQuery(ids, schemas), parameters: [], rowLimit: 50000 }),
    selectedProductTypes?.length
      ? runDatabricksStatement({ statement: buildProductDailyQuery(ids, schemas, gameCode ?? 'cvs', selectedProductTypes), parameters: [], rowLimit: 200000 })
      : Promise.resolve({ rows: [] }),
    selectedProductTypes?.length
      ? runDatabricksStatement({ statement: buildProductStatsQuery(ids, schemas, gameCode ?? 'cvs', selectedProductTypes), parameters: [], rowLimit: 500000 })
      : Promise.resolve({ rows: [] }),
  ]);

  const dailyRows = parseRows(dailyRevResult);
  const dailyPreRevRows = parseRows(dailyPreRevResult);
  const productDailyRows = parseRows(productDailyResult);
  const productStatsRows = parseRows(productStatsResult);

  console.log(`[dailyRev] rows=${dailyRows.length}`);
  console.log(`[dailyPreRev] rows=${dailyPreRevRows.length}`);
  if (dailyRows.length === 0) {
    console.log('[dailyRev SQL]\n' + buildDailyRevenueQuery(ids, schemas, whaleThreshold));
  }

  const postRevByGroup = groupRawValues(parseRows(postResult), 'revenue');

  // All group-pair statistical tests
  const DAYS_LIST = ['d1', 'd3', 'd7', 'd14', 'd21', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180', 'd360'];
  const pairRevenue: Record<string, any> = {};
  const pairRetention: Record<string, any> = {};
  const pairPrePeriod: Record<string, any> = {};
  const pairPostRollout: Record<string, any> = {};
  const pairSegmentEffects: Record<string, any> = {};

  for (let i = 0; i < allGroupNames.length; i++) {
    for (let j = i + 1; j < allGroupNames.length; j++) {
      const a = allGroupNames[i], b = allGroupNames[j];
      const key = `${a}|${b}`;

      // Revenue
      const aRevVals = revByGroup[a] || [], bRevVals = revByGroup[b] || [];
      const aRev = computeStats(aRevVals), bRev = computeStats(bRevVals);
      const aCuper = cuperByGroup[a] || [], bCuper = cuperByGroup[b] || [];
      pairRevenue[key] = {
        a: aRev, b: bRev,
        allUserTest:   bootstrapMeanDiff(aRevVals, bRevVals),
        payerRateTest: propZTest(aRev.n, aRev.nonZeroCount, bRev.n, bRev.nonZeroCount),
        payerOnlyTest: bootstrapMeanDiff(aRevVals.filter(v => v > 0), bRevVals.filter(v => v > 0)),
        cuperTest: bootstrapMeanDiff(aCuper, bCuper),
        cuperMeans: {
          a: aCuper.length ? +(aCuper.reduce((s, v) => s + v, 0) / aCuper.length).toFixed(2) : 0,
          b: bCuper.length ? +(bCuper.reduce((s, v) => s + v, 0) / bCuper.length).toFixed(2) : 0,
        },
      };

      // Retention
      const ra = groupRetention[a], rb = groupRetention[b];
      pairRetention[key] = {};
      for (const d of DAYS_LIST) {
        const na = Number(ra?.[`n_${d}`] || 0), xa = Number(ra?.[`x_${d}`] || 0);
        const nb = Number(rb?.[`n_${d}`] || 0), xb = Number(rb?.[`x_${d}`] || 0);
        pairRetention[key][d] = {
          a_rate: na ? +(xa / na * 100).toFixed(2) : null,
          b_rate: nb ? +(xb / nb * 100).toFixed(2) : null,
          test: propZTest(na, xa, nb, xb),
        };
      }

      // Pre-period
      const pa = groupPrePeriod[a], pb = groupPrePeriod[b];
      const na2 = Number(pa?.n || 0), nb2 = Number(pb?.n || 0);
      const npa = Number(pa?.n_payers || 0), npb = Number(pb?.n_payers || 0);
      pairPrePeriod[key] = {
        revenue: {
          a: +Number(pa?.mean_pre_revenue || 0).toFixed(2),
          b: +Number(pb?.mean_pre_revenue || 0).toFixed(2),
          test: welchTTest(na2, Number(pa?.mean_pre_revenue || 0), Number(pa?.std_pre_revenue || 0),
                           nb2, Number(pb?.mean_pre_revenue || 0), Number(pb?.std_pre_revenue || 0)),
        },
        payerRate: {
          a: na2 ? +(npa / na2 * 100).toFixed(2) : 0,
          b: nb2 ? +(npb / nb2 * 100).toFixed(2) : 0,
          test: propZTest(na2, npa, nb2, npb),
        },
        revenuePerPayer: {
          a: +Number(pa?.mean_pre_revenue_per_payer || 0).toFixed(2),
          b: +Number(pb?.mean_pre_revenue_per_payer || 0).toFixed(2),
          test: welchTTest(npa, Number(pa?.mean_pre_revenue_per_payer || 0), Number(pa?.std_pre_revenue_per_payer || 0),
                           npb, Number(pb?.mean_pre_revenue_per_payer || 0), Number(pb?.std_pre_revenue_per_payer || 0)),
        },
      };

      // Post-rollout
      const aPostVals = postRevByGroup[a] || [], bPostVals = postRevByGroup[b] || [];
      const aPost = computeStats(aPostVals), bPost = computeStats(bPostVals);
      pairPostRollout[key] = {
        period: `${analysisEndPst} ~ ${addDays(analysisEndPst, 60)}`,
        a: aPost, b: bPost,
        allUserTest:   bootstrapMeanDiff(aPostVals, bPostVals),
        payerRateTest: propZTest(aPost.n, aPost.nonZeroCount, bPost.n, bPost.nonZeroCount),
      };

      // Segment effects
      pairSegmentEffects[key] = {};
      for (const seg of segmentOrder) {
        const aVals = segmentedRows.filter((r: any) => r.group_name === a && r.segment === seg).map((r: any) => Number(r.revenue));
        const bVals = segmentedRows.filter((r: any) => r.group_name === b && r.segment === seg).map((r: any) => Number(r.revenue));
        const aStats = computeStats(aVals), bStats = computeStats(bVals);
        // Whale: raw bootstrap / Non-whale: log scale bootstrap / Non-payer: payer rate only
        let test: any = null;
        if (seg === 'Whale') {
          test = bootstrapMeanDiff(aVals, bVals);
        } else if (seg === 'Non-whale' || seg === 'Non-payer') {
          test = bootstrapMeanDiff(aVals.map(v => Math.log1p(v)), bVals.map(v => Math.log1p(v)));
        }
        pairSegmentEffects[key][seg] = {
          a: aStats, b: bStats,
          test,
          payerRateTest: propZTest(aStats.n, aStats.nonZeroCount, bStats.n, bStats.nonZeroCount),
        };
      }
    }
  }

  // Segment revenue by group
  const groupSegmentRevenue: Record<string, any> = {};
  for (const name of allGroupNames) {
    groupSegmentRevenue[name] = {};
    for (const seg of segmentOrder) {
      const vals = segmentedRows.filter((r: any) => r.group_name === name && r.segment === seg).map((r: any) => Number(r.revenue));
      const s = computeStats(vals);
      groupSegmentRevenue[name][seg] = { n: s.n, mean: +s.mean.toFixed(2) };
    }
  }

  // Group summary for ranking
  const groupSummary: Record<string, any> = {};
  for (const name of allGroupNames) {
    const stats = computeStats(revByGroup[name] || []);
    const ret = groupRetention[name];
    const retention: Record<string, number | null> = {};
    for (const d of DAYS_LIST) {
      const nd = Number(ret?.[`n_${d}`] || 0);
      retention[d] = nd ? +(Number(ret?.[`x_${d}`] || 0) / nd * 100).toFixed(2) : null;
    }
    const preRow = groupPrePeriod[name];
    groupSummary[name] = {
      n: Number(groups.find((g: any) => g.group_name === name)?.n || 0),
      preRevPerUser: preRow ? +Number(preRow.mean_pre_revenue || 0).toFixed(2) : null,
      revPerUser: stats.mean,
      payerRate: stats.n ? +(stats.nonZeroCount / stats.n * 100).toFixed(2) : 0,
      retention,
    };
  }

  // Product breakdown: pair effects from aggregate stats
  const allProductTypes = [...new Set(productStatsRows.map((r: any) => r.product_type))].filter(Boolean).sort() as string[];
  // Per-user product revenue arrays (purchasers only → zero-padded later)
  const productUserRevenue: Record<string, Record<string, number[]>> = {};
  for (const r of productStatsRows) {
    if (!productUserRevenue[r.group_name]) productUserRevenue[r.group_name] = {};
    if (!productUserRevenue[r.group_name][r.product_type]) productUserRevenue[r.group_name][r.product_type] = [];
    productUserRevenue[r.group_name][r.product_type].push(Number(r.user_total_revenue));
  }

  const pairProductEffects: Record<string, any> = {};
  for (let i = 0; i < allGroupNames.length; i++) {
    for (let j = i + 1; j < allGroupNames.length; j++) {
      const a = allGroupNames[i], b = allGroupNames[j];
      const key = `${a}|${b}`;
      const nA = Number(groups.find((g: any) => g.group_name === a)?.n || 0);
      const nB = Number(groups.find((g: any) => g.group_name === b)?.n || 0);
      pairProductEffects[key] = {};
      for (const pt of allProductTypes) {
        const aRaw = productUserRevenue[a]?.[pt] || [];
        const bRaw = productUserRevenue[b]?.[pt] || [];
        const npA = aRaw.length, npB = bRaw.length;
        // Full assigned-user basis (non-purchasers = 0)
        const aFull = nA > npA ? [...aRaw, ...Array(nA - npA).fill(0)] : aRaw;
        const bFull = nB > npB ? [...bRaw, ...Array(nB - npB).fill(0)] : bRaw;
        const meanA = aFull.length ? aFull.reduce((s, v) => s + v, 0) / aFull.length : 0;
        const meanB = bFull.length ? bFull.reduce((s, v) => s + v, 0) / bFull.length : 0;
        pairProductEffects[key][pt] = {
          a: { n: nA, nPayers: npA, mean: +meanA.toFixed(4), payerRate: nA ? +(npA / nA * 100).toFixed(2) : 0 },
          b: { n: nB, nPayers: npB, mean: +meanB.toFixed(4), payerRate: nB ? +(npB / nB * 100).toFixed(2) : 0 },
          test: bootstrapMeanDiff(aFull, bFull),
          payerRateTest: propZTest(nA, npA, nB, npB),
        };
      }
    }
  }

  return {
    meta: {
      id: meta.id,
      name: meta.test_name || `AB Test ${primaryId}`,
      type: meta.type,
      startPst: meta.test_start_pst,
      endPst: meta.test_end_pst,
      analysisEndPst,
      durationDays: duration,
      useEtl,
      gameCode: gameCode || 'cvs',
      populationWeight: meta.population_weight || null,
      dtRange,
    },
    groups,
    srmWarning,
    controlName,
    allGroupNames,
    groupSummary,
    pairRevenue,
    pairRetention,
    pairPrePeriod,
    pairPostRollout,
    segmentAnalysis: {
      testMode,
      segmentOrder,
      segDist,
      pairSegmentEffects,
      groupSegmentRevenue,
      whaleThreshold: +whaleThreshold.toFixed(2),
      segmentStats,
    },
    cuperTheta: +theta.toFixed(4),
    cuperRho: +rho.toFixed(4),
    cuperVarianceReduction: varianceReduction,
    dailyRevRows: dailyRows,
    dailyPreRevRows,
    dailyProductRows: productDailyRows,
    productAnalysis: { allProductTypes, pairProductEffects },
  };
}
