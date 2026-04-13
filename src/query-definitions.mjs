import "./env-loader.mjs";
import { fullyQualifiedView, getRuntimeConfig } from "./runtime-config.mjs";
import { getNotesConfig } from "./notes-config.mjs";

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function dynamicDigits(value) {
  const absolute = Math.abs(Number(value || 0));
  if (absolute < 10) {
    return 2;
  }
  if (absolute < 100) {
    return 1;
  }
  return 0;
}

function formatMetricNumber(value) {
  return formatNumber(value, dynamicDigits(value));
}

function formatMetricCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dynamicDigits(value),
    minimumFractionDigits: dynamicDigits(value)
  }).format(value);
}

function formatMetricPercent(value) {
  return `${formatNumber(value, 2)}%`;
}

function compareWindowDetail(current, previous) {
  if (!Number.isFinite(previous) || Math.abs(previous) < 0.000001) {
    return "n/a";
  }
  const change = percentChange(previous, current);
  const sign = change > 0 ? "+" : "";
  return `${sign}${formatNumber(change, 2)}%`;
}

function compareWindowMeta(current, previous) {
  if (!Number.isFinite(previous) || Math.abs(previous) < 0.000001) {
    return { detail: "n/a", tone: "neutral" };
  }
  const change = percentChange(previous, current);
  return {
    detail: `${change > 0 ? "+" : ""}${formatNumber(change, 2)}%`,
    tone: change > 0 ? "up" : change < 0 ? "down" : "neutral"
  };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function offsetDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function losAngelesDate(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  const day = parts.find(part => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function latestFullyBakedDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return losAngelesDate(date);
}

function latestFullyBakedCohortDate(lagDays = 0) {
  return shiftIsoDate(latestFullyBakedDate(), -lagDays);
}

function shiftIsoDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function clampEndDate(endDate) {
  const latest = latestFullyBakedDate();
  return endDate > latest ? latest : endDate;
}

function dateRange(startDate, endDate, stepDays = 1) {
  const values = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    values.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + stepDays);
  }

  return values;
}

function seededNumber(seed) {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return (hash % 1000) / 1000;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(values, windowSize) {
  if (values.length < windowSize) {
    return average(values);
  }
  return average(values.slice(-windowSize));
}

function percentChange(from, to) {
  if (!from) {
    return 0;
  }
  return ((to - from) / from) * 100;
}

function linearSlope(values) {
  if (values.length < 2) {
    return 0;
  }
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = average(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < n; index += 1) {
    numerator += (index - meanX) * (values[index] - meanY);
    denominator += (index - meanX) ** 2;
  }
  return denominator ? numerator / denominator : 0;
}

function seriesDiagnostics(rows, { dateKey, valueKey }) {
  if (!rows.length) {
    return {
      largestDrop: null,
      largestRise: null,
      trendPct: 0,
      shortForecast: null,
      recentMean: 0
    };
  }
  let largestDrop = null;
  let largestRise = null;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = Number(rows[index - 1][valueKey] || 0);
    const current = Number(rows[index][valueKey] || 0);
    const deltaPct = percentChange(previous, current);
    if (!largestDrop || deltaPct < largestDrop.deltaPct) {
      largestDrop = {
        date: rows[index][dateKey],
        deltaPct,
        currentValue: current
      };
    }
    if (!largestRise || deltaPct > largestRise.deltaPct) {
      largestRise = {
        date: rows[index][dateKey],
        deltaPct,
        currentValue: current
      };
    }
  }
  const values = rows.map(row => Number(row[valueKey] || 0));
  const firstHalf = values.slice(0, Math.max(1, Math.floor(values.length / 2)));
  const secondHalf = values.slice(Math.max(1, Math.floor(values.length / 2)));
  const trendPct = percentChange(average(firstHalf), average(secondHalf));
  const slope = linearSlope(values);
  const forecast = values[values.length - 1] + slope * 3;
  return {
    largestDrop,
    largestRise,
    trendPct,
    shortForecast: forecast,
    recentMean: movingAverage(values, Math.min(7, values.length))
  };
}

function strongestAbsoluteShift(rows, shiftKey) {
  return [...rows]
    .filter(row => row[shiftKey] !== null && row[shiftKey] !== undefined)
    .sort((left, right) => Math.abs(Number(right[shiftKey] || 0)) - Math.abs(Number(left[shiftKey] || 0)))[0];
}

function forecastDirection(forecast, currentValue) {
  if (forecast === null || forecast === undefined) {
    return "flat";
  }
  const delta = percentChange(Number(currentValue || 0), Number(forecast || 0));
  if (delta > 2) {
    return "up";
  }
  if (delta < -2) {
    return "down";
  }
  return "flat";
}

function forecastDirectionKo(forecast, currentValue) {
  const direction = forecastDirection(forecast, currentValue);
  if (direction === "up") {
    return "상승 쪽";
  }
  if (direction === "down") {
    return "하락 쪽";
  }
  return "보합";
}

function formatPercentPoint(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function describeTrend(value) {
  const rounded = Math.abs(value).toFixed(1);
  if (value > 1) {
    return `+${rounded}%`;
  }
  if (value < -1) {
    return `-${rounded}%`;
  }
  return "flat";
}

function describeTrendKo(value) {
  const rounded = Math.abs(value).toFixed(1);
  if (value > 1) {
    return `${rounded}% 상승`;
  }
  if (value < -1) {
    return `${rounded}% 하락`;
  }
  return "보합";
}

function buildTrendRows(params) {
  const base = `${params.gameCode}-${params.region}-${params.grain}`;
  return dateRange(params.startDate, params.endDate, params.grain === "week" ? 7 : 1).map((metricDate, index) => {
    const seed = seededNumber(`${base}-${metricDate}`);
    const activeUsers = Math.round(16000 + index * 110 + seed * 3500);
    const sessionCount = Math.round(activeUsers * (1.8 + seed * 0.55));
    const payers = Math.round(activeUsers * (0.043 + seed * 0.016));
    const grossRevenue = Math.round(payers * (14 + seed * 9));
    return {
      metric_date: metricDate,
      active_users: activeUsers,
      session_count: sessionCount,
      payers,
      gross_revenue: grossRevenue
    };
  });
}

function buildSegmentRows(params) {
  const dimensionValues = {
    region: ["KR", "US", "JP", "TW", "SEA"],
    platform: ["iOS", "Android", "PC"],
    channel: ["Organic", "Paid UA", "Creator", "Cross Promo"]
  }[params.dimension];

  return dimensionValues.map((dimensionValue, index) => {
    const seed = seededNumber(`${params.gameCode}-${params.startDate}-${dimensionValue}`);
    const activeUsers = Math.round(5000 + seed * 12000 + index * 700);
    const payers = Math.round(activeUsers * (0.038 + seed * 0.018));
    const grossRevenue = Math.round(payers * (16 + seed * 12));
    return {
      segment_key: dimensionValue,
      active_users: activeUsers,
      payers,
      gross_revenue: grossRevenue,
      arppu: Number((grossRevenue / Math.max(payers, 1)).toFixed(2))
    };
  });
}

function buildRetentionRows(params) {
  return dateRange(params.startDate, params.endDate, 7).map((cohortDate, index) => {
    const seed = seededNumber(`${params.gameCode}-${params.region}-${cohortDate}`);
    const d1 = Number((0.34 + seed * 0.05 - index * 0.002).toFixed(3));
    const d7 = Number((0.15 + seed * 0.04 - index * 0.0015).toFixed(3));
    const d30 = Number((0.07 + seed * 0.025 - index * 0.001).toFixed(3));
    return {
      cohort_date: cohortDate,
      d1_retention: Math.max(d1, 0.18),
      d7_retention: Math.max(d7, 0.08),
      d30_retention: Math.max(d30, 0.03)
    };
  });
}

function buildTopSpenderRows() {
  return Array.from({ length: 25 }, (_, index) => {
    const seed = seededNumber(`spender-${index + 1}`);
    return {
      user_id: `user_${String(index + 1).padStart(4, "0")}`,
      nickname: `Whale-${index + 1}`,
      country: ["KR", "US", "JP", "TW", "SEA"][index % 5],
      lifetime_spend: Math.round(15000 - index * 320 + seed * 900),
      install_date: isoDate(new Date(Date.UTC(2025, 0, index + 1))),
      last_login_at: `2026-03-${String((index % 9) + 1).padStart(2, "0")} 11:2${index % 6}:00`,
      is_test_user: false,
      is_banned: 0
    };
  });
}

function buildRevenueRows(params) {
  return dateRange(params.startDate, params.endDate).map((metricDate, index) => {
    const seed = seededNumber(`revenue-${metricDate}`);
    const purchases = Math.round(1900 + seed * 900 + index * 11);
    const payers = Math.round(1100 + seed * 420 + index * 7);
    const revenue = Math.round(14000 + seed * 4800 + index * 165);
    return {
      purchase_date: metricDate,
      purchase_count: purchases,
      payers,
      revenue,
      arppu: Number((revenue / Math.max(payers, 1)).toFixed(2))
    };
  });
}

function buildRoocRows(params) {
  return dateRange(params.startDate, params.endDate).map((metricDate, index) => {
    const seed = seededNumber(`rooc-${metricDate}`);
    const dau = Math.round(98000 + seed * 9000 + index * 120);
    const roocUsers = Math.round(dau * (0.038 + seed * 0.012));
    return {
      metric_date: metricDate,
      dau,
      rooc_users: roocUsers,
      rooc_rate: Number(((roocUsers / Math.max(dau, 1)) * 100).toFixed(2))
    };
  });
}

function buildLoginRetentionRows(params) {
  return dateRange(params.startDate, params.endDate, 7).map((cohortDate, index) => {
    const seed = seededNumber(`login-retention-${cohortDate}`);
    const cohortUsers = Math.round(5200 + seed * 1400 - index * 70);
    const d1 = Number((0.41 + seed * 0.05 - index * 0.003).toFixed(3));
    const d7 = Number((0.21 + seed * 0.04 - index * 0.002).toFixed(3));
    const d30 = Number((0.09 + seed * 0.025 - index * 0.001).toFixed(3));
    return {
      cohort_date: cohortDate,
      cohort_users: Math.max(cohortUsers, 1000),
      d1_retention: Math.max(d1, 0.18),
      d7_retention: Math.max(d7, 0.08),
      d30_retention: Math.max(d30, 0.03)
    };
  });
}

function buildReloginRows(params) {
  return dateRange(params.startDate, params.endDate).map((metricDate, index) => {
    const seed = seededNumber(`relogin-${metricDate}`);
    const dau = Math.round(102000 + seed * 8000 + index * 85);
    const reloginUsers = Math.round(dau * (0.34 + seed * 0.06 - index * 0.001));
    return {
      metric_date: metricDate,
      dau,
      relogin_users: reloginUsers,
      relogin_rate: Number(((reloginUsers / Math.max(dau, 1)) * 100).toFixed(2))
    };
  });
}

function buildChurnRows(params) {
  return dateRange(params.startDate, params.endDate).map((metricDate, index) => {
    const seed = seededNumber(`churn-${metricDate}`);
    const dau = Math.round(102000 + seed * 8000 + index * 85);
    const churnUsers = Math.round(dau * (0.28 + seed * 0.05 + index * 0.001));
    return {
      metric_date: metricDate,
      dau,
      churn_users: churnUsers,
      churn_rate: Number(((churnUsers / Math.max(dau, 1)) * 100).toFixed(2))
    };
  });
}

function buildSummaryAndInsights({ rows, audit, mode, headline, metrics, insights, visualization, table }) {
  return {
    headline,
    summaryCards: metrics,
    insights,
    visualization,
    table,
    audit: {
      ...audit,
      source: audit?.source || mode,
      rowCount: audit?.rowCount || rows.length
    }
  };
}

function buildEmptyReport(mode, audit, headline, message, tableColumns, visualization) {
  return {
    headline,
    summaryCards: [
      { label: "Rows", value: "0", detail: "No data returned" },
      { label: "Source", value: mode.toUpperCase(), detail: "Gateway response" },
      { label: "Status", value: "Empty", detail: "Adjust filters or serving view coverage" }
    ],
    insights: [message],
    visualization,
    table: {
      columns: tableColumns,
      rows: []
    },
    audit: {
      ...audit,
      source: audit?.source || mode,
      rowCount: 0
    }
  };
}

function clampRegion(region) {
  const allowed = ["ALL", "KR", "US", "JP", "TW", "SEA"];
  return allowed.includes(region) ? region : "ALL";
}

function clampDimension(dimension) {
  const allowed = ["region", "platform", "channel"];
  return allowed.includes(dimension) ? dimension : "region";
}

function clampGrain(grain) {
  return grain === "week" ? "week" : "day";
}

function buildEligibleUsersCte() {
  return `
eligible_users AS (
  SELECT DISTINCT user_id
  FROM cvs.v3_etl.user_information
  WHERE is_test_user = FALSE
    AND is_banned = 0
)
`.trim();
}

function buildUserSegmentCtes(endDateParam = ":end_date", purchaseDateSql = "DATE(FROM_UTC_TIMESTAMP(FROM_UNIXTIME(CAST(r.purchase_timestamp / 1000 AS BIGINT)), 'America/Los_Angeles') - INTERVAL 18 HOURS)") {
  return `
eligible_users AS (
  SELECT DISTINCT user_id
  FROM cvs.v3_etl.user_information
  WHERE is_test_user = FALSE
    AND is_banned = 0
),
segment_revenue_base AS (
  SELECT
    r.user_id,
    ${purchaseDateSql} AS purchase_date,
    r.price
  FROM cvs.slots1_db_prod.revenue r
  INNER JOIN eligible_users eu ON r.user_id = eu.user_id
  WHERE ${purchaseDateSql} BETWEEN DATE_ADD(CAST(${endDateParam} AS DATE), -365) AND CAST(${endDateParam} AS DATE)
),
segment_revenue_features AS (
  SELECT
    srb.user_id,
    COUNT(*) AS purchase_count_365d,
    COUNT(DISTINCT srb.purchase_date) AS purchase_days_365d,
    ROUND(SUM(srb.price), 2) AS revenue_365d,
    ROUND(AVG(srb.price), 2) AS aov_365d,
    MAX(srb.purchase_date) AS last_purchase_date_365d,
    ROUND(SUM(CASE WHEN srb.purchase_date >= DATE_ADD(CAST(${endDateParam} AS DATE), -29) THEN srb.price ELSE 0 END), 2) AS revenue_30d
  FROM segment_revenue_base srb
  GROUP BY 1
),
segment_login_features AS (
  SELECT
    l.user_id,
    COUNT(DISTINCT CASE WHEN l.date >= DATE_ADD(CAST(${endDateParam} AS DATE), -29) THEN l.date END) AS active_days_30d
  FROM cvs.v3_etl.login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.date BETWEEN DATE_ADD(CAST(${endDateParam} AS DATE), -29) AND CAST(${endDateParam} AS DATE)
  GROUP BY 1
),
user_segments AS (
  SELECT
    eu.user_id,
    CASE
      WHEN COALESCE(rf.purchase_count_365d, 0) = 0 THEN 'non_payers'
      WHEN COALESCE(rf.revenue_365d, 0) >= 2000
        AND COALESCE(rf.purchase_count_365d, 0) >= 150
        AND DATEDIFF(CAST(${endDateParam} AS DATE), rf.last_purchase_date_365d) <= 30
        THEN 'power_whales'
      WHEN COALESCE(rf.revenue_365d, 0) >= 200
        AND COALESCE(rf.revenue_365d, 0) < 2000
        AND DATEDIFF(CAST(${endDateParam} AS DATE), rf.last_purchase_date_365d) <= 45
        AND COALESCE(lf.active_days_30d, 0) >= 15
        THEN 'active_mid_core_payers'
      WHEN COALESCE(rf.purchase_count_365d, 0) > 0
        AND COALESCE(rf.revenue_30d, 0) / NULLIF(COALESCE(rf.revenue_365d, 0), 0) >= 0.7
        AND DATEDIFF(CAST(${endDateParam} AS DATE), rf.last_purchase_date_365d) <= 20
        THEN 'recently_activated_payers'
      WHEN COALESCE(rf.revenue_365d, 0) >= 50
        AND DATEDIFF(CAST(${endDateParam} AS DATE), rf.last_purchase_date_365d) >= 120
        THEN 'dormant_legacy_payers'
      WHEN COALESCE(rf.revenue_365d, 0) < 20
        AND COALESCE(rf.purchase_count_365d, 0) <= 3
        THEN 'one_time_low_spenders'
      ELSE 'broad_casual_payers'
    END AS cluster_segment
  FROM eligible_users eu
  LEFT JOIN segment_revenue_features rf ON eu.user_id = rf.user_id
  LEFT JOIN segment_login_features lf ON eu.user_id = lf.user_id
)
`.trim();
}

function applyTemplate(template, replacements) {
  return template.replaceAll(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gu, (_, key) => replacements[key] ?? "");
}

function buildDefaultTemplates(views) {
  return {
    ae_daily_trend: `
SELECT
  {{DATE_DIMENSION}} AS metric_date,
  SUM(active_users) AS active_users,
  SUM(session_count) AS session_count,
  SUM(payers) AS payers,
  SUM(gross_revenue) AS gross_revenue
FROM ${views.daily}
WHERE game_code = :game_code
  AND metric_date BETWEEN :start_date AND :end_date
  {{REGION_FILTER}}
GROUP BY 1
ORDER BY 1
`.trim(),
    ae_segment_mix: `
SELECT
  {{DIMENSION_SQL}} AS segment_key,
  SUM(active_users) AS active_users,
  SUM(payers) AS payers,
  SUM(gross_revenue) AS gross_revenue,
  ROUND(SUM(gross_revenue) / NULLIF(SUM(payers), 0), 2) AS arppu
FROM ${views.segment}
WHERE game_code = :game_code
  AND metric_date BETWEEN :start_date AND :end_date
  {{REGION_FILTER}}
GROUP BY 1
ORDER BY gross_revenue DESC
`.trim(),
    ae_retention_health: `
SELECT
  cohort_date,
  d1_retention,
  d7_retention,
  d30_retention
FROM ${views.retention}
WHERE game_code = :game_code
  AND cohort_date BETWEEN :start_date AND :end_date
  {{REGION_FILTER}}
ORDER BY cohort_date
`.trim(),
    user_information_top_spenders: `
SELECT *
FROM cvs.v3_etl.user_information ui
WHERE is_test_user = FALSE
  AND is_banned = 0
ORDER BY lifetime_spend DESC
`.trim(),
    slots_revenue_daily: `
WITH params AS (
  SELECT
    CAST(:start_date AS DATE) AS start_date,
    CAST(:end_date AS DATE) AS end_date,
    DATE_ADD(CAST(:end_date AS DATE), -730) AS history_start_date
),
${buildEligibleUsersCte()},
date_spine AS (
  SELECT EXPLODE(SEQUENCE(CAST(:start_date AS DATE), CAST(:end_date AS DATE), INTERVAL 1 DAY)) AS purchase_date
),
revenue_base AS (
  SELECT
    {{PURCHASE_DATE_SQL}} AS purchase_date,
    r.user_id,
    r.price,
    r.user_lifetime_spend
  FROM cvs.slots1_db_prod.revenue r
  INNER JOIN eligible_users eu ON r.user_id = eu.user_id
  WHERE {{PURCHASE_DATE_SQL}} BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
),
daily_revenue AS (
  SELECT
    purchase_date,
    COUNT(*) AS purchase_count,
    COUNT(DISTINCT user_id) AS payer_count,
    COUNT(DISTINCT CASE WHEN COALESCE(user_lifetime_spend, 0) - COALESCE(price, 0) <= 0.01 THEN user_id END) AS first_time_payers,
    ROUND(SUM(price), 2) AS revenue,
    ROUND(SUM(price) / NULLIF(COUNT(DISTINCT user_id), 0), 2) AS arppu,
    ROUND(SUM(price) / NULLIF(COUNT(*), 0), 2) AS asp
  FROM revenue_base
  GROUP BY 1
),
daily_login AS (
  SELECT
    l.date AS purchase_date,
    COUNT(DISTINCT l.user_id) AS dau
  FROM cvs.v3_tableau_etl.for_live_login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.date BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
  GROUP BY 1
),
daily_metrics AS (
  SELECT
    dr.purchase_date,
    dr.purchase_count,
    dr.payer_count,
    COALESCE(dl.dau, 0) AS dau,
    dr.first_time_payers,
    dr.revenue,
    dr.arppu,
    ROUND(dr.revenue / NULLIF(COALESCE(dl.dau, 0), 0), 2) AS arpdau,
    ROUND(100.0 * dr.first_time_payers / NULLIF(COALESCE(dl.dau, 0), 0), 2) AS conversion_rate,
    ROUND(100.0 * dr.payer_count / NULLIF(COALESCE(dl.dau, 0), 0), 2) AS monetization_rate,
    dr.asp
  FROM daily_revenue dr
  LEFT JOIN daily_login dl ON dr.purchase_date = dl.purchase_date
),
history_metrics AS (
  SELECT
    purchase_date,
    purchase_count,
    payer_count,
    dau,
    first_time_payers,
    revenue,
    arppu,
    arpdau,
    conversion_rate,
    monetization_rate,
    asp,
    ROUND(AVG(revenue) OVER (
      PARTITION BY DAYOFWEEK(purchase_date)
      ORDER BY purchase_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 2) AS revenue_same_dow_baseline,
    ROUND(AVG(arpdau) OVER (
      PARTITION BY DAYOFWEEK(purchase_date)
      ORDER BY purchase_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 2) AS arpdau_same_dow_baseline,
    ROUND(AVG(monetization_rate) OVER (
      PARTITION BY DAYOFWEEK(purchase_date)
      ORDER BY purchase_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 2) AS monetization_same_dow_baseline,
    LAG(revenue, 52) OVER (PARTITION BY DAYOFWEEK(purchase_date) ORDER BY purchase_date) AS revenue_yoy_proxy,
    LAG(arpdau, 52) OVER (PARTITION BY DAYOFWEEK(purchase_date) ORDER BY purchase_date) AS arpdau_yoy_proxy
  FROM daily_metrics
),
summary_windows AS (
  SELECT
    SUM(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN purchase_count ELSE 0 END) AS current_purchase_count,
    SUM(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN payer_count ELSE 0 END) AS current_payer_count,
    SUM(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN dau ELSE 0 END) AS current_dau,
    SUM(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN first_time_payers ELSE 0 END) AS current_first_time_payers,
    ROUND(SUM(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN revenue ELSE 0 END), 2) AS current_revenue,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN arppu END), 2) AS current_arppu,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN arpdau END), 2) AS current_arpdau,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN conversion_rate END), 2) AS current_conversion_rate,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN monetization_rate END), 2) AS current_monetization_rate,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN asp END), 2) AS current_asp,
    SUM(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN purchase_count ELSE 0 END) AS prev_purchase_count,
    SUM(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN payer_count ELSE 0 END) AS prev_payer_count,
    SUM(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN dau ELSE 0 END) AS prev_dau,
    SUM(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN first_time_payers ELSE 0 END) AS prev_first_time_payers,
    ROUND(SUM(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN revenue ELSE 0 END), 2) AS prev_revenue,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN arppu END), 2) AS prev_arppu,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN arpdau END), 2) AS prev_arpdau,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN conversion_rate END), 2) AS prev_conversion_rate,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN monetization_rate END), 2) AS prev_monetization_rate,
    ROUND(AVG(CASE WHEN purchase_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN asp END), 2) AS prev_asp
  FROM daily_metrics
)
SELECT
  ds.purchase_date,
  COALESCE(hm.purchase_count, 0) AS purchase_count,
  COALESCE(hm.payer_count, 0) AS payer_count,
  COALESCE(hm.dau, 0) AS dau,
  COALESCE(hm.first_time_payers, 0) AS first_time_payers,
  COALESCE(hm.revenue, 0) AS revenue,
  COALESCE(hm.arppu, 0) AS arppu,
  COALESCE(hm.arpdau, 0) AS arpdau,
  COALESCE(hm.conversion_rate, 0) AS conversion_rate,
  COALESCE(hm.monetization_rate, 0) AS monetization_rate,
  COALESCE(hm.asp, 0) AS asp,
  hm.revenue_same_dow_baseline,
  hm.arpdau_same_dow_baseline,
  hm.monetization_same_dow_baseline,
  hm.revenue_yoy_proxy,
  hm.arpdau_yoy_proxy,
  sw.prev_purchase_count,
  sw.prev_payer_count,
  sw.prev_dau,
  sw.prev_first_time_payers,
  sw.prev_revenue,
  sw.prev_arppu,
  sw.prev_arpdau,
  sw.prev_conversion_rate,
  sw.prev_monetization_rate,
  sw.prev_asp,
  ROUND(100.0 * (hm.revenue - hm.revenue_same_dow_baseline) / NULLIF(hm.revenue_same_dow_baseline, 0), 2) AS revenue_vs_baseline_pct,
  ROUND(100.0 * (hm.arpdau - hm.arpdau_same_dow_baseline) / NULLIF(hm.arpdau_same_dow_baseline, 0), 2) AS arpdau_vs_baseline_pct,
  ROUND(100.0 * (hm.monetization_rate - hm.monetization_same_dow_baseline) / NULLIF(hm.monetization_same_dow_baseline, 0), 2) AS monetization_vs_baseline_pct,
  ROUND(100.0 * (hm.revenue - hm.revenue_yoy_proxy) / NULLIF(hm.revenue_yoy_proxy, 0), 2) AS revenue_vs_yoy_pct,
  ROUND(100.0 * (hm.arpdau - hm.arpdau_yoy_proxy) / NULLIF(hm.arpdau_yoy_proxy, 0), 2) AS arpdau_vs_yoy_pct
FROM date_spine ds
LEFT JOIN history_metrics hm ON ds.purchase_date = hm.purchase_date
CROSS JOIN summary_windows sw
ORDER BY 1
`.trim()
  };
}

function withQueryEditorMeta(client, sqlTemplate) {
  return {
    ...client,
    sqlTemplate
  };
}

export async function getQueryDefinitions(overrideEnvelope = null) {
  const runtimeConfig = await getRuntimeConfig(overrideEnvelope);
  const notesConfig = await getNotesConfig();
  const views = {
    daily: await fullyQualifiedView("daily", overrideEnvelope),
    segment: await fullyQualifiedView("segment", overrideEnvelope),
    retention: await fullyQualifiedView("retention", overrideEnvelope)
  };
  const defaultTemplates = buildDefaultTemplates(views);
  const aeReaderGroups = [...new Set([...runtimeConfig.groups.aeReaders, ...runtimeConfig.groups.analyticsAdmin])];
  const aeRetentionGroups = [...new Set([...runtimeConfig.groups.aeRetention, ...runtimeConfig.groups.analyticsAdmin])];
  const adminOnlyGroups = [...new Set([...runtimeConfig.groups.analyticsAdmin])];
  const queryOverrides = runtimeConfig.queryOverrides || {};

  return {
    ae_daily_trend: {
      id: "ae_daily_trend",
      name: "AE Daily Trend",
      description: "Secure serving view based daily trend for active users, sessions, payers, and revenue.",
      defaults: {
        gameCode: process.env.DEFAULT_GAME_CODE || "STARBLITZ",
        startDate: "2026-01-01",
        endDate: "2026-02-15",
        region: process.env.DEFAULT_REGION || "ALL",
        grain: "day"
      },
      client: withQueryEditorMeta(
        {
          queryId: "ae_daily_trend",
          name: "AE Daily Trend",
          description: "일자별 게임 핵심 지표를 secure view 기준으로 조회합니다.",
          accent: "sunrise",
          requiredGroups: queryOverrides.ae_daily_trend?.requiredGroups || aeReaderGroups,
          controls: [
            { id: "gameCode", label: "Game", type: "text" },
            { id: "startDate", label: "Start", type: "date" },
            { id: "endDate", label: "End", type: "date" },
            { id: "region", label: "Region", type: "select", options: ["ALL", "KR", "US", "JP", "TW", "SEA"] },
            { id: "grain", label: "Grain", type: "select", options: ["day", "week"] }
          ],
          security: ["query_id allowlist", "SQL Warehouse only", "serving schema only"]
        },
        queryOverrides.ae_daily_trend?.sqlTemplate || defaultTemplates.ae_daily_trend
      ),
      build(params) {
        const safeParams = {
          gameCode: String(params.gameCode || "").slice(0, 48),
          startDate: params.startDate,
          endDate: params.endDate,
          region: clampRegion(params.region),
          grain: clampGrain(params.grain)
        };
        return {
          catalog: runtimeConfig.servingCatalog,
          schema: runtimeConfig.servingSchema,
          rowLimit: 120,
          statement: applyTemplate(queryOverrides.ae_daily_trend?.sqlTemplate || defaultTemplates.ae_daily_trend, {
            DATE_DIMENSION: safeParams.grain === "week" ? "date_trunc('week', metric_date)" : "metric_date",
            REGION_FILTER: safeParams.region === "ALL" ? "" : "AND region = :region"
          }),
          parameters: [
            { name: "game_code", value: safeParams.gameCode, type: "STRING" },
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" },
            ...(safeParams.region === "ALL" ? [] : [{ name: "region", value: safeParams.region, type: "STRING" }])
          ]
        };
      },
      mock(params) {
        const rows = buildTrendRows({ ...params, region: clampRegion(params.region), grain: clampGrain(params.grain) });
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode, params }) {
        if (!rows.length) {
          return buildEmptyReport(mode, audit, `${params.gameCode} / ${params.region} / ${params.grain} trend`, "선택한 기간에 해당하는 serving view 데이터가 없어 트렌드를 그리지 못했습니다.", [
            { key: "metric_date", label: "Date" },
            { key: "active_users", label: "Active Users" },
            { key: "session_count", label: "Sessions" },
            { key: "payers", label: "Payers" },
            { key: "gross_revenue", label: "Revenue" }
          ], {
            type: "line",
            xKey: "metric_date",
            series: [
              { key: "active_users", label: "Active Users", color: "#e85d3b" },
              { key: "payers", label: "Payers", color: "#1d7b84" },
              { key: "gross_revenue", label: "Revenue", color: "#f0b400" }
            ]
          });
        }
        const first = rows[0];
        const last = rows[rows.length - 1];
        const totalRevenue = rows.reduce((sum, row) => sum + row.gross_revenue, 0);
        const totalActive = rows.reduce((sum, row) => sum + row.active_users, 0);
        const averagePayerRate = average(rows.map(row => row.payers / Math.max(row.active_users, 1)));
        const strongestDay = [...rows].sort((left, right) => right.gross_revenue - left.gross_revenue)[0];
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: `${params.gameCode} / ${params.region} / ${params.grain} trend`,
          metrics: [
            { label: "Total Revenue", value: formatCurrency(totalRevenue), detail: describeTrend(percentChange(first?.gross_revenue || 0, last?.gross_revenue || 0)) },
            { label: "Average DAU", value: formatNumber(Math.round(totalActive / Math.max(rows.length, 1))), detail: `${rows.length} points` },
            { label: "Avg Payer Rate", value: `${(averagePayerRate * 100).toFixed(2)}%`, detail: `Peak ${formatNumber(strongestDay?.payers || 0)} payers` }
          ],
          insights: [
            `Revenue peaked on ${strongestDay.metric_date} at ${formatCurrency(strongestDay.gross_revenue)}.`,
            `End-of-range active users are ${describeTrend(percentChange(first?.active_users || 0, last?.active_users || 0))} versus the start date.`,
            `이 쿼리는 secure daily serving view만 대상으로 하므로 raw table 직접 노출 없이 트렌드 분석을 자동화할 수 있습니다.`
          ],
          visualization: {
            type: "line",
            xKey: "metric_date",
            series: [
              { key: "active_users", label: "Active Users", color: "#e85d3b" },
              { key: "payers", label: "Payers", color: "#1d7b84" },
              { key: "gross_revenue", label: "Revenue", color: "#f0b400" }
            ]
          },
          table: {
            columns: [
              { key: "metric_date", label: "Date" },
              { key: "active_users", label: "Active Users" },
              { key: "session_count", label: "Sessions" },
              { key: "payers", label: "Payers" },
              { key: "gross_revenue", label: "Revenue" }
            ],
            rows
          }
        });
      }
    },
    ae_segment_mix: {
      id: "ae_segment_mix",
      name: "AE Segment Mix",
      description: "Allowed segment breakdown over secure serving schema only.",
      defaults: {
        gameCode: process.env.DEFAULT_GAME_CODE || "STARBLITZ",
        startDate: "2026-01-01",
        endDate: "2026-02-15",
        region: process.env.DEFAULT_REGION || "ALL",
        dimension: "region"
      },
      client: withQueryEditorMeta(
        {
          queryId: "ae_segment_mix",
          name: "AE Segment Mix",
          description: "선택한 차원 기준으로 active user와 매출 구성을 집계합니다.",
          accent: "lagoon",
          requiredGroups: queryOverrides.ae_segment_mix?.requiredGroups || aeReaderGroups,
          controls: [
            { id: "gameCode", label: "Game", type: "text" },
            { id: "startDate", label: "Start", type: "date" },
            { id: "endDate", label: "End", type: "date" },
            { id: "region", label: "Region", type: "select", options: ["ALL", "KR", "US", "JP", "TW", "SEA"] },
            { id: "dimension", label: "Dimension", type: "select", options: ["region", "platform", "channel"] }
          ],
          security: ["dimension whitelist", "aggregated response only", "no ad hoc SQL"]
        },
        queryOverrides.ae_segment_mix?.sqlTemplate || defaultTemplates.ae_segment_mix
      ),
      build(params) {
        const safeParams = {
          gameCode: String(params.gameCode || "").slice(0, 48),
          startDate: params.startDate,
          endDate: params.endDate,
          region: clampRegion(params.region),
          dimension: clampDimension(params.dimension)
        };
        const dimensionSql = { region: "region", platform: "platform", channel: "acquisition_channel" }[safeParams.dimension];
        return {
          catalog: runtimeConfig.servingCatalog,
          schema: runtimeConfig.servingSchema,
          rowLimit: 24,
          statement: applyTemplate(queryOverrides.ae_segment_mix?.sqlTemplate || defaultTemplates.ae_segment_mix, {
            DIMENSION_SQL: dimensionSql,
            REGION_FILTER: safeParams.region === "ALL" ? "" : "AND region = :region"
          }),
          parameters: [
            { name: "game_code", value: safeParams.gameCode, type: "STRING" },
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" },
            ...(safeParams.region === "ALL" ? [] : [{ name: "region", value: safeParams.region, type: "STRING" }])
          ]
        };
      },
      mock(params) {
        const rows = buildSegmentRows({ ...params, region: clampRegion(params.region), dimension: clampDimension(params.dimension) });
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode, params }) {
        if (!rows.length) {
          return buildEmptyReport(mode, audit, `${params.gameCode} ${params.dimension} mix`, "구성비 분석 결과가 비어 있습니다. serving schema의 집계 범위를 확인해 주세요.", [
            { key: "segment_key", label: "Segment" },
            { key: "active_users", label: "Active Users" },
            { key: "payers", label: "Payers" },
            { key: "gross_revenue", label: "Revenue" },
            { key: "arppu", label: "ARPPU" }
          ], {
            type: "bar",
            xKey: "segment_key",
            series: [{ key: "gross_revenue", label: "Revenue", color: "#0e6e73" }]
          });
        }
        const totalRevenue = rows.reduce((sum, row) => sum + row.gross_revenue, 0);
        const totalUsers = rows.reduce((sum, row) => sum + row.active_users, 0);
        const leader = rows[0];
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: `${params.gameCode} ${params.dimension} mix`,
          metrics: [
            { label: "Revenue Mix", value: formatCurrency(totalRevenue), detail: `${rows.length} segments` },
            { label: "Reach", value: formatNumber(totalUsers), detail: `${params.dimension} grouped` },
            { label: "Top Segment", value: leader.segment_key, detail: `${((leader.gross_revenue / Math.max(totalRevenue, 1)) * 100).toFixed(1)}% of revenue` }
          ],
          insights: [
            `${leader.segment_key} is the largest ${params.dimension} slice with ${formatCurrency(leader.gross_revenue)} in revenue.`,
            `The weakest segment still carries ${formatNumber(rows[rows.length - 1].active_users)} active users, which is useful for long-tail monitoring.`,
            `차원은 whitelist로 제한되어 있어 group by 구문을 사용하더라도 임의 SQL 주입 없이 안전하게 분기할 수 있습니다.`
          ],
          visualization: {
            type: "bar",
            xKey: "segment_key",
            series: [{ key: "gross_revenue", label: "Revenue", color: "#0e6e73" }]
          },
          table: {
            columns: [
              { key: "segment_key", label: "Segment" },
              { key: "active_users", label: "Active Users" },
              { key: "payers", label: "Payers" },
              { key: "gross_revenue", label: "Revenue" },
              { key: "arppu", label: "ARPPU" }
            ],
            rows
          }
        });
      }
    },
    ae_retention_health: {
      id: "ae_retention_health",
      name: "AE Retention Health",
      description: "Retention automation view for D1, D7, and D30.",
      defaults: {
        gameCode: process.env.DEFAULT_GAME_CODE || "STARBLITZ",
        startDate: "2025-11-01",
        endDate: "2026-02-15",
        region: process.env.DEFAULT_REGION || "ALL"
      },
      client: withQueryEditorMeta(
        {
          queryId: "ae_retention_health",
          name: "AE Retention Health",
          description: "리텐션 코호트 지표를 자동 요약하고 이슈를 빠르게 파악합니다.",
          accent: "ember",
          requiredGroups: queryOverrides.ae_retention_health?.requiredGroups || aeRetentionGroups,
          controls: [
            { id: "gameCode", label: "Game", type: "text" },
            { id: "startDate", label: "Start", type: "date" },
            { id: "endDate", label: "End", type: "date" },
            { id: "region", label: "Region", type: "select", options: ["ALL", "KR", "US", "JP", "TW", "SEA"] }
          ],
          security: ["retention serving view", "row limit under 20", "OAuth M2M ready"]
        },
        queryOverrides.ae_retention_health?.sqlTemplate || defaultTemplates.ae_retention_health
      ),
      build(params) {
        const safeParams = {
          gameCode: String(params.gameCode || "").slice(0, 48),
          startDate: params.startDate,
          endDate: params.endDate,
          region: clampRegion(params.region)
        };
        return {
          catalog: runtimeConfig.servingCatalog,
          schema: runtimeConfig.servingSchema,
          rowLimit: 20,
          statement: applyTemplate(queryOverrides.ae_retention_health?.sqlTemplate || defaultTemplates.ae_retention_health, {
            REGION_FILTER: safeParams.region === "ALL" ? "" : "AND region = :region"
          }),
          parameters: [
            { name: "game_code", value: safeParams.gameCode, type: "STRING" },
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" },
            ...(safeParams.region === "ALL" ? [] : [{ name: "region", value: safeParams.region, type: "STRING" }])
          ]
        };
      },
      mock(params) {
        const rows = buildRetentionRows({ ...params, region: clampRegion(params.region) });
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode, params }) {
        if (!rows.length) {
          return buildEmptyReport(mode, audit, `${params.gameCode} retention health`, "리텐션 코호트 결과가 비어 있습니다. cohort view 또는 기간 범위를 확인해 주세요.", [
            { key: "cohort_date", label: "Cohort" },
            { key: "d1_retention", label: "D1" },
            { key: "d7_retention", label: "D7" },
            { key: "d30_retention", label: "D30" }
          ], {
            type: "line",
            xKey: "cohort_date",
            series: [
              { key: "d1_retention", label: "D1", color: "#b33d1c" },
              { key: "d7_retention", label: "D7", color: "#007a78" },
              { key: "d30_retention", label: "D30", color: "#f2a541" }
            ],
            percent: true
          });
        }
        const latest = rows[rows.length - 1];
        const earliest = rows[0];
        const d7Drop = percentChange(earliest?.d7_retention || 0, latest?.d7_retention || 0);
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: `${params.gameCode} retention health`,
          metrics: [
            { label: "Latest D1", value: `${(latest.d1_retention * 100).toFixed(1)}%`, detail: `Earliest ${(earliest.d1_retention * 100).toFixed(1)}%` },
            { label: "Latest D7", value: `${(latest.d7_retention * 100).toFixed(1)}%`, detail: describeTrend(d7Drop) },
            { label: "Latest D30", value: `${(latest.d30_retention * 100).toFixed(1)}%`, detail: `${rows.length} cohorts` }
          ],
          insights: [
            `The most recent cohort (${latest.cohort_date}) retained ${(latest.d7_retention * 100).toFixed(1)}% on D7.`,
            `D7 retention moved ${describeTrend(d7Drop)} between the first and latest visible cohorts.`,
            `리텐션 자동화는 raw event 직접 조회 대신 사전 계산된 cohort view를 쓰는 편이 권한 관리와 비용 제어에 훨씬 유리합니다.`
          ],
          visualization: {
            type: "line",
            xKey: "cohort_date",
            series: [
              { key: "d1_retention", label: "D1", color: "#b33d1c" },
              { key: "d7_retention", label: "D7", color: "#007a78" },
              { key: "d30_retention", label: "D30", color: "#f2a541" }
            ],
            percent: true
          },
          table: {
            columns: [
              { key: "cohort_date", label: "Cohort" },
              { key: "d1_retention", label: "D1" },
              { key: "d7_retention", label: "D7" },
              { key: "d30_retention", label: "D30" }
            ],
            rows
          }
        });
      }
    },
    user_information_top_spenders: {
      id: "user_information_top_spenders",
      name: "Top Spenders",
      description: "User information table sorted by lifetime spend.",
      defaults: {},
      client: withQueryEditorMeta(
        {
          queryId: "user_information_top_spenders",
          name: "Top Spenders",
          description: "테스트/밴 유저를 제외한 고과금 유저 목록을 확인합니다.",
          accent: "lagoon",
          requiredGroups: queryOverrides.user_information_top_spenders?.requiredGroups || adminOnlyGroups,
          controls: [],
          security: ["admin only by default", "row limit enforced by gateway", "full table review"]
        },
        queryOverrides.user_information_top_spenders?.sqlTemplate || defaultTemplates.user_information_top_spenders
      ),
      build() {
        return {
          catalog: runtimeConfig.servingCatalog,
          schema: runtimeConfig.servingSchema,
          rowLimit: 200,
          statement: queryOverrides.user_information_top_spenders?.sqlTemplate || defaultTemplates.user_information_top_spenders,
          parameters: []
        };
      },
      mock() {
        const rows = buildTopSpenderRows();
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode }) {
        if (!rows.length) {
          return buildEmptyReport(mode, audit, "Top spenders", "조건에 맞는 유저가 없어 결과가 비어 있습니다.", [], {
            type: "bar",
            xKey: "user_id",
            series: [{ key: "lifetime_spend", label: "Lifetime Spend", color: "#0e6e73" }]
          });
        }
        const leader = rows[0];
        const totalSpend = rows.reduce((sum, row) => sum + Number(row.lifetime_spend || 0), 0);
        const medianRow = rows[Math.floor(rows.length / 2)];
        const leaderShare = (Number(leader.lifetime_spend || 0) / Math.max(totalSpend, 1)) * 100;
        const countryTotals = Object.values(
          rows.reduce((accumulator, row) => {
            const country = String(row.country || "Unknown");
            accumulator[country] ||= { country, spend: 0, users: 0 };
            accumulator[country].spend += Number(row.lifetime_spend || 0);
            accumulator[country].users += 1;
            return accumulator;
          }, {})
        ).sort((left, right) => right.spend - left.spend);
        const topCountry = countryTotals[0];
        const tailRatio =
          Number(leader.lifetime_spend || 0) / Math.max(Number(medianRow?.lifetime_spend || 0), 1);
        const columns = Object.keys(rows[0]).map(key => ({ key, label: key }));
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: "Top spenders",
          metrics: [
            { label: "Top User", value: String(leader.user_id || leader.nickname || "unknown"), detail: formatCurrency(Number(leader.lifetime_spend || 0)) },
            { label: "Visible Rows", value: formatNumber(rows.length), detail: "Gateway row limit applied" },
            { label: "Total Visible Spend", value: formatCurrency(totalSpend), detail: "Current result window only" }
          ],
          insights: [
            `현재 보이는 구간에서 최고 lifetime spend는 ${formatCurrency(Number(leader.lifetime_spend || 0))}이며, visible spend pool의 ${leaderShare.toFixed(1)}%를 차지합니다.`,
            `${topCountry.country}가 ${topCountry.users}명의 유저에서 ${formatCurrency(topCountry.spend)}로 가장 큰 visible spend 집중도를 보입니다.`,
            `최상위 spender는 visible median spender 대비 ${tailRatio.toFixed(1)}배 커서, 이 구간의 whale tail이 가파른 편입니다.`
          ],
          visualization: {
            type: "bar",
            xKey: "user_id",
            series: [{ key: "lifetime_spend", label: "Lifetime Spend", color: "#0e6e73" }]
          },
          table: {
            columns,
            rows
          }
        });
      }
    },
    slots_revenue_daily: {
      id: "slots_revenue_daily",
      name: "Revenue 30D",
      description: "Daily revenue, payer, and ARPPU from cvs.slots1_db_prod.revenue.",
      defaults: {
        startDate: shiftIsoDate(latestFullyBakedDate(), -29),
        endDate: latestFullyBakedDate()
      },
      client: withQueryEditorMeta(
        {
          queryId: "slots_revenue_daily",
          name: "Revenue 30D",
          description: "최근 30일 매출 흐름을 일자 기준으로 봅니다.",
          accent: "sunrise",
          requiredGroups: adminOnlyGroups,
          controls: [
            { id: "startDate", label: "Start", type: "date" },
            { id: "endDate", label: "End", type: "date" }
          ],
          security: ["daily revenue view", "30d reporting", "gateway limited"]
        },
        defaultTemplates.slots_revenue_daily
      ),
      build(params) {
        const safeParams = {
          startDate: params.startDate,
          endDate: clampEndDate(params.endDate)
        };
        const purchaseDateSql = "DATE(FROM_UNIXTIME(CAST(purchase_timestamp / 1000 AS BIGINT)))";
        return {
          catalog: "cvs",
          schema: "slots1_db_prod",
          rowLimit: 62,
          statement: applyTemplate(defaultTemplates.slots_revenue_daily, {
            PURCHASE_DATE_SQL: purchaseDateSql,
            SEGMENT_PURCHASE_DATE_SQL: purchaseDateSql.replaceAll("purchase_timestamp", "r.purchase_timestamp")
          }),
          parameters: [
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" }
          ]
        };
      },
      mock(params) {
        const rows = buildRevenueRows(params);
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode, params }) {
        if (!rows.length) {
          return buildEmptyReport(mode, audit, "Revenue 30D", "선택한 기간에 revenue 데이터가 없습니다.", [
            { key: "purchase_date", label: "Date" },
            { key: "purchase_count", label: "Purchases" },
            { key: "payer_count", label: "Payers" },
            { key: "dau", label: "DAU" },
            { key: "first_time_payers", label: "First Payers" },
            { key: "revenue", label: "Revenue" },
            { key: "arppu", label: "ARPPU" },
            { key: "arpdau", label: "ARPDAU" },
            { key: "conversion_rate", label: "Conversion %" },
            { key: "monetization_rate", label: "Monetization %" },
            { key: "asp", label: "ASP" }
          ], {
            type: "line",
            xKey: "purchase_date",
            series: [{ key: "revenue", label: "Revenue", color: "#0e6e73" }]
          });
        }

        const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
        const totalPayers = rows.reduce((sum, row) => sum + Number(row.payer_count || 0), 0);
        const totalPurchases = rows.reduce((sum, row) => sum + Number(row.purchase_count || 0), 0);
        const totalDau = rows.reduce((sum, row) => sum + Number(row.dau || 0), 0);
        const totalFirstTimePayers = rows.reduce((sum, row) => sum + Number(row.first_time_payers || 0), 0);
        const bestDay = [...rows].sort((left, right) => Number(right.revenue || 0) - Number(left.revenue || 0))[0];
        const arppuAvg = average(rows.map(row => Number(row.arppu || 0)));
        const arpdauAvg = average(rows.map(row => Number(row.arpdau || 0)));
        const conversionAvg = average(rows.map(row => Number(row.conversion_rate || 0)));
        const monetizationAvg = average(rows.map(row => Number(row.monetization_rate || 0)));
        const aspAvg = average(rows.map(row => Number(row.asp || 0)));
        const firstRow = rows[0] || {};
        const previousWindow = Number.isFinite(Number(firstRow.prev_revenue))
          ? {
              purchases: Number(firstRow.prev_purchase_count || 0),
              payers: Number(firstRow.prev_payer_count || 0),
              dau: Number(firstRow.prev_dau || 0),
              firstTimePayers: Number(firstRow.prev_first_time_payers || 0),
              revenue: Number(firstRow.prev_revenue || 0),
              arppu: Number(firstRow.prev_arppu || 0),
              arpdau: Number(firstRow.prev_arpdau || 0),
              conversion: Number(firstRow.prev_conversion_rate || 0),
              monetization: Number(firstRow.prev_monetization_rate || 0),
              asp: Number(firstRow.prev_asp || 0)
            }
          : (() => {
              const previousRows = buildRevenueRows({
                ...params,
                startDate: shiftIsoDate(params.startDate, -30),
                endDate: shiftIsoDate(params.startDate, -1)
              });
              return {
                purchases: previousRows.reduce((sum, row) => sum + Number(row.purchase_count || 0), 0),
                payers: previousRows.reduce((sum, row) => sum + Number(row.payers || row.payer_count || 0), 0),
                dau: 0,
                firstTimePayers: 0,
                revenue: previousRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
                arppu: average(previousRows.map(row => Number(row.arppu || 0))),
                arpdau: 0,
                conversion: 0,
                monetization: 0,
                asp: 0
              };
            })();
        const avgRevenue = totalRevenue / Math.max(rows.length, 1);
        const diagnostics = seriesDiagnostics(rows, { dateKey: "purchase_date", valueKey: "revenue" });
        const weakestDays = rows
          .filter(row => Number(row.revenue || 0) < avgRevenue * 0.85)
          .sort((left, right) => Number(left.revenue || 0) - Number(right.revenue || 0))
          .slice(0, 2);
        const strongestSeasonalityLift = strongestAbsoluteShift(rows, "revenue_vs_baseline_pct");
        const strongestYoyShift = strongestAbsoluteShift(rows, "revenue_vs_yoy_pct");
        const purchaseWindowMeta = compareWindowMeta(totalPurchases, previousWindow.purchases);
        const payerWindowMeta = compareWindowMeta(totalPayers, previousWindow.payers);
        const revenueWindowMeta = compareWindowMeta(totalRevenue, previousWindow.revenue);
        const arppuWindowMeta = compareWindowMeta(arppuAvg, previousWindow.arppu);
        const arpdauWindowMeta = compareWindowMeta(arpdauAvg, previousWindow.arpdau);
        const conversionWindowMeta = compareWindowMeta(conversionAvg, previousWindow.conversion);
        const monetizationWindowMeta = compareWindowMeta(monetizationAvg, previousWindow.monetization);
        const aspWindowMeta = compareWindowMeta(aspAvg, previousWindow.asp);
        const metricMap = {
          "Purchase Count": { label: "Purchase Count", value: formatMetricNumber(totalPurchases), detail: purchaseWindowMeta.detail, detailTone: purchaseWindowMeta.tone },
          "Payer Count": { label: "Payer Count", value: formatMetricNumber(totalPayers), detail: payerWindowMeta.detail, detailTone: payerWindowMeta.tone },
          Revenue: { label: "Revenue", value: formatMetricCurrency(totalRevenue), detail: revenueWindowMeta.detail, detailTone: revenueWindowMeta.tone },
          ARPPU: { label: "ARPPU", value: formatMetricCurrency(arppuAvg), detail: arppuWindowMeta.detail, detailTone: arppuWindowMeta.tone },
          ARPDAU: { label: "ARPDAU", value: formatMetricCurrency(arpdauAvg), detail: arpdauWindowMeta.detail, detailTone: arpdauWindowMeta.tone },
          "Conversion(F2P -> P2P) Rate": { label: "Conversion", value: formatMetricPercent(conversionAvg), detail: conversionWindowMeta.detail, detailTone: conversionWindowMeta.tone },
          Monetization: { label: "Monetization", value: formatMetricPercent(monetizationAvg), detail: monetizationWindowMeta.detail, detailTone: monetizationWindowMeta.tone },
          ASP: { label: "ASP", value: formatMetricCurrency(aspAvg), detail: aspWindowMeta.detail, detailTone: aspWindowMeta.tone }
        };
        const metricOrder = notesConfig.revenueMetricOrder || Object.keys(metricMap);
        const orderedMetrics = metricOrder.map(metricName => metricMap[metricName]).filter(Boolean);
        const insights = [];

        if (notesConfig.analysisFocusAnomalies && weakestDays.length) {
          insights.push(`${weakestDays.map(day => `${day.purchase_date} (${formatCurrency(Number(day.revenue || 0))})`).join(", ")}가 최근 구간에서 가장 약한 매출일이었습니다.`);
        }
        insights.push(`최고 매출일은 ${bestDay.purchase_date}이며, 매출은 ${formatCurrency(Number(bestDay.revenue || 0))}였습니다.`);
        if (strongestSeasonalityLift) {
          insights.push(`${strongestSeasonalityLift.purchase_date}는 같은 요일 기준 최근 8주 baseline 대비 ${Math.abs(Number(strongestSeasonalityLift.revenue_vs_baseline_pct || 0)).toFixed(1)}% ${Number(strongestSeasonalityLift.revenue_vs_baseline_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.`);
        }
        if (strongestYoyShift) {
          insights.push(`${strongestYoyShift.purchase_date}는 전년 유사 요일 proxy 대비 ${Math.abs(Number(strongestYoyShift.revenue_vs_yoy_pct || 0)).toFixed(1)}% ${Number(strongestYoyShift.revenue_vs_yoy_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.`);
        }
        if (diagnostics.largestDrop) {
          insights.push(`${diagnostics.largestDrop.date}에 전일 대비 매출이 가장 크게 하락했고, 하락 폭은 ${Math.abs(diagnostics.largestDrop.deltaPct).toFixed(1)}%였습니다.`);
        }
        if (diagnostics.largestRise && diagnostics.largestRise.deltaPct > 3) {
          insights.push(`${diagnostics.largestRise.date}에 전일 대비 매출 반등 폭이 가장 컸고, 상승 폭은 ${diagnostics.largestRise.deltaPct.toFixed(1)}%였습니다.`);
        }
        insights.push(`최근 보이는 구간의 매출 추세는 ${describeTrendKo(diagnostics.trendPct)}이며, 단기 방향성은 ${forecastDirectionKo(diagnostics.shortForecast, Number(rows[rows.length - 1].revenue || 0))}으로 해석됩니다.`);

        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: "Revenue 30D",
          metrics: orderedMetrics,
          insights,
          visualization: {
            type: "line",
            xKey: "purchase_date",
            series: [
              { key: "revenue", label: "Revenue", color: "#0e6e73", axis: "left", format: "currency" },
              { key: "dau", label: "DAU", color: "#dd6031", axis: "right", format: "number" }
            ]
          },
          table: {
            columns: [
              { key: "purchase_date", label: "Date" },
              { key: "purchase_count", label: "Purchases" },
              { key: "payer_count", label: "Payers" },
              { key: "dau", label: "DAU" },
              { key: "first_time_payers", label: "First Payers" },
              { key: "revenue", label: "Revenue" },
              { key: "arppu", label: "ARPPU" },
              { key: "arpdau", label: "ARPDAU" },
              { key: "conversion_rate", label: "Conversion %" },
              { key: "monetization_rate", label: "Monetization %" },
              { key: "asp", label: "ASP" }
            ],
            rows
          }
        });
      }
    },
    slots_rooc_rate: {
      id: "slots_rooc_rate",
      name: "%ROOC",
      description: "ROOC users divided by DAU on a daily basis.",
      defaults: {
        startDate: shiftIsoDate(latestFullyBakedDate(), -29),
        endDate: latestFullyBakedDate()
      },
      client: {
        queryId: "slots_rooc_rate",
        name: "%ROOC",
        description: "ROOC 유저 수 / DAU를 일자별로 봅니다.",
        accent: "lagoon",
        requiredGroups: adminOnlyGroups,
        controls: [
          { id: "startDate", label: "Start", type: "date" },
          { id: "endDate", label: "End", type: "date" }
        ],
        security: ["events only", "daily KPI", "gateway limited"]
      },
      build(params) {
        const safeParams = {
          startDate: params.startDate,
          endDate: clampEndDate(params.endDate)
        };
        return {
          catalog: "cvs",
          schema: "v3_tableau_etl",
          rowLimit: 62,
          statement: `
WITH params AS (
  SELECT
    CAST(:start_date AS DATE) AS start_date,
    CAST(:end_date AS DATE) AS end_date,
    DATE_ADD(CAST(:end_date AS DATE), -420) AS history_start_date
),
${buildEligibleUsersCte()},
date_spine AS (
  SELECT EXPLODE(SEQUENCE(CAST(:start_date AS DATE), CAST(:end_date AS DATE), INTERVAL 1 DAY)) AS metric_date
),
daily_rooc AS (
  SELECT
    date AS metric_date,
    SUM(all_in_user_count) AS rooc_users
  FROM cvs.v3_tableau_etl.for_live_all_in
  WHERE date BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
  GROUP BY 1
),
daily_dau AS (
  SELECT
    l.date AS metric_date,
    COUNT(DISTINCT l.user_id) AS dau
  FROM cvs.v3_tableau_etl.for_live_login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.date BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
  GROUP BY 1
),
daily_metrics AS (
  SELECT
    dr.metric_date,
    dr.rooc_users,
    COALESCE(dd.dau, 0) AS dau,
    ROUND(100.0 * dr.rooc_users / NULLIF(COALESCE(dd.dau, 0), 0), 2) AS rooc_rate
  FROM daily_rooc dr
  LEFT JOIN daily_dau dd ON dr.metric_date = dd.metric_date
),
history_metrics AS (
  SELECT
    metric_date,
    rooc_users,
    dau,
    rooc_rate,
    ROUND(AVG(rooc_rate) OVER (
      PARTITION BY DAYOFWEEK(metric_date)
      ORDER BY metric_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 2) AS rooc_same_dow_baseline,
    LAG(rooc_rate, 52) OVER (PARTITION BY DAYOFWEEK(metric_date) ORDER BY metric_date) AS rooc_yoy_proxy
  FROM daily_metrics
),
summary_windows AS (
  SELECT
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN rooc_rate END), 2) AS current_rooc_rate,
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN rooc_users END), 2) AS current_rooc_users,
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN dau END), 2) AS current_dau,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN rooc_rate END), 2) AS prev_rooc_rate,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN rooc_users END), 2) AS prev_rooc_users,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN dau END), 2) AS prev_dau
  FROM daily_metrics
)
SELECT
  ds.metric_date,
  COALESCE(hm.rooc_users, 0) AS rooc_users,
  COALESCE(hm.dau, 0) AS dau,
  COALESCE(hm.rooc_rate, 0) AS rooc_rate,
  hm.rooc_same_dow_baseline,
  hm.rooc_yoy_proxy,
  sw.prev_rooc_rate,
  sw.prev_rooc_users,
  sw.prev_dau,
  ROUND(100.0 * (hm.rooc_rate - hm.rooc_same_dow_baseline) / NULLIF(hm.rooc_same_dow_baseline, 0), 2) AS rooc_vs_baseline_pct,
  ROUND(100.0 * (hm.rooc_rate - hm.rooc_yoy_proxy) / NULLIF(hm.rooc_yoy_proxy, 0), 2) AS rooc_vs_yoy_pct
FROM date_spine ds
LEFT JOIN history_metrics hm ON ds.metric_date = hm.metric_date
CROSS JOIN summary_windows sw
ORDER BY 1
`.trim(),
          parameters: [
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" }
          ]
        };
      },
      mock(params) {
        const rows = buildRoocRows(params);
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode }) {
        const peak = [...rows].sort((left, right) => Number(right.rooc_rate || 0) - Number(left.rooc_rate || 0))[0];
        const averageRate = average(rows.map(row => Number(row.rooc_rate || 0)));
        const averageUsers = average(rows.map(row => Number(row.rooc_users || 0)));
        const averageDau = average(rows.map(row => Number(row.dau || 0)));
        const rateMeta = compareWindowMeta(averageRate, Number(rows[0]?.prev_rooc_rate || 0));
        const usersMeta = compareWindowMeta(averageUsers, Number(rows[0]?.prev_rooc_users || 0));
        const dauMeta = compareWindowMeta(averageDau, Number(rows[0]?.prev_dau || 0));
        const diagnostics = seriesDiagnostics(rows, { dateKey: "metric_date", valueKey: "rooc_rate" });
        const strongestBaselineShift = [...rows]
          .filter(row => row.rooc_vs_baseline_pct !== null && row.rooc_vs_baseline_pct !== undefined)
          .sort((left, right) => Math.abs(Number(right.rooc_vs_baseline_pct || 0)) - Math.abs(Number(left.rooc_vs_baseline_pct || 0)))[0];
        const strongestYoyShift = [...rows]
          .filter(row => row.rooc_vs_yoy_pct !== null && row.rooc_vs_yoy_pct !== undefined)
          .sort((left, right) => Math.abs(Number(right.rooc_vs_yoy_pct || 0)) - Math.abs(Number(left.rooc_vs_yoy_pct || 0)))[0];
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: "%ROOC",
          metrics: [
            { label: "Avg %ROOC", value: `${averageRate.toFixed(2)}%`, detail: rateMeta.detail, detailTone: rateMeta.tone },
            { label: "Avg ROOC Users", value: formatNumber(averageUsers), detail: usersMeta.detail, detailTone: usersMeta.tone },
            { label: "Avg DAU", value: formatNumber(averageDau), detail: dauMeta.detail, detailTone: dauMeta.tone }
          ],
          insights: [
            `${peak.metric_date}의 %ROOC가 ${peak.rooc_rate.toFixed(2)}%로 가장 높았습니다.`,
            diagnostics.largestDrop ? `${diagnostics.largestDrop.date}에 전일 대비 %ROOC 하락 폭이 가장 컸고, ${Math.abs(diagnostics.largestDrop.deltaPct).toFixed(1)}% 하락했습니다.` : "",
            diagnostics.largestRise && diagnostics.largestRise.deltaPct > 2 ? `${diagnostics.largestRise.date}에 전일 대비 %ROOC 반등 폭이 가장 컸고, ${diagnostics.largestRise.deltaPct.toFixed(1)}% 상승했습니다.` : "",
            strongestBaselineShift ? `${strongestBaselineShift.metric_date}는 같은 요일 기준 baseline 대비 ${Math.abs(Number(strongestBaselineShift.rooc_vs_baseline_pct || 0)).toFixed(1)}% ${Number(strongestBaselineShift.rooc_vs_baseline_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
            strongestYoyShift ? `${strongestYoyShift.metric_date}는 전년 유사 요일 proxy 대비 ${Math.abs(Number(strongestYoyShift.rooc_vs_yoy_pct || 0)).toFixed(1)}% ${Number(strongestYoyShift.rooc_vs_yoy_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
            `최근 보이는 구간의 %ROOC 추세는 ${describeTrendKo(diagnostics.trendPct)}이며, 단기 방향성은 ${diagnostics.shortForecast && diagnostics.shortForecast >= Number(rows[rows.length - 1].rooc_rate || 0) ? "안정적이거나 상승 쪽" : "다소 약화되는 흐름"}입니다.`
          ].filter(Boolean),
          visualization: {
            type: "line",
            xKey: "metric_date",
            series: [{ key: "rooc_rate", label: "%ROOC", color: "#0e6e73" }]
          },
          table: {
            columns: [
              { key: "metric_date", label: "Date" },
              { key: "rooc_users", label: "ROOC Users" },
              { key: "dau", label: "DAU" },
              { key: "rooc_rate", label: "%ROOC" }
            ],
            rows
          }
        });
      }
    },
    slots_login_retention: {
      id: "slots_login_retention",
      name: "Login Retention",
      description: "D1, D7, D30 retention from login cohorts.",
      defaults: {
        startDate: shiftIsoDate(latestFullyBakedCohortDate(30), -29),
        endDate: latestFullyBakedCohortDate(30)
      },
      client: {
        queryId: "slots_login_retention",
        name: "Login Retention",
        description: "로그인 코호트 기준 D1/D7/D30 리텐션입니다.",
        accent: "ember",
        requiredGroups: adminOnlyGroups,
        controls: [
          { id: "startDate", label: "Start", type: "date" },
          { id: "endDate", label: "End", type: "date" }
        ],
        security: ["login cohorts", "fully baked only", "gateway limited"]
      },
      build(params) {
        const safeParams = {
          startDate: params.startDate,
          endDate: params.endDate > latestFullyBakedCohortDate(30) ? latestFullyBakedCohortDate(30) : params.endDate
        };
        return {
          catalog: "cvs",
          schema: "v3_tableau_etl",
          rowLimit: 62,
          statement: `
WITH params AS (
  SELECT
    CAST(:start_date AS DATE) AS start_date,
    CAST(:end_date AS DATE) AS end_date,
    DATE_ADD(CAST(:end_date AS DATE), -730) AS history_start_date
),
${buildEligibleUsersCte()},
date_spine AS (
  SELECT EXPLODE(SEQUENCE(CAST(:start_date AS DATE), CAST(:end_date AS DATE), INTERVAL 1 DAY)) AS cohort_date
),
login_days AS (
  SELECT DISTINCT l.user_id, l.date
  FROM cvs.v3_tableau_etl.for_live_login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.date BETWEEN (SELECT history_start_date FROM params) AND DATE_ADD((SELECT end_date FROM params), 30)
),
cohort_users AS (
  SELECT DISTINCT l.register_date AS cohort_date, l.user_id
  FROM cvs.v3_tableau_etl.for_live_login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.register_date BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
),
daily_retention AS (
  SELECT
    cu.cohort_date,
    COUNT(DISTINCT cu.user_id) AS cohort_users,
    ROUND(COUNT(DISTINCT CASE WHEN ld1.user_id IS NOT NULL THEN cu.user_id END) / NULLIF(COUNT(DISTINCT cu.user_id), 0), 4) AS d1_retention,
    ROUND(COUNT(DISTINCT CASE WHEN ld7.user_id IS NOT NULL THEN cu.user_id END) / NULLIF(COUNT(DISTINCT cu.user_id), 0), 4) AS d7_retention,
    ROUND(COUNT(DISTINCT CASE WHEN ld30.user_id IS NOT NULL THEN cu.user_id END) / NULLIF(COUNT(DISTINCT cu.user_id), 0), 4) AS d30_retention
  FROM cohort_users cu
  LEFT JOIN login_days ld1 ON cu.user_id = ld1.user_id AND ld1.date = DATE_ADD(cu.cohort_date, 1)
  LEFT JOIN login_days ld7 ON cu.user_id = ld7.user_id AND ld7.date = DATE_ADD(cu.cohort_date, 7)
  LEFT JOIN login_days ld30 ON cu.user_id = ld30.user_id AND ld30.date = DATE_ADD(cu.cohort_date, 30)
  GROUP BY 1
),
history_metrics AS (
  SELECT
    cohort_date,
    cohort_users,
    d1_retention,
    d7_retention,
    d30_retention,
    ROUND(AVG(d1_retention) OVER (
      PARTITION BY DAYOFWEEK(cohort_date)
      ORDER BY cohort_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 4) AS d1_same_dow_baseline,
    ROUND(AVG(d7_retention) OVER (
      PARTITION BY DAYOFWEEK(cohort_date)
      ORDER BY cohort_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 4) AS d7_same_dow_baseline,
    ROUND(AVG(d30_retention) OVER (
      PARTITION BY DAYOFWEEK(cohort_date)
      ORDER BY cohort_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 4) AS d30_same_dow_baseline
  FROM daily_retention
),
summary_windows AS (
  SELECT
    ROUND(AVG(CASE WHEN cohort_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN d1_retention END), 4) AS current_d1_retention,
    ROUND(AVG(CASE WHEN cohort_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN d7_retention END), 4) AS current_d7_retention,
    ROUND(AVG(CASE WHEN cohort_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN d30_retention END), 4) AS current_d30_retention,
    ROUND(AVG(CASE WHEN cohort_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN d1_retention END), 4) AS prev_d1_retention,
    ROUND(AVG(CASE WHEN cohort_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN d7_retention END), 4) AS prev_d7_retention,
    ROUND(AVG(CASE WHEN cohort_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN d30_retention END), 4) AS prev_d30_retention
  FROM daily_retention
)
SELECT
  ds.cohort_date,
  COALESCE(hm.cohort_users, 0) AS cohort_users,
  COALESCE(hm.d1_retention, 0) AS d1_retention,
  COALESCE(hm.d7_retention, 0) AS d7_retention,
  COALESCE(hm.d30_retention, 0) AS d30_retention,
  hm.d1_same_dow_baseline,
  hm.d7_same_dow_baseline,
  hm.d30_same_dow_baseline,
  sw.prev_d1_retention,
  sw.prev_d7_retention,
  sw.prev_d30_retention,
  ROUND(100.0 * (hm.d1_retention - hm.d1_same_dow_baseline) / NULLIF(hm.d1_same_dow_baseline, 0), 2) AS d1_vs_baseline_pct,
  ROUND(100.0 * (hm.d7_retention - hm.d7_same_dow_baseline) / NULLIF(hm.d7_same_dow_baseline, 0), 2) AS d7_vs_baseline_pct,
  ROUND(100.0 * (hm.d30_retention - hm.d30_same_dow_baseline) / NULLIF(hm.d30_same_dow_baseline, 0), 2) AS d30_vs_baseline_pct
FROM date_spine ds
LEFT JOIN history_metrics hm ON ds.cohort_date = hm.cohort_date
CROSS JOIN summary_windows sw
ORDER BY 1
`.trim(),
          parameters: [
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" }
          ]
        };
      },
      mock(params) {
        const rows = buildLoginRetentionRows(params);
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode }) {
        const latest = rows[rows.length - 1];
        const avgD1 = average(rows.map(row => Number(row.d1_retention || 0))) * 100;
        const avgD7 = average(rows.map(row => Number(row.d7_retention || 0))) * 100;
        const avgD30 = average(rows.map(row => Number(row.d30_retention || 0))) * 100;
        const d1Meta = compareWindowMeta(avgD1, Number(rows[0]?.prev_d1_retention || 0) * 100);
        const d7Meta = compareWindowMeta(avgD7, Number(rows[0]?.prev_d7_retention || 0) * 100);
        const d30Meta = compareWindowMeta(avgD30, Number(rows[0]?.prev_d30_retention || 0) * 100);
        const d1Diagnostics = seriesDiagnostics(rows, { dateKey: "cohort_date", valueKey: "d1_retention" });
        const d7Diagnostics = seriesDiagnostics(rows, { dateKey: "cohort_date", valueKey: "d7_retention" });
        const d30Diagnostics = seriesDiagnostics(rows, { dateKey: "cohort_date", valueKey: "d30_retention" });
        const strongestD7BaselineShift = strongestAbsoluteShift(rows, "d7_vs_baseline_pct");
        const strongestD30BaselineShift = strongestAbsoluteShift(rows, "d30_vs_baseline_pct");
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: "Login Retention",
          metrics: [
            { label: "Avg D1", value: `${avgD1.toFixed(2)}%`, detail: d1Meta.detail, detailTone: d1Meta.tone },
            { label: "Avg D7", value: `${avgD7.toFixed(2)}%`, detail: d7Meta.detail, detailTone: d7Meta.tone },
            { label: "Avg D30", value: `${avgD30.toFixed(2)}%`, detail: d30Meta.detail, detailTone: d30Meta.tone }
          ],
          insights: [
            `${latest.cohort_date}가 현재 보이는 구간에서 가장 최근 fully-baked cohort입니다.`,
            d7Diagnostics.largestDrop ? `${d7Diagnostics.largestDrop.date}에 D7 retention 하락 폭이 가장 컸고, ${Math.abs(d7Diagnostics.largestDrop.deltaPct).toFixed(1)}% 하락했습니다.` : "",
            d7Diagnostics.largestRise && d7Diagnostics.largestRise.deltaPct > 2 ? `${d7Diagnostics.largestRise.date}에 D7 retention 반등 폭이 가장 컸고, ${d7Diagnostics.largestRise.deltaPct.toFixed(1)}% 상승했습니다.` : "",
            strongestD7BaselineShift ? `${strongestD7BaselineShift.cohort_date}는 같은 요일 기준 D7 baseline 대비 ${Math.abs(Number(strongestD7BaselineShift.d7_vs_baseline_pct || 0)).toFixed(1)}% ${Number(strongestD7BaselineShift.d7_vs_baseline_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
            strongestD30BaselineShift ? `${strongestD30BaselineShift.cohort_date}는 같은 요일 기준 D30 baseline 대비 ${Math.abs(Number(strongestD30BaselineShift.d30_vs_baseline_pct || 0)).toFixed(1)}% ${Number(strongestD30BaselineShift.d30_vs_baseline_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
            `현재 보이는 cohort 추세는 D1 ${describeTrendKo(d1Diagnostics.trendPct)}, D7 ${describeTrendKo(d7Diagnostics.trendPct)}, D30 ${describeTrendKo(d30Diagnostics.trendPct)}입니다. D7의 단기 방향성은 ${forecastDirectionKo(d7Diagnostics.shortForecast, Number(latest.d7_retention || 0))}입니다.`
          ],
          visualization: {
            type: "line",
            xKey: "cohort_date",
            series: [
              { key: "d1_retention", label: "D1", color: "#b33d1c" },
              { key: "d7_retention", label: "D7", color: "#007a78" },
              { key: "d30_retention", label: "D30", color: "#f2a541" }
            ],
            percent: true
          },
          table: {
            columns: [
              { key: "cohort_date", label: "Cohort" },
              { key: "cohort_users", label: "Users" },
              { key: "d1_retention", label: "D1" },
              { key: "d7_retention", label: "D7" },
              { key: "d30_retention", label: "D30" }
            ],
            rows
          }
        });
      }
    },
    slots_relogin_rate: {
      id: "slots_relogin_rate",
      name: "재접속률",
      description: "Users who return the next day divided by same-day DAU.",
      defaults: {
        startDate: shiftIsoDate(latestFullyBakedDate(), -29),
        endDate: latestFullyBakedDate()
      },
      client: {
        queryId: "slots_relogin_rate",
        name: "재접속률",
        description: "해당 일자 접속 유저 중 다음날 다시 접속한 비율입니다.",
        accent: "lagoon",
        requiredGroups: adminOnlyGroups,
        controls: [
          { id: "startDate", label: "Start", type: "date" },
          { id: "endDate", label: "End", type: "date" }
        ],
        security: ["login only", "7d gap", "gateway limited"]
      },
      build(params) {
        const safeParams = {
          startDate: params.startDate,
          endDate: clampEndDate(params.endDate)
        };
        return {
          catalog: "cvs",
          schema: "v3_tableau_etl",
          rowLimit: 62,
          statement: `
WITH params AS (
  SELECT
    CAST(:start_date AS DATE) AS start_date,
    CAST(:end_date AS DATE) AS end_date,
    DATE_ADD(CAST(:end_date AS DATE), -180) AS history_start_date
),
${buildEligibleUsersCte()},
date_spine AS (
  SELECT EXPLODE(SEQUENCE(CAST(:start_date AS DATE), CAST(:end_date AS DATE), INTERVAL 1 DAY)) AS metric_date
),
login_days AS (
  SELECT DISTINCT l.user_id, l.date
  FROM cvs.v3_tableau_etl.for_live_login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.date BETWEEN (SELECT history_start_date FROM params) AND DATE_ADD((SELECT end_date FROM params), 1)
),
next_day_base AS (
  SELECT
    date AS metric_date,
    user_id,
    LEAD(date) OVER (PARTITION BY user_id ORDER BY date) AS next_login_date
  FROM login_days
),
daily_rollup AS (
  SELECT
    metric_date,
    COUNT(DISTINCT user_id) AS dau,
    COUNT(DISTINCT CASE WHEN DATEDIFF(next_login_date, metric_date) = 1 THEN user_id END) AS relogin_users
  FROM next_day_base
  WHERE metric_date BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
  GROUP BY 1
),
history_metrics AS (
  SELECT
    metric_date,
    dau,
    relogin_users,
    ROUND(100.0 * relogin_users / NULLIF(dau, 0), 2) AS relogin_rate,
    ROUND(AVG(ROUND(100.0 * relogin_users / NULLIF(dau, 0), 2)) OVER (
      PARTITION BY DAYOFWEEK(metric_date)
      ORDER BY metric_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 2) AS relogin_same_dow_baseline
  FROM daily_rollup
),
summary_windows AS (
  SELECT
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN relogin_rate END), 2) AS current_relogin_rate,
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN relogin_users END), 2) AS current_relogin_users,
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN dau END), 2) AS current_dau,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN relogin_rate END), 2) AS prev_relogin_rate,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN relogin_users END), 2) AS prev_relogin_users,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN dau END), 2) AS prev_dau
  FROM history_metrics
)
SELECT
  ds.metric_date,
  COALESCE(hm.dau, 0) AS dau,
  COALESCE(hm.relogin_users, 0) AS relogin_users,
  COALESCE(hm.relogin_rate, 0) AS relogin_rate,
  hm.relogin_same_dow_baseline,
  sw.prev_relogin_rate,
  sw.prev_relogin_users,
  sw.prev_dau,
  ROUND(100.0 * (hm.relogin_rate - hm.relogin_same_dow_baseline) / NULLIF(hm.relogin_same_dow_baseline, 0), 2) AS relogin_vs_baseline_pct
FROM date_spine ds
LEFT JOIN history_metrics hm ON ds.metric_date = hm.metric_date
CROSS JOIN summary_windows sw
ORDER BY 1
`.trim(),
          parameters: [
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" }
          ]
        };
      },
      mock(params) {
        const rows = buildReloginRows(params);
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode }) {
        const peak = [...rows].sort((left, right) => Number(right.relogin_rate || 0) - Number(left.relogin_rate || 0))[0];
        const averageRate = average(rows.map(row => Number(row.relogin_rate || 0)));
        const averageUsers = average(rows.map(row => Number(row.relogin_users || 0)));
        const averageDau = average(rows.map(row => Number(row.dau || 0)));
        const rateMeta = compareWindowMeta(averageRate, Number(rows[0]?.prev_relogin_rate || 0));
        const usersMeta = compareWindowMeta(averageUsers, Number(rows[0]?.prev_relogin_users || 0));
        const dauMeta = compareWindowMeta(averageDau, Number(rows[0]?.prev_dau || 0));
        const diagnostics = seriesDiagnostics(rows, { dateKey: "metric_date", valueKey: "relogin_rate" });
        const strongestBaselineShift = strongestAbsoluteShift(rows, "relogin_vs_baseline_pct");
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: "재접속률",
          metrics: [
            { label: "Avg 재접속률", value: `${averageRate.toFixed(2)}%`, detail: rateMeta.detail, detailTone: rateMeta.tone },
            { label: "Avg Return Users", value: formatNumber(averageUsers), detail: usersMeta.detail, detailTone: usersMeta.tone },
            { label: "Avg DAU", value: formatNumber(averageDau), detail: dauMeta.detail, detailTone: dauMeta.tone }
          ],
          insights: [
            `${peak.metric_date}의 다음날 재접속률이 ${peak.relogin_rate.toFixed(2)}%로 가장 높았습니다.`,
            diagnostics.largestDrop ? `${diagnostics.largestDrop.date}에 다음날 재접속률 하락 폭이 가장 컸고, ${Math.abs(diagnostics.largestDrop.deltaPct).toFixed(1)}% 하락했습니다.` : "",
            diagnostics.largestRise && diagnostics.largestRise.deltaPct > 2 ? `${diagnostics.largestRise.date}에 다음날 재접속률 반등 폭이 가장 컸고, ${diagnostics.largestRise.deltaPct.toFixed(1)}% 상승했습니다.` : "",
            strongestBaselineShift ? `${strongestBaselineShift.metric_date}는 같은 요일 기준 baseline 대비 ${Math.abs(Number(strongestBaselineShift.relogin_vs_baseline_pct || 0)).toFixed(1)}% ${Number(strongestBaselineShift.relogin_vs_baseline_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
            `최근 보이는 구간의 다음날 재접속률 추세는 ${describeTrendKo(diagnostics.trendPct)}이며, 단기 방향성은 ${forecastDirectionKo(diagnostics.shortForecast, Number(rows[rows.length - 1].relogin_rate || 0))}입니다.`
          ],
          visualization: {
            type: "line",
            xKey: "metric_date",
            series: [{ key: "relogin_rate", label: "재접속률", color: "#0e6e73" }]
          },
          table: {
            columns: [
              { key: "metric_date", label: "Date" },
              { key: "dau", label: "DAU" },
              { key: "relogin_users", label: "Next-Day Return Users" },
              { key: "relogin_rate", label: "재접속률" }
            ],
            rows
          }
        });
      }
    },
    slots_churn_rate: {
      id: "slots_churn_rate",
      name: "이탈률",
      description: "Users active on a day who do not return within 7 days, divided by same-day DAU.",
      defaults: {
        startDate: shiftIsoDate(latestFullyBakedDate(), -29),
        endDate: shiftIsoDate(latestFullyBakedDate(), -7)
      },
      client: {
        queryId: "slots_churn_rate",
        name: "이탈률",
        description: "해당 일자 접속 유저 중 7일 이내 재방문하지 않은 비율입니다.",
        accent: "ember",
        requiredGroups: adminOnlyGroups,
        controls: [
          { id: "startDate", label: "Start", type: "date" },
          { id: "endDate", label: "End", type: "date" }
        ],
        security: ["login only", "7d return window", "gateway limited"]
      },
      build(params) {
        const safeParams = {
          startDate: params.startDate,
          endDate: params.endDate > shiftIsoDate(latestFullyBakedDate(), -7) ? shiftIsoDate(latestFullyBakedDate(), -7) : params.endDate
        };
        return {
          catalog: "cvs",
          schema: "v3_tableau_etl",
          rowLimit: 62,
          statement: `
WITH params AS (
  SELECT
    CAST(:start_date AS DATE) AS start_date,
    CAST(:end_date AS DATE) AS end_date,
    DATE_ADD(CAST(:end_date AS DATE), -180) AS history_start_date
),
${buildEligibleUsersCte()},
date_spine AS (
  SELECT EXPLODE(SEQUENCE(CAST(:start_date AS DATE), CAST(:end_date AS DATE), INTERVAL 1 DAY)) AS metric_date
),
login_days AS (
  SELECT DISTINCT l.user_id, l.date
  FROM cvs.v3_tableau_etl.for_live_login l
  INNER JOIN eligible_users eu ON l.user_id = eu.user_id
  WHERE l.date BETWEEN (SELECT history_start_date FROM params) AND DATE_ADD((SELECT end_date FROM params), 7)
),
future_base AS (
  SELECT
    date AS metric_date,
    user_id,
    LEAD(date, 1) OVER (PARTITION BY user_id ORDER BY date) AS next_login_date
  FROM login_days
),
daily_rollup AS (
  SELECT
    metric_date,
    COUNT(DISTINCT user_id) AS dau,
    COUNT(DISTINCT CASE WHEN next_login_date IS NULL OR DATEDIFF(next_login_date, metric_date) > 7 THEN user_id END) AS churn_users
  FROM future_base
  WHERE metric_date BETWEEN (SELECT history_start_date FROM params) AND (SELECT end_date FROM params)
  GROUP BY 1
),
history_metrics AS (
  SELECT
    metric_date,
    dau,
    churn_users,
    ROUND(100.0 * churn_users / NULLIF(dau, 0), 2) AS churn_rate,
    ROUND(AVG(ROUND(100.0 * churn_users / NULLIF(dau, 0), 2)) OVER (
      PARTITION BY DAYOFWEEK(metric_date)
      ORDER BY metric_date
      ROWS BETWEEN 8 PRECEDING AND 1 PRECEDING
    ), 2) AS churn_same_dow_baseline
  FROM daily_rollup
),
summary_windows AS (
  SELECT
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN churn_rate END), 2) AS current_churn_rate,
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN churn_users END), 2) AS current_churn_users,
    ROUND(AVG(CASE WHEN metric_date BETWEEN (SELECT start_date FROM params) AND (SELECT end_date FROM params) THEN dau END), 2) AS current_dau,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN churn_rate END), 2) AS prev_churn_rate,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN churn_users END), 2) AS prev_churn_users,
    ROUND(AVG(CASE WHEN metric_date BETWEEN DATE_ADD((SELECT start_date FROM params), -30) AND DATE_ADD((SELECT start_date FROM params), -1) THEN dau END), 2) AS prev_dau
  FROM history_metrics
)
SELECT
  ds.metric_date,
  COALESCE(hm.dau, 0) AS dau,
  COALESCE(hm.churn_users, 0) AS churn_users,
  COALESCE(hm.churn_rate, 0) AS churn_rate,
  hm.churn_same_dow_baseline,
  sw.prev_churn_rate,
  sw.prev_churn_users,
  sw.prev_dau,
  ROUND(100.0 * (hm.churn_rate - hm.churn_same_dow_baseline) / NULLIF(hm.churn_same_dow_baseline, 0), 2) AS churn_vs_baseline_pct
FROM date_spine ds
LEFT JOIN history_metrics hm ON ds.metric_date = hm.metric_date
CROSS JOIN summary_windows sw
ORDER BY 1
`.trim(),
          parameters: [
            { name: "start_date", value: safeParams.startDate, type: "DATE" },
            { name: "end_date", value: safeParams.endDate, type: "DATE" }
          ]
        };
      },
      mock(params) {
        const rows = buildChurnRows(params);
        return { rows, audit: { source: "mock", rowCount: rows.length, truncated: false } };
      },
      present({ rows, audit, mode }) {
        const peak = [...rows].sort((left, right) => Number(right.churn_rate || 0) - Number(left.churn_rate || 0))[0];
        const averageRate = average(rows.map(row => Number(row.churn_rate || 0)));
        const averageUsers = average(rows.map(row => Number(row.churn_users || 0)));
        const averageDau = average(rows.map(row => Number(row.dau || 0)));
        const rateMeta = compareWindowMeta(averageRate, Number(rows[0]?.prev_churn_rate || 0));
        const usersMeta = compareWindowMeta(averageUsers, Number(rows[0]?.prev_churn_users || 0));
        const dauMeta = compareWindowMeta(averageDau, Number(rows[0]?.prev_dau || 0));
        const diagnostics = seriesDiagnostics(rows, { dateKey: "metric_date", valueKey: "churn_rate" });
        const strongestBaselineShift = strongestAbsoluteShift(rows, "churn_vs_baseline_pct");
        return buildSummaryAndInsights({
          rows,
          audit,
          mode,
          headline: "이탈률",
          metrics: [
            { label: "Avg 이탈률", value: `${averageRate.toFixed(2)}%`, detail: rateMeta.detail, detailTone: rateMeta.tone },
            { label: "Avg Churn Users", value: formatNumber(averageUsers), detail: usersMeta.detail, detailTone: usersMeta.tone },
            { label: "Avg DAU", value: formatNumber(averageDau), detail: dauMeta.detail, detailTone: dauMeta.tone }
          ],
          insights: [
            `${peak.metric_date}의 7일 이탈률이 ${peak.churn_rate.toFixed(2)}%로 가장 높았습니다.`,
            diagnostics.largestDrop ? `${diagnostics.largestDrop.date}에 7일 이탈률 하락 폭이 가장 컸고, ${Math.abs(diagnostics.largestDrop.deltaPct).toFixed(1)}% 하락했습니다.` : "",
            diagnostics.largestRise && diagnostics.largestRise.deltaPct > 2 ? `${diagnostics.largestRise.date}에 7일 이탈률 상승 폭이 가장 컸고, ${diagnostics.largestRise.deltaPct.toFixed(1)}% 상승했습니다.` : "",
            strongestBaselineShift ? `${strongestBaselineShift.metric_date}는 같은 요일 기준 baseline 대비 ${Math.abs(Number(strongestBaselineShift.churn_vs_baseline_pct || 0)).toFixed(1)}% ${Number(strongestBaselineShift.churn_vs_baseline_pct || 0) >= 0 ? "높았습니다" : "낮았습니다"}.` : "",
            `최근 보이는 구간의 7일 이탈률 추세는 ${describeTrendKo(diagnostics.trendPct)}이며, 단기 방향성은 ${forecastDirectionKo(diagnostics.shortForecast, Number(rows[rows.length - 1].churn_rate || 0))}입니다.`
          ],
          visualization: {
            type: "line",
            xKey: "metric_date",
            series: [{ key: "churn_rate", label: "이탈률", color: "#b33d1c" }]
          },
          table: {
            columns: [
              { key: "metric_date", label: "Date" },
              { key: "dau", label: "DAU" },
              { key: "churn_users", label: "Churn Users" },
              { key: "churn_rate", label: "이탈률" }
            ],
            rows
          }
        });
      }
    }
  };
}

export async function toClientCatalog(overrideEnvelope = null) {
  const queryDefinitions = await getQueryDefinitions(overrideEnvelope);
  const hiddenQueryIds = new Set(["ae_daily_trend", "ae_segment_mix", "ae_retention_health"]);
  return Object.values(queryDefinitions)
    .filter(query => !hiddenQueryIds.has(query.id))
    .map(query => ({
      ...query.client,
      defaults: query.defaults
    }));
}
