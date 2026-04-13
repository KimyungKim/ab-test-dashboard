const el = {
  viewerEmail:                    document.querySelector("#viewer-email"),
  modePill:                       document.querySelector("#mode-pill"),
  tabList:                        document.querySelector("#tab-list"),
  tabAnalysis:                    document.querySelector("#tab-analysis"),
  abtestListView:                 document.querySelector("#abtest-list-view"),
  abtestAnalysisView:             document.querySelector("#abtest-analysis-view"),
  abtestListSection:              document.querySelector("#abtest-list-section"),
  abtestListMeta:                 document.querySelector("#abtest-list-meta"),
  abtestListRoot:                 document.querySelector("#abtest-list-root"),
  abtestListGame:                 document.querySelector("#abtest-list-game"),
  abtestListStatus:               document.querySelector("#abtest-list-status"),
  abtestSearchText:               document.querySelector("#abtest-search-text"),
  abtestDateBtn:                  document.querySelector("#abtest-date-btn"),
  abtestDateClear:                document.querySelector("#abtest-date-clear"),
  abtestCalWrap:                  document.querySelector("#abtest-cal-wrap"),
  abtestDetailSection:            document.querySelector("#abtest-detail-section"),
  abtestDetailTitle:              document.querySelector("#abtest-detail-title"),
  abtestDetailMeta:               document.querySelector("#abtest-detail-meta"),
  abtestBackButton:               document.querySelector("#abtest-back-button"),
  abtestSlackLoading:             document.querySelector("#abtest-slack-loading"),
  abtestSlackNotfound:            document.querySelector("#abtest-slack-notfound"),
  abtestSlackResults:             document.querySelector("#abtest-slack-results"),
  abtestThreads:                  document.querySelector("#abtest-threads"),
  abtestEditBtn:                  document.querySelector("#abtest-edit-btn"),
  abtestEditPanel:                document.querySelector("#abtest-edit-panel"),
  abtestEditClose:                document.querySelector("#abtest-edit-close"),
  abtestEditReset:                document.querySelector("#abtest-edit-reset"),
  editManualAnnouncement:         document.querySelector("#edit-manual-announcement"),
  editAnnouncementUrl:            document.querySelector("#edit-announcement-url"),
  editAnnouncementSubmit:         document.querySelector("#edit-announcement-submit"),
  editAnnouncementStatus:         document.querySelector("#edit-announcement-status"),
  editManualAnalysis:             document.querySelector("#edit-manual-analysis"),
  editAnalysisUrl:                document.querySelector("#edit-analysis-url"),
  editAnalysisSubmit:             document.querySelector("#edit-analysis-submit"),
  editAnalysisStatus:             document.querySelector("#edit-analysis-status"),
  editManualOutcome:              document.querySelector("#edit-manual-outcome"),
  editOutcomeUrl:                 document.querySelector("#edit-outcome-url"),
  editOutcomeSubmit:              document.querySelector("#edit-outcome-submit"),
  editOutcomeStatus:              document.querySelector("#edit-outcome-status"),
  abtestAnalysisListSection:      document.querySelector("#abtest-analysis-list-section"),
  abtestAnalysisDetailSection:    document.querySelector("#abtest-analysis-detail-section"),
  abtestAnalysisListGame:         document.querySelector("#abtest-analysis-list-game"),
  abtestAnalysisListStatus:       document.querySelector("#abtest-analysis-list-status"),
  abtestAnalysisListSearch:       document.querySelector("#abtest-analysis-list-search"),
  abtestAnalysisListMeta:         document.querySelector("#abtest-analysis-list-meta"),
  abtestAnalysisListRoot:         document.querySelector("#abtest-analysis-list-root"),
  abtestAnalysisBackButton:       document.querySelector("#abtest-analysis-back-button"),
  abtestAnalysisDetailTitle:      document.querySelector("#abtest-analysis-detail-title"),
  abtestAnalysisDetailMeta:       document.querySelector("#abtest-analysis-detail-meta"),
  abtestAnalysisForm:             document.querySelector("#abtest-analysis-form"),
  abtestAnalysisGame:             document.querySelector("#abtest-analysis-game"),
  abtestAnalysisId:               document.querySelector("#abtest-analysis-id"),
  abtestAnalysisCacheReset:       document.querySelector("#abtest-analysis-cache-reset"),
  abtestAnalysisCacheResetResult: document.querySelector("#abtest-analysis-cache-reset-result"),
  abtestCacheClearAll:            document.querySelector("#abtest-cache-clear-all"),
  abtestAnalysisEmpty:            document.querySelector("#abtest-analysis-empty"),
  abtestAnalysisLoading:          document.querySelector("#abtest-analysis-loading"),
  abtestAnalysisResults:          document.querySelector("#abtest-analysis-results"),
  abtestAnalysisTestName:         document.querySelector("#abtest-analysis-test-name"),
  abtestAnalysisTestMeta:         document.querySelector("#abtest-analysis-test-meta"),
  abtestAnalysisGroupsGrid:       document.querySelector("#abtest-analysis-groups-grid"),
  abtestAnalysisRetentionMeta:    document.querySelector("#abtest-analysis-retention-meta"),
  abtestAnalysisPreperiod:        document.querySelector("#abtest-analysis-preperiod"),
  abtestAnalysisRanking:              document.querySelector("#abtest-analysis-ranking"),
  chartRevPerUser:                    document.querySelector("#chart-rev-per-user"),
  chartPayerRate:                     document.querySelector("#chart-payer-rate"),
  chartSegWhale:                      document.querySelector("#chart-seg-whale"),
  chartSegNonwhale:                   document.querySelector("#chart-seg-nonwhale"),
  chartSegNonpayer:                   document.querySelector("#chart-seg-nonpayer"),
  chartRetentionDays:                 document.querySelector("#chart-retention-days"),
  abtestPairGroupA:                   document.querySelector("#abtest-pair-group-a"),
  abtestPairGroupB:                   document.querySelector("#abtest-pair-group-b"),
  abtestAnalysisRetention:            document.querySelector("#abtest-analysis-retention"),
  abtestAnalysisRevenue:              document.querySelector("#abtest-analysis-revenue"),
  abtestAnalysisSegmentMeta:          document.querySelector("#abtest-analysis-segment-meta"),
  abtestAnalysisSegmentDist:          document.querySelector("#abtest-analysis-segment-dist"),
  abtestAnalysisSegmentEffects:       document.querySelector("#abtest-analysis-segment-effects"),
  abtestAnalysisSegmentPayerRate:     document.querySelector("#abtest-analysis-segment-payer-rate"),
  abtestAnalysisPostrolloutCard:      document.querySelector("#abtest-analysis-postrollout-card"),
  abtestAnalysisPostrolloutMeta:      document.querySelector("#abtest-analysis-postrollout-meta"),
  abtestAnalysisPostrollout:          document.querySelector("#abtest-analysis-postrollout"),
  tabProductConfig:                    document.querySelector("#tab-product-config"),
  productConfigView:                   document.querySelector("#product-config-view"),
  productConfigListSection:            document.querySelector("#product-config-list-section"),
  productConfigListGame:               document.querySelector("#product-config-list-game"),
  productConfigListSearch:             document.querySelector("#product-config-list-search"),
  productConfigListMeta:               document.querySelector("#product-config-list-meta"),
  productConfigListRoot:               document.querySelector("#product-config-list-root"),
  abtestProductCard:                  document.querySelector("#abtest-analysis-product-card"),
  abtestProductList:                  document.querySelector("#abtest-product-list"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sigBadge(test) {
  if (!test) return '<span class="abtest-sig-na">—</span>';
  const cls = test.sig ? "abtest-sig-yes" : "abtest-sig-no";
  const label = test.sig ? "✓ 유의" : "✗ 비유의";
  const pLabel = test.p < 0.001 ? "p<0.001" : `p=${test.p}`;
  return `<span class="${cls}">${label}</span> <span class="abtest-pval">(${pLabel})</span>`;
}

function bootstrapBadge(test) {
  if (!test) return '<span class="abtest-sig-na">—</span>';
  const cls = test.sig ? "abtest-sig-yes" : "abtest-sig-no";
  const label = test.sig ? "✓ 유의" : "✗ 비유의";
  const pLabel = test.p < 0.001 ? "p<0.001" : `p=${test.p}`;
  return `<span class="${cls}">${label}</span> <span class="abtest-pval">(${pLabel})</span>`;
}

// ── Conclusion helpers ────────────────────────────────────────────────────────

function conclusionOptions(populationWeight) {
  const n = Array.isArray(populationWeight) ? populationWeight.length : 2;
  const nT = n - 1;
  const opts = [{ value: "", label: "—" }];
  opts.push({ value: "rollout-c", label: "롤아웃 - C" });
  if (nT === 1) {
    opts.push({ value: "rollout-t", label: "롤아웃 - T" });
  } else {
    for (let i = 1; i <= nT; i++) opts.push({ value: `rollout-t${i}`, label: `롤아웃 - T${i}` });
  }
  opts.push({ value: "stop", label: "중단" });
  opts.push({ value: "restart", label: "재시작" });
  return opts;
}

function conclusionBadgeClass(value) {
  if (!value) return "";
  if (value === "rollout-c") return "conclusion-badge--rollout-c";
  if (value.startsWith("rollout-t")) return "conclusion-badge--rollout-t";
  if (value === "stop") return "conclusion-badge--stop";
  if (value === "restart") return "conclusion-badge--restart";
  return "";
}

function conclusionRowClass(value) {
  if (!value) return "";
  if (value === "rollout-c") return "abtest-row--rollout-c";
  if (value.startsWith("rollout-t")) return "abtest-row--rollout-t";
  if (value === "stop") return "abtest-row--stop";
  if (value === "restart") return "abtest-row--restart";
  return "";
}

const ROW_CONCLUSION_CLASSES = ["abtest-row--rollout-c", "abtest-row--rollout-t", "abtest-row--stop", "abtest-row--restart"];

function applyRowConclusion(tr, value) {
  tr.classList.remove(...ROW_CONCLUSION_CLASSES);
  if (value) tr.classList.add(conclusionRowClass(value));
}

function conclusionLabel(value, populationWeight) {
  if (!value) return "";
  return (conclusionOptions(populationWeight).find(o => o.value === value) || {}).label || value;
}

function renderConclusionBadge(conclusion, populationWeight) {
  if (!conclusion) return '<span class="conclusion-empty">—</span>';
  const label = conclusionLabel(conclusion, populationWeight);
  return `<span class="conclusion-badge ${conclusionBadgeClass(conclusion)}">${escapeHtml(label)}</span>`;
}

async function saveConclusion(primaryId, value) {
  await fetch("/api/abtest-conclusion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ primaryId, conclusion: value })
  });
}

function fmtNum(v, dec = 0) {
  if (v == null) return "—";
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: dec });
}

function fmtPct(v) {
  if (v == null) return "—";
  return `${Number(v).toFixed(2)}%`;
}

function deltaLabel(ctrl, trt, pct = false) {
  if (ctrl == null || trt == null) return "";
  const d = Number(trt) - Number(ctrl);
  const sign = d >= 0 ? "+" : "";
  if (pct) return `<span class="${d >= 0 ? "abtest-delta-pos" : "abtest-delta-neg"}">${sign}${d.toFixed(2)}pp</span>`;
  const pctD = ctrl != 0 ? (d / Math.abs(ctrl) * 100).toFixed(1) : "—";
  return `<span class="${d >= 0 ? "abtest-delta-pos" : "abtest-delta-neg"}">${sign}${pctD}%</span>`;
}

function renderTable(container, headers, rows) {
  const th = headers.map(h => `<th>${h}</th>`).join("");
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${c ?? "—"}</td>`).join("")}</tr>`).join("");
  container.innerHTML = `<table class="simple-table"><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table>`;
}

const CHART_COLORS = ['#94a3b8', '#0f7173', '#f97316', '#a855f7', '#ec4899', '#10b981'];

// ── Canvas chart helpers ──────────────────────────────────────────────────────

function setupCanvas(canvas, H) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = '';
  canvas.width = 1; // canvas.width(intrinsic) 리셋: style만 지우면 이전 canvas.width값이 부모를 밀어냄
  const W = canvas.parentElement?.clientWidth || 400;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

function drawGrid(ctx, pad, W, H, maxV, steps, formatY) {
  for (let i = 0; i <= steps; i++) {
    const v = maxV * i / steps;
    const y = pad.top + (H - pad.top - pad.bottom) * (1 - i / steps);
    ctx.strokeStyle = '#e5e0d8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#9e9790'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(formatY(v), pad.left - 5, y + 4);
  }
}

// Grouped bar chart: multiple groups per x-label (used for retention)
function drawGroupedBarChart(canvas, { xLabels, groups, formatY = v => fmtNum(v, 1), chartH: fixedH = 220 }) {
  if (!canvas) return;
  const H = fixedH;
  const { ctx, W } = setupCanvas(canvas, H);
  const pad = { top: 28, right: 16, bottom: 44, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const valid = groups.filter(g => g.values.some(v => v != null && v > 0));
  if (!valid.length) return;
  const maxV = Math.max(...valid.flatMap(g => g.values).filter(v => v != null), 0.001) * 1.2;

  drawGrid(ctx, pad, W, H, maxV, 4, formatY);

  const slotW = chartW / xLabels.length;
  const gap = 2;
  const barW = Math.min((slotW - gap * (valid.length + 1)) / valid.length, 36);
  const setW = barW * valid.length + gap * (valid.length - 1);

  xLabels.forEach((label, xi) => {
    const slotCX = pad.left + slotW * xi + slotW / 2;
    valid.forEach((g, gi) => {
      const v = g.values[xi] ?? 0;
      const bh = (v / maxV) * chartH;
      const x = slotCX - setW / 2 + gi * (barW + gap);
      const y = pad.top + chartH - bh;
      ctx.fillStyle = g.color;
      ctx.fillRect(x, y, barW, bh);
    });
    ctx.fillStyle = '#63584f'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(label, slotCX, H - pad.bottom + 14);
  });

  // Legend
  const legendY = H - 8;
  const totalW = valid.reduce((s, g) => s + 10 + 4 + ctx.measureText(g.name).width + 12, 0);
  let lx = W / 2 - totalW / 2;
  valid.forEach(g => {
    ctx.fillStyle = g.color; ctx.fillRect(lx, legendY - 9, 10, 10);
    ctx.fillStyle = '#1d1d1b'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(g.name, lx + 14, legendY);
    lx += 14 + ctx.measureText(g.name).width + 12;
  });
}

// Single retention day: one bar per group, no legend
function drawRetentionDayChart(canvas, { groups, formatY = v => `${fmtNum(v, 1)}%` }) {
  if (!canvas) return;
  const H = 320, W = 130;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const pad = { top: 20, right: 6, bottom: 24, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = groups.map(g => g.value ?? 0);
  const maxV = Math.max(...values.filter(v => v > 0), 0.001) * 1.25;

  // Grid lines (2 lines)
  for (let i = 0; i <= 2; i++) {
    const v = maxV * i / 2;
    const y = pad.top + chartH * (1 - i / 2);
    ctx.strokeStyle = '#e5e0d8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#9e9790'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(formatY(v), pad.left - 3, y + 3);
  }

  const barW = Math.min(chartW / groups.length * 0.6, 14);
  const step = chartW / groups.length;
  groups.forEach((g, i) => {
    const v = g.value ?? 0;
    const bh = (v / maxV) * chartH;
    const x = pad.left + step * i + step / 2 - barW / 2;
    const y = pad.top + chartH - bh;
    ctx.fillStyle = g.color;
    ctx.fillRect(x, y, barW, bh);
    // value label on top
    ctx.fillStyle = '#1d1d1b'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(formatY(v), x + barW / 2, y - 2);
    // group dot at bottom
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.arc(x + barW / 2, H - pad.bottom + 10, 3, 0, Math.PI * 2); ctx.fill();
  });
}

// Shared tooltip element for line charts
function getLineTooltip() {
  let t = document.getElementById('linechart-tooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'linechart-tooltip';
    document.body.appendChild(t);
  }
  return t;
}

// Cumulative line chart: series = [{ name, color, points: [{day, value}] }]
function drawLineChart(canvas, { series, durationDays, formatY = v => fmtNum(v, 2), chartH: fixedH = 360 }) {
  if (!canvas) return;
  const H = fixedH;
  const { ctx, W } = setupCanvas(canvas, H);
  const pad = { top: 16, right: 16, bottom: 36, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const allValues = series.flatMap(s => s.points.map(p => p.value));
  const maxV = Math.max(...allValues.filter(v => v > 0), 0.001) * 1.1;

  drawGrid(ctx, pad, W, H, maxV, 4, formatY);

  // X-axis tick labels
  ctx.fillStyle = '#63584f'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  const xTicks = 4;
  for (let i = 0; i <= xTicks; i++) {
    const day = Math.round(durationDays * i / xTicks);
    const x = pad.left + (day / durationDays) * chartW;
    ctx.fillText(`D${day}`, x, H - pad.bottom + 14);
  }

  // Draw lines (fill in gaps with last cumulative value)
  for (const { name, color, points } of series) {
    if (!points.length) continue;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let prevX = pad.left, prevY = pad.top + chartH;
    let first = true;
    for (const { day, value } of points) {
      const x = pad.left + (day / durationDays) * chartW;
      const y = pad.top + chartH * (1 - value / maxV);
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
      prevX = x; prevY = y;
    }
    ctx.stroke();
  }

  // Legend
  const legendY = H - 8;
  ctx.font = '10px system-ui';
  const totalLegW = series.reduce((s, g) => s + 14 + ctx.measureText(g.name).width + 12, 0);
  let lx = Math.max(pad.left, W / 2 - totalLegW / 2);
  for (const { name, color } of series) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, legendY - 6, 10, 2);
    ctx.fillStyle = '#1d1d1b'; ctx.textAlign = 'left';
    ctx.fillText(name, lx + 14, legendY);
    lx += 14 + ctx.measureText(name).width + 12;
  }

  // Tooltip on hover
  const tooltip = getLineTooltip();

  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    // Find closest point across all series
    let closest = null, minDist = Infinity;
    for (const s of series) {
      for (const p of s.points) {
        const px = pad.left + (p.day / durationDays) * chartW;
        const py = pad.top + chartH * (1 - p.value / maxV);
        const dist = Math.hypot(mx - px, my - py);
        if (dist < minDist) { minDist = dist; closest = { ...p, seriesName: s.name, color: s.color }; }
      }
    }

    if (closest && minDist < 24) {
      tooltip.innerHTML = '';
      const dayEl = document.createElement('div');
      dayEl.className = 'tooltip-day';
      dayEl.textContent = `D${closest.day}`;
      tooltip.appendChild(dayEl);
      for (let si = 0; si < series.length; si++) {
        const s = series[si];
        const pt = s.points.find(p => p.day === closest.day);
        if (!pt) continue;
        const row = document.createElement('div');
        const dot = document.createElement('span');
        dot.className = `tooltip-dot tooltip-dot--${si}`;
        row.appendChild(dot);
        row.appendChild(document.createTextNode(`${s.name}: `));
        const val = document.createElement('strong');
        val.textContent = formatY(pt.value);
        row.appendChild(val);
        tooltip.appendChild(row);
      }
      tooltip.style.display = 'block';
      const tx = e.clientX + 14;
      const ty = e.clientY - tooltip.offsetHeight / 2;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  };

  canvas.onmouseleave = () => { tooltip.style.display = 'none'; };
}

// Combined before/after chart: 1:2 split, independent y-axes per side
function drawBeforeAfterChart(canvas, { groups, preSeries, inSeries, preDays, durationDays, formatY = v => fmtNum(v, 2), chartH: fixedH = 360 }) {
  if (!canvas) return;
  const hasPreData = groups.some(g => (preSeries[g.name] || []).length > 0);
  if (!hasPreData) {
    drawLineChart(canvas, {
      series: groups.map(g => ({ name: g.name, color: g.color, points: inSeries[g.name] || [] })),
      durationDays, formatY, chartH: fixedH,
    });
    return;
  }

  const H = fixedH;
  const { ctx, W } = setupCanvas(canvas, H);
  const pad = { top: 20, right: 60, bottom: 36, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // 1:2 split with gap between pre and in-test
  const gapW = 60;
  const preW   = chartW / 3 - gapW / 2;
  const inW    = chartW * 2 / 3 - gapW / 2;
  const preEndX  = pad.left + preW;
  const inStartX = preEndX + gapW;
  const divX     = preEndX + gapW / 2;

  // Independent y scales
  const preVals = groups.flatMap(g => (preSeries[g.name] || []).map(p => p.value));
  const inVals  = groups.flatMap(g => (inSeries[g.name]  || []).map(p => p.value));
  const maxPre = Math.max(...preVals.filter(v => v > 0), 0.001) * 1.1;
  const maxIn  = Math.max(...inVals.filter(v => v > 0),  0.001) * 1.1;

  const xForPre = day => pad.left + ((day + preDays) / preDays) * preW;
  const xForIn  = day => inStartX + (day / durationDays) * inW;
  const yForPre = val => pad.top + chartH * (1 - val / maxPre);
  const yForIn  = val => pad.top + chartH * (1 - val / maxIn);

  // Background tint for pre-period
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  ctx.fillRect(pad.left, pad.top, preW, chartH);

  // Gap (transparent)

  // Left y-axis grid (pre)
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = maxPre * i / steps;
    const y = pad.top + chartH * (1 - i / steps);
    ctx.strokeStyle = '#e5e0d8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(preEndX, y); ctx.stroke();
    ctx.fillStyle = '#9e9790'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(formatY(v), pad.left - 5, y + 4);
  }

  // Right y-axis grid (in-test)
  for (let i = 0; i <= steps; i++) {
    const v = maxIn * i / steps;
    const y = pad.top + chartH * (1 - i / steps);
    ctx.strokeStyle = '#e5e0d8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(inStartX, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#9e9790'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(formatY(v), W - pad.right + 5, y + 4);
  }

  // X-axis ticks
  ctx.fillStyle = '#63584f'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`D-${preDays}`, xForPre(-preDays), H - pad.bottom + 14);
  ctx.fillText(`D-${Math.round(preDays / 2)}`, xForPre(-Math.round(preDays / 2)), H - pad.bottom + 14);
  for (let i = 0; i <= 4; i++) {
    const day = Math.round(durationDays * i / 4);
    ctx.fillText(`D${day}`, xForIn(day), H - pad.bottom + 14);
  }

  // 할당 label in gap center
  ctx.fillStyle = '#888'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('할당', divX, pad.top - 5);

  // Section labels
  ctx.fillStyle = '#aaa'; ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Before Assign', pad.left + preW / 2, pad.top + 10);
  ctx.fillText('After Assign', inStartX + inW / 2, pad.top + 10);

  // Pre-period lines (dashed)
  for (const g of groups) {
    const pts = (preSeries[g.name] || []).slice().sort((a, b) => a.day - b.day);
    if (!pts.length) continue;
    ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    pts.forEach(({ day, value }, i) => {
      const x = xForPre(day), y = yForPre(value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // In-test lines (solid)
  for (const g of groups) {
    const pts = (inSeries[g.name] || []).slice().sort((a, b) => a.day - b.day);
    if (!pts.length) continue;
    ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    pts.forEach(({ day, value }, i) => {
      const x = xForIn(day), y = yForIn(value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Legend (centered)
  const legendY = H - 8;
  ctx.font = '10px system-ui'; ctx.setLineDash([]);
  const totalLegW = groups.reduce((s, g) => s + 14 + ctx.measureText(g.name).width + 12, 0);
  let lx = Math.max(pad.left, W / 2 - totalLegW / 2);
  for (const g of groups) {
    ctx.fillStyle = g.color; ctx.fillRect(lx, legendY - 6, 10, 2);
    ctx.fillStyle = '#1d1d1b'; ctx.textAlign = 'left';
    ctx.fillText(g.name, lx + 14, legendY);
    lx += 14 + ctx.measureText(g.name).width + 12;
  }

  // Tooltip
  const tooltip = getLineTooltip();
  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const isPre = mx < divX;

    let closest = null, minDist = Infinity;
    if (isPre) {
      for (const g of groups) {
        for (const p of (preSeries[g.name] || [])) {
          const px = xForPre(p.day), py = yForPre(p.value);
          const dist = Math.hypot(mx - px, (e.clientY - rect.top) * (H / rect.height) - py);
          if (dist < minDist) { minDist = dist; closest = { ...p, side: 'pre', groupName: g.name }; }
        }
      }
    } else {
      for (const g of groups) {
        for (const p of (inSeries[g.name] || [])) {
          const px = xForIn(p.day), py = yForIn(p.value);
          const dist = Math.hypot(mx - px, (e.clientY - rect.top) * (H / rect.height) - py);
          if (dist < minDist) { minDist = dist; closest = { ...p, side: 'in', groupName: g.name }; }
        }
      }
    }

    if (closest && minDist < 24) {
      tooltip.innerHTML = '';
      const dayEl = document.createElement('div');
      dayEl.className = 'tooltip-day';
      dayEl.textContent = `D${closest.day}`;
      tooltip.appendChild(dayEl);
      const src = isPre ? preSeries : inSeries;
      groups.forEach((g, si) => {
        const pt = (src[g.name] || []).find(p => p.day === closest.day);
        if (!pt) return;
        const row = document.createElement('div');
        const dot = document.createElement('span');
        dot.className = `tooltip-dot tooltip-dot--${si}`;
        row.appendChild(dot);
        row.appendChild(document.createTextNode(`${g.name}: `));
        const val = document.createElement('strong');
        val.textContent = formatY(pt.value);
        row.appendChild(val);
        tooltip.appendChild(row);
      });
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY - tooltip.offsetHeight / 2) + 'px';
    } else { tooltip.style.display = 'none'; }
  };
  canvas.onmouseleave = () => { tooltip.style.display = 'none'; };
}

// Build cumulative pre-period series from dailyPreRevRows (D-30 ~ D-1)
function buildPreCumulativeSeries(data) {
  const { allGroupNames, groups, dailyPreRevRows } = data;
  const totalN = {};
  for (const g of groups) totalN[g.group_name] = Number(g.n) || 1;

  const rows = dailyPreRevRows || [];
  const revPerUserSeries = {};
  const payerRateSeries = {};
  for (const name of allGroupNames) {
    const n = totalN[name];
    const byDay = {};
    for (const r of rows.filter(r => r.group_name === name)) {
      const d = Number(r.day_num);
      byDay[d] = { revenue: Number(r.daily_revenue), payers: Number(r.new_payers) };
    }
    const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
    let cumRev = 0, cumPayers = 0;
    const revPts = [], payerPts = [];
    for (const day of days) {
      cumRev += byDay[day].revenue;
      cumPayers += byDay[day].payers;
      revPts.push({ day, value: cumRev / n });
      payerPts.push({ day, value: cumPayers / n * 100 });
    }
    revPerUserSeries[name] = revPts;
    payerRateSeries[name] = payerPts;
  }
  return { revPerUserSeries, payerRateSeries };
}

// Build cumulative series from dailyRevRows
function buildCumulativeSeries(data) {
  const { allGroupNames, groups, dailyRevRows, segmentAnalysis } = data;
  const totalN = {};
  for (const g of groups) totalN[g.group_name] = Number(g.n) || 1;

  // segment user counts from segDist
  const segUserN = {};
  for (const name of allGroupNames) {
    segUserN[name] = {};
    for (const [seg, counts] of Object.entries(segmentAnalysis?.segDist || {})) {
      segUserN[name][seg] = Number(counts[name] || 0) || 1;
    }
  }

  const rows = dailyRevRows || [];

  const revPerUserSeries = {};
  const payerRateSeries = {};
  for (const name of allGroupNames) {
    const n = totalN[name];
    const byDay = {};
    for (const r of rows.filter(r => r.group_name === name)) {
      const d = Number(r.day_num);
      if (!byDay[d]) byDay[d] = { revenue: 0, new_payers: 0 };
      byDay[d].revenue += Number(r.daily_revenue);
      byDay[d].new_payers += Number(r.new_payers);
    }
    const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
    let cumRev = 0, cumPayers = 0;
    const revPts = [], payerPts = [];
    for (const day of days) {
      cumRev += byDay[day].revenue;
      cumPayers += byDay[day].new_payers;
      revPts.push({ day, value: cumRev / n });
      payerPts.push({ day, value: cumPayers / n * 100 });
    }
    revPerUserSeries[name] = revPts;
    payerRateSeries[name] = payerPts;
  }

  // Segment cumulative rev / segment user
  const allSegs = ['Whale', 'Non-whale', 'Non-payer'];
  const segRevSeries = {};
  for (const seg of allSegs) {
    segRevSeries[seg] = {};
    for (const name of allGroupNames) {
      const segN = segUserN[name]?.[seg] || 1;
      const byDay = {};
      for (const r of rows.filter(r => r.group_name === name && r.segment === seg)) {
        const d = Number(r.day_num);
        byDay[d] = (byDay[d] || 0) + Number(r.daily_revenue);
      }
      const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
      let cum = 0;
      const pts = [];
      for (const day of days) {
        cum += byDay[day];
        pts.push({ day, value: cum / segN });
      }
      segRevSeries[seg][name] = pts;
    }
  }

  return { revPerUserSeries, payerRateSeries, segRevSeries };
}

function renderGroupCharts(data) {
  const { allGroupNames, groupSummary, segmentAnalysis, meta } = data;
  const groups = allGroupNames.map((name, i) => ({ name, color: CHART_COLORS[i] || '#888' }));
  const durationDays = meta.durationDays || 1;

  const { revPerUserSeries: preRevSeries, payerRateSeries: prePayerSeries } = buildPreCumulativeSeries(data);
  const { revPerUserSeries, payerRateSeries, segRevSeries } = buildCumulativeSeries(data);

  // Combined before/after: Revenue / Assigned User
  drawBeforeAfterChart(el.chartRevPerUser, {
    groups,
    preSeries: preRevSeries,
    inSeries: revPerUserSeries,
    preDays: 30,
    durationDays,
    formatY: v => `$${fmtNum(v, 2)}`,
  });

  // Combined before/after: Payer Rate
  drawBeforeAfterChart(el.chartPayerRate, {
    groups,
    preSeries: prePayerSeries,
    inSeries: payerRateSeries,
    preDays: 30,
    durationDays,
    formatY: v => `${fmtNum(v, 1)}%`,
  });

  // Segment Revenue cumulative line charts
  const segCanvases = { Whale: el.chartSegWhale, 'Non-whale': el.chartSegNonwhale, 'Non-payer': el.chartSegNonpayer };
  for (const [seg, canvas] of Object.entries(segCanvases)) {
    drawLineChart(canvas, {
      series: groups.map(g => ({ name: g.name, color: g.color, points: segRevSeries[seg]?.[g.name] || [] })),
      durationDays,
      formatY: v => `$${fmtNum(v, 0)}`,
    });
  }

  // Retention: one small chart per day, horizontal row
  const activeDays = ALL_RETENTION_DAYS.filter(d => d.n < durationDays);
  const retContainer = el.chartRetentionDays;
  if (retContainer && activeDays.length) {
    retContainer.innerHTML = '';
    for (const d of activeDays) {
      const item = document.createElement('div');
      item.className = 'retention-day-item';
      const label = document.createElement('p');
      label.className = 'retention-day-label';
      label.textContent = d.label;
      const canvas = document.createElement('canvas');
      item.appendChild(label);
      item.appendChild(canvas);
      retContainer.appendChild(item);
      drawRetentionDayChart(canvas, {
        groups: groups.map(g => ({
          name: g.name,
          color: g.color,
          value: groupSummary[g.name]?.retention?.[d.key] ?? null,
        })),
      });
    }
  }
}

const ALL_RETENTION_DAYS = [
  { key: 'd1',   label: 'D1',   n: 1   },
  { key: 'd3',   label: 'D3',   n: 3   },
  { key: 'd7',   label: 'D7',   n: 7   },
  { key: 'd14',  label: 'D14',  n: 14  },
  { key: 'd21',  label: 'D21',  n: 21  },
  { key: 'd30',  label: 'D30',  n: 30  },
  { key: 'd60',  label: 'D60',  n: 60  },
  { key: 'd90',  label: 'D90',  n: 90  },
  { key: 'd120', label: 'D120', n: 120 },
  { key: 'd150', label: 'D150', n: 150 },
  { key: 'd180', label: 'D180', n: 180 },
  { key: 'd360', label: 'D360', n: 360 },
];

// pairRet: pairRetention[key], groupA/B: 선택된 두 그룹명, colorA/B: 색상
function renderRetentionChart(pairRet, groupA, groupB, colorA, colorB, durationDays) {
  const canvas = el.abtestAnalysisRetention;
  if (!canvas) return;

  const days = ALL_RETENTION_DAYS.filter(d => d.n < durationDays);
  if (days.length < 2) return;

  const series = [
    { name: groupA, color: colorA, values: days.map(d => pairRet?.[d.key]?.a_rate ?? null) },
    { name: groupB, color: colorB, values: days.map(d => pairRet?.[d.key]?.b_rate ?? null) },
  ];

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth || 600;
  const H = 240;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD = { top: 20, right: 24, bottom: 58, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = series.flatMap(s => s.values).filter(v => v !== null);
  if (!allVals.length) return;
  const rawMax = Math.max(...allVals);
  const yMax = Math.ceil(rawMax / 5) * 5 + 5;
  const yMin = 0;

  const xAt = i => PAD.left + (days.length > 1 ? i / (days.length - 1) : 0.5) * chartW;
  const yAt = v => PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  ctx.clearRect(0, 0, W, H);

  // Grid + Y labels
  const yTicks = 5;
  ctx.font = `${11 * dpr / dpr}px system-ui, sans-serif`;
  for (let i = 0; i <= yTicks; i++) {
    const v = yMin + (yMax - yMin) * i / yTicks;
    const y = yAt(v);
    ctx.strokeStyle = 'rgba(29,29,27,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(0) + '%', PAD.left - 6, y);
  }

  // X labels
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  days.forEach((d, i) => {
    ctx.fillText(d.label, xAt(i), PAD.top + chartH + 8);
  });

  // Lines + dots
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let moved = false;
    s.values.forEach((v, i) => {
      if (v === null) { moved = false; return; }
      if (!moved) { ctx.moveTo(xAt(i), yAt(v)); moved = true; }
      else ctx.lineTo(xAt(i), yAt(v));
    });
    ctx.stroke();

    s.values.forEach((v, i) => {
      if (v === null) return;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(xAt(i), yAt(v), 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(xAt(i), yAt(v), 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  // Legend (bottom center)
  const legendY = PAD.top + chartH + 30;
  const SWATCH = 12;
  const GAP = 6;
  const SPACING = 24;
  ctx.textBaseline = 'middle';
  ctx.font = `11px system-ui, sans-serif`;

  // Measure total legend width to center it
  const itemWidths = series.map(s => SWATCH + GAP + ctx.measureText(s.name).width);
  const totalW = itemWidths.reduce((a, b) => a + b, 0) + SPACING * (series.length - 1);
  let lx = PAD.left + (chartW - totalW) / 2;

  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, legendY - 2, SWATCH, 3);
    ctx.fillStyle = '#63584f';
    ctx.textAlign = 'left';
    ctx.fillText(s.name, lx + SWATCH + GAP, legendY);
    lx += SWATCH + GAP + ctx.measureText(s.name).width + SPACING;
  }
}

// 현재 로드된 분석 데이터 (쌍 선택 시 재렌더링용)
let _analysisData = null;

function getPairKey(data, a, b) {
  const ai = data.allGroupNames.indexOf(a), bi = data.allGroupNames.indexOf(b);
  return ai <= bi ? `${a}|${b}` : `${b}|${a}`;
}

// 쌍 데이터 조회 (a/b 방향 정규화 포함)
function lookupPair(pairObj, groupA, groupB, allGroupNames) {
  const ai = allGroupNames.indexOf(groupA), bi = allGroupNames.indexOf(groupB);
  const flipped = ai > bi;
  const key = flipped ? `${groupB}|${groupA}` : `${groupA}|${groupB}`;
  const d = pairObj?.[key];
  if (!d) return null;
  if (!flipped) return d;
  // flipped: a↔b 교환, Bootstrap diff 부호 반전
  const flipTest = t => t ? { ...t, diff: -t.diff, ci_lo: -t.ci_hi, ci_hi: -t.ci_lo } : t;
  return { ...d, a: d.b, b: d.a, allUserTest: flipTest(d.allUserTest), payerOnlyTest: flipTest(d.payerOnlyTest) };
}

function pickRetentionDays(durationDays) {
  const active = ALL_RETENTION_DAYS.filter(d => d.n < durationDays);
  if (active.length === 0) return [];
  if (active.length === 1) return [active[0]];
  if (active.length === 2) return [active[0], active[active.length - 1]];
  // 단기: 첫번째, 중기: duration/4에 가장 가까운 날, 장기: 마지막
  const short = active[0];
  const long  = active[active.length - 1];
  const midTarget = durationDays / 4;
  const midCandidates = active.slice(1, -1); // short·long 제외
  const mid = midCandidates.reduce((best, d) =>
    Math.abs(d.n - midTarget) < Math.abs(best.n - midTarget) ? d : best
  );
  return [short, mid, long];
}

function renderRankingCard(data) {
  const { allGroupNames, groupSummary, meta } = data;
  if (!el.abtestAnalysisRanking) return;

  const retDays = pickRetentionDays(meta.durationDays);
  // 컬럼별 최고값 (전체 그룹 기준 - Control보다 높을 때만 ▲ 표시되도록)
  const bestRev   = Math.max(...allGroupNames.map(n => groupSummary[n]?.revPerUser ?? -Infinity));
  const bestPayer = Math.max(...allGroupNames.map(n => groupSummary[n]?.payerRate ?? -Infinity));
  const bestRet   = retDays.map(d =>
    Math.max(...allGroupNames.map(n => groupSummary[n]?.retention?.[d.key] ?? -Infinity))
  );

  // Pre Rev/User: 전체 그룹 중 최고/최저 (균형 확인용)
  const preRevVals = allGroupNames.map(n => groupSummary[n]?.preRevPerUser ?? null).filter(v => v != null);
  const bestPreRev = preRevVals.length ? Math.max(...preRevVals) : null;
  const worstPreRev = preRevVals.length ? Math.min(...preRevVals) : null;
  const onlyOne = bestPreRev === worstPreRev;

  const headers = ["그룹", "N", '<span class="ranking-ref-header">할당 전 30일 매출</span>', "Revenue/User", "Payer Rate", ...retDays.map(d => d.label + " Ret")];

  renderTable(el.abtestAnalysisRanking,
    headers,
    allGroupNames.map(name => {
      const s = groupSummary[name];
      const winBadge = (val, best) => val === best ? ' <span class="ranking-winner">▲</span>' : '';
      const preV = s.preRevPerUser;
      const preArrow = !onlyOne && preV === bestPreRev
        ? ' <span class="ranking-pre-hi">▲</span>'
        : '';
      const preRevCell = `<span class="ranking-ref-val">$${fmtNum(preV, 2)}${preArrow}</span>`;
      const revCell   = `$${fmtNum(s.revPerUser, 2)}${winBadge(s.revPerUser, bestRev)}`;
      const payerCell = `${fmtPct(s.payerRate)}${winBadge(s.payerRate, bestPayer)}`;
      const retCells  = retDays.map((d, i) => {
        const v = s.retention?.[d.key];
        return v != null ? `${fmtPct(v)}${winBadge(v, bestRet[i])}` : "—";
      });
      return [escapeHtml(name), fmtNum(s.n), preRevCell, revCell, payerCell, ...retCells];
    })
  );
}

function setupPairSelector(data) {
  const { allGroupNames, controlName } = data;
  if (!el.abtestPairGroupA || !el.abtestPairGroupB) return;

  const makeOptions = (selected) => allGroupNames.map(name =>
    `<option value="${escapeHtml(name)}"${name === selected ? " selected" : ""}>${escapeHtml(name)}</option>`
  ).join("");

  const defaultA = allGroupNames[0];
  const defaultB = allGroupNames[1] || allGroupNames[0];
  el.abtestPairGroupA.innerHTML = makeOptions(defaultA);
  el.abtestPairGroupB.innerHTML = makeOptions(defaultB);

  el.abtestPairGroupA.onchange = () => renderPairDetail(_analysisData, el.abtestPairGroupA.value, el.abtestPairGroupB.value);
  el.abtestPairGroupB.onchange = () => renderPairDetail(_analysisData, el.abtestPairGroupA.value, el.abtestPairGroupB.value);
}

// ─── Product Breakdown ────────────────────────────────────────────────────────

let _productSelectedTypes = null; // persists checkbox state across pair changes

function buildProductCumulativeSeriesForType(data, groupA, groupB, pt) {
  const { groups, dailyProductRows } = data;
  const groupN = {};
  for (const g of groups) groupN[g.group_name] = Number(g.n) || 1;
  const rows = (dailyProductRows || []).filter(r => r.product_type === pt);
  const result = {};
  for (const name of [groupA, groupB]) {
    const byDay = {};
    for (const r of rows.filter(r => r.group_name === name)) {
      const d = Number(r.day_num);
      byDay[d] = (byDay[d] || 0) + Number(r.daily_revenue);
    }
    const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
    let cum = 0;
    const pts = [];
    for (const day of days) {
      cum += byDay[day];
      pts.push({ day, value: cum / groupN[name] });
    }
    result[name] = pts;
  }
  return result;
}

function renderProductBreakdown(data, groupA, groupB) {
  const { productAnalysis, allGroupNames, meta } = data;
  if (!el.abtestProductCard || !el.abtestProductList) return;
  if (!productAnalysis?.allProductTypes?.length) {
    el.abtestProductCard.hidden = true;
    return;
  }
  el.abtestProductCard.hidden = false;

  const allTypes = productAnalysis.allProductTypes;
  const ai = allGroupNames.indexOf(groupA), bi = allGroupNames.indexOf(groupB);
  const flipped = ai > bi;
  const key = flipped ? `${groupB}|${groupA}` : `${groupA}|${groupB}`;
  const pairData = productAnalysis.pairProductEffects?.[key] || {};

  // Sort: non-Others by abs delta desc, Others at end
  const sorted = allTypes
    .map(pt => {
      const e = pairData[pt];
      if (!e) return null;
      const a = flipped ? e.b : e.a;
      const b = flipped ? e.a : e.b;
      const test = e.test ? (flipped ? { ...e.test, diff: -(e.test.diff ?? 0), ci_lo: -(e.test.ci_hi ?? 0), ci_hi: -(e.test.ci_lo ?? 0) } : e.test) : null;
      return { pt, a, b, test, absDelta: Math.abs(a.mean - b.mean) };
    })
    .filter(Boolean)
    .sort((x, y) => {
      if (x.pt === 'Others') return 1;
      if (y.pt === 'Others') return -1;
      return y.absDelta - x.absDelta;
    });

  el.abtestProductList.innerHTML = "";
  const colorA = CHART_COLORS[allGroupNames.indexOf(groupA)] || '#888';
  const colorB = CHART_COLORS[allGroupNames.indexOf(groupB)] || '#888';

  for (const { pt, a, b, test } of sorted) {
    const wrap = document.createElement("div");
    wrap.className = "product-breakdown-item";

    // header row: name + stats + sig
    const header = document.createElement("div");
    header.className = "product-breakdown-header";
    header.innerHTML = `
      <span class="product-breakdown-name">${escapeHtml(pt)}</span>
      <span class="product-breakdown-stat">${escapeHtml(groupA)}: <strong>$${fmtNum(a.mean, 2)}</strong></span>
      <span class="product-breakdown-stat">${escapeHtml(groupB)}: <strong>$${fmtNum(b.mean, 2)}</strong></span>
      <span class="product-breakdown-stat">Delta: ${deltaLabel(a.mean, b.mean)}</span>
      <span class="product-breakdown-stat">Payer Rate: ${fmtPct(a.payerRate)} / ${fmtPct(b.payerRate)}</span>
      <span class="product-breakdown-sig">${bootstrapBadge(test)}</span>`;
    wrap.appendChild(header);

    // chart
    const seriesMap = buildProductCumulativeSeriesForType(data, groupA, groupB, pt);
    const hasData = [groupA, groupB].some(n => (seriesMap[n] || []).length > 0);
    if (hasData) {
      const canvas = document.createElement("canvas");
      canvas.className = "product-breakdown-canvas";
      wrap.appendChild(canvas);
      // draw after append (needs layout)
      requestAnimationFrame(() => {
        drawLineChart(canvas, {
          series: [
            { name: groupA, color: colorA, points: seriesMap[groupA] || [] },
            { name: groupB, color: colorB, points: seriesMap[groupB] || [] },
          ],
          durationDays: meta.durationDays || 1,
          formatY: v => `$${fmtNum(v, 2)}`,
          chartH: 160,
        });
      });
    }

    el.abtestProductList.appendChild(wrap);
  }
}

function renderPairDetail(data, groupA, groupB) {
  if (!data) return;
  const { allGroupNames, pairRevenue, pairRetention, pairPrePeriod, pairPostRollout, segmentAnalysis, meta } = data;
  const colorA = CHART_COLORS[allGroupNames.indexOf(groupA)] || '#888';
  const colorB = CHART_COLORS[allGroupNames.indexOf(groupB)] || '#888';
  const activeDays = ALL_RETENTION_DAYS.filter(d => d.n < meta.durationDays);
  const DAYS = activeDays.map(d => d.key);
  const DAY_LABELS = activeDays.map(d => d.label);

  // Pre-period
  const pre = lookupPair(pairPrePeriod, groupA, groupB, allGroupNames);
  if (pre) {
    renderTable(el.abtestAnalysisPreperiod,
      ["지표", escapeHtml(groupA), escapeHtml(groupB), "Delta", "유의성"],
      [
        ["Revenue/Assigned User", `$${fmtNum(pre.revenue.a, 2)}`, `$${fmtNum(pre.revenue.b, 2)}`, deltaLabel(pre.revenue.a, pre.revenue.b), sigBadge(pre.revenue.test)],
        ["Payer Rate", `${fmtNum(pre.payerRate.a, 1)}%`, `${fmtNum(pre.payerRate.b, 1)}%`, deltaLabel(pre.payerRate.a, pre.payerRate.b), sigBadge(pre.payerRate.test)],
        ["Revenue/Payer",`$${fmtNum(pre.revenuePerPayer.a, 2)}`, `$${fmtNum(pre.revenuePerPayer.b, 2)}`, deltaLabel(pre.revenuePerPayer.a, pre.revenuePerPayer.b), sigBadge(pre.revenuePerPayer.test)],
      ]
    );
  }

  // Retention
  const retPair = lookupPair(pairRetention, groupA, groupB, allGroupNames);
  renderTable(el.abtestAnalysisRetention,
    ["Day", escapeHtml(groupA), escapeHtml(groupB), "Delta", "유의성"],
    DAYS.map((d, i) => {
      const r = retPair?.[d];
      if (!r) return [DAY_LABELS[i], "—", "—", "—", "—"];
      return [DAY_LABELS[i], fmtPct(r.a_rate), fmtPct(r.b_rate), deltaLabel(r.a_rate, r.b_rate, true), sigBadge(r.test)];
    })
  );

  // Revenue
  const rev = lookupPair(pairRevenue, groupA, groupB, allGroupNames);
  if (rev) {
    const a = rev.a, b = rev.b;
    const cuperMeans = rev.cuperMeans || { a: 0, b: 0 };
    const cuperFlipped = allGroupNames.indexOf(groupA) > allGroupNames.indexOf(groupB);
    const cuperA = cuperFlipped ? cuperMeans.b : cuperMeans.a;
    const cuperB = cuperFlipped ? cuperMeans.a : cuperMeans.b;
    const cuperTest = rev.cuperTest ? (cuperFlipped ? { ...rev.cuperTest, diff: -rev.cuperTest.diff, ci_lo: -rev.cuperTest.ci_hi, ci_hi: -rev.cuperTest.ci_lo } : rev.cuperTest) : null;
    const rho = data.cuperRho ?? null;

    const cuperLabel = rho !== null
      ? `[CUPED adj] Revenue / Assigned User <span class="cuped-theta">(ρ=${rho})</span>`
      : "[CUPED adj] Revenue / Assigned User";
    renderTable(el.abtestAnalysisRevenue,
      ["지표", escapeHtml(groupA), escapeHtml(groupB), "Delta", "검정", "유의성"],
      [
        ["Revenue/Assigned User", `$${fmtNum(a.mean, 2)}`, `$${fmtNum(b.mean, 2)}`, deltaLabel(a.mean, b.mean), "Bootstrap", bootstrapBadge(rev.allUserTest)],
        [cuperLabel, `$${fmtNum(cuperA, 2)}`, `$${fmtNum(cuperB, 2)}`, deltaLabel(cuperA, cuperB), "Bootstrap", bootstrapBadge(cuperTest)],
        ["Payer Rate", fmtPct(a.n ? a.nonZeroCount/a.n*100 : 0), fmtPct(b.n ? b.nonZeroCount/b.n*100 : 0), deltaLabel(a.n ? a.nonZeroCount/a.n*100 : 0, b.n ? b.nonZeroCount/b.n*100 : 0, true), "z-test", sigBadge(rev.payerRateTest)],
        ["Revenue/Payer", `$${fmtNum(a.nonZeroMean, 2)}`, `$${fmtNum(b.nonZeroMean, 2)}`, deltaLabel(a.nonZeroMean, b.nonZeroMean), "Bootstrap", bootstrapBadge(rev.payerOnlyTest)],
      ]
    );
  }

  // Segment
  const sa = segmentAnalysis;
  if (sa) {
    const ss = sa.segmentStats || {};
    function segLabel(seg) {
      const s = ss[seg];
      if (!s) return seg;
      return `${seg} ($${fmtNum(s.min, 0)} ~ $${fmtNum(s.max, 0)})`;
    }

    const aTotal = sa.segmentOrder.reduce((s, seg) => s + (sa.segDist[seg]?.[groupA] || 0), 0);
    const bTotal = sa.segmentOrder.reduce((s, seg) => s + (sa.segDist[seg]?.[groupB] || 0), 0);
    renderTable(el.abtestAnalysisSegmentDist,
      ["세그먼트", `${escapeHtml(groupA)} (n)`, `${escapeHtml(groupB)} (n)`, `비율 (A)`, `비율 (B)`],
      sa.segmentOrder.map(seg => {
        const an = sa.segDist[seg]?.[groupA] || 0, bn = sa.segDist[seg]?.[groupB] || 0;
        return [segLabel(seg), an.toLocaleString(), bn.toLocaleString(), fmtPct(aTotal ? an/aTotal*100 : 0), fmtPct(bTotal ? bn/bTotal*100 : 0)];
      })
    );

    const segPair = lookupPair(sa.pairSegmentEffects, groupA, groupB, allGroupNames);
    renderTable(el.abtestAnalysisSegmentEffects,
      ["세그먼트", `Rev/User (${escapeHtml(groupA)})`, `Rev/User (${escapeHtml(groupB)})`, "Delta", "검정", "유의성"],
      sa.segmentOrder.map(seg => {
        const e = segPair?.[seg];
        if (!e) return [segLabel(seg), "—", "—", "—", "—", "—"];
        if (seg === "Whale") {
          return [segLabel(seg), `$${fmtNum(e.a.mean, 2)}`, `$${fmtNum(e.b.mean, 2)}`, deltaLabel(e.a.mean, e.b.mean), "Bootstrap (raw)", bootstrapBadge(e.test)];
        } else if (seg === "Non-whale") {
          return [segLabel(seg), `$${fmtNum(e.a.mean, 2)}`, `$${fmtNum(e.b.mean, 2)}`, deltaLabel(e.a.mean, e.b.mean), "Bootstrap (log)", bootstrapBadge(e.test)];
        } else {
          return [segLabel(seg), `$${fmtNum(e.a.mean, 2)}`, `$${fmtNum(e.b.mean, 2)}`, deltaLabel(e.a.mean, e.b.mean), "Bootstrap (log)", bootstrapBadge(e.test)];
        }
      })
    );
    renderTable(el.abtestAnalysisSegmentPayerRate,
      ["세그먼트", `Payer Rate (${escapeHtml(groupA)})`, `Payer Rate (${escapeHtml(groupB)})`, "Delta", "검정", "유의성"],
      sa.segmentOrder.map(seg => {
        const e = segPair?.[seg];
        if (!e) return [segLabel(seg), "—", "—", "—", "—", "—"];
        const ar = e.a.n ? e.a.nonZeroCount / e.a.n * 100 : 0;
        const br = e.b.n ? e.b.nonZeroCount / e.b.n * 100 : 0;
        return [segLabel(seg), fmtPct(ar), fmtPct(br), deltaLabel(ar, br, true), "z-test", sigBadge(e.payerRateTest)];
      })
    );
  }

  // Product Breakdown
  renderProductBreakdown(data, groupA, groupB);

  // Post-rollout
  const pr = lookupPair(pairPostRollout, groupA, groupB, allGroupNames);
  if (pr && el.abtestAnalysisPostrolloutCard) {
    el.abtestAnalysisPostrolloutCard.hidden = false;

    renderTable(el.abtestAnalysisPostrollout,
      ["지표", escapeHtml(groupA), escapeHtml(groupB), "Delta", "검정", "유의성"],
      [
        ["Revenue/Assigned User", `$${fmtNum(pr.a.mean, 2)}`, `$${fmtNum(pr.b.mean, 2)}`, deltaLabel(pr.a.mean, pr.b.mean, true), "Bootstrap", bootstrapBadge(pr.allUserTest)],
        ["Payer Rate", fmtPct(pr.a.n ? pr.a.nonZeroCount/pr.a.n*100 : 0), fmtPct(pr.b.n ? pr.b.nonZeroCount/pr.b.n*100 : 0), deltaLabel(pr.a.n ? pr.a.nonZeroCount/pr.a.n*100 : 0, pr.b.n ? pr.b.nonZeroCount/pr.b.n*100 : 0, true), "z-test", sigBadge(pr.payerRateTest)],
        ["Revenue/Payer", `$${fmtNum(pr.a.nonZeroMean, 2)}`, `$${fmtNum(pr.b.nonZeroMean, 2)}`, deltaLabel(pr.a.nonZeroMean, pr.b.nonZeroMean, true), "Bootstrap", bootstrapBadge(pr.allUserTest)],
      ]
    );
  } else if (el.abtestAnalysisPostrolloutCard) {
    el.abtestAnalysisPostrolloutCard.hidden = true;
  }
}

function applyGroupRename(data) {
  const treatments = (data.allGroupNames || []).filter(n => n !== data.controlName);
  if (treatments.length < 2) return data; // T 1개면 그대로
  // 'Treatment' → 'Treatment 1' 만 필요 (Treatment 2, 3... 은 이미 올바름)
  const renameMap = { 'Treatment': 'Treatment 1' };
  const rename = name => renameMap[name] ?? name;
  const renamePairKeys = obj => {
    if (!obj) return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const newKey = k.split('|').map(rename).join('|');
      out[newKey] = v;
    }
    return out;
  };
  return {
    ...data,
    controlName: rename(data.controlName),
    allGroupNames: data.allGroupNames.map(rename),
    groups: data.groups.map(g => ({ ...g, group_name: rename(g.group_name) })),
    groupSummary: renamePairKeys(data.groupSummary),
    pairRevenue: renamePairKeys(data.pairRevenue),
    pairRetention: renamePairKeys(data.pairRetention),
    pairPrePeriod: renamePairKeys(data.pairPrePeriod),
    pairPostRollout: renamePairKeys(data.pairPostRollout),
    segmentAnalysis: data.segmentAnalysis ? {
      ...data.segmentAnalysis,
      groupSegmentRevenue: Object.fromEntries(
        Object.entries(data.segmentAnalysis.groupSegmentRevenue || {}).map(([g, v]) => [rename(g), v])
      ),
      segDist: Object.fromEntries(
        Object.entries(data.segmentAnalysis.segDist || {}).map(([seg, groupCounts]) => [
          seg,
          Object.fromEntries(Object.entries(groupCounts).map(([g, c]) => [rename(g), c]))
        ])
      ),
      pairSegmentEffects: renamePairKeys(data.segmentAnalysis.pairSegmentEffects),
    } : data.segmentAnalysis,
    dailyRevRows: (data.dailyRevRows || []).map(r => ({ ...r, group_name: rename(r.group_name) })),
    dailyPreRevRows: (data.dailyPreRevRows || []).map(r => ({ ...r, group_name: rename(r.group_name) })),
    dailyProductRows: (data.dailyProductRows || []).map(r => ({ ...r, group_name: rename(r.group_name) })),
    productAnalysis: data.productAnalysis ? {
      ...data.productAnalysis,
      pairProductEffects: renamePairKeys(data.productAnalysis.pairProductEffects),
    } : data.productAnalysis,
  };
}

function renderResult(data) {
  _analysisData = data;
  _productSelectedTypes = null; // reset on new analysis
  const { meta, groups, allGroupNames } = data;

  // Meta
  el.abtestAnalysisTestName.textContent = `[${meta.id}] ${meta.name}`;
  el.abtestAnalysisTestMeta.textContent = "";


  // Groups grid
  el.abtestAnalysisGroupsGrid.innerHTML = groups.map(g =>
    `<div class="summary-card"><p class="summary-label">${escapeHtml(g.group_name)}</p><p class="summary-value">${fmtNum(g.n)}</p><p class="summary-sub">assigned users</p></div>`
  ).join("");

  // 랭킹 카드
  renderRankingCard(data);

  // 쌍 선택기 셋업 + 기본 쌍 렌더링
  setupPairSelector(data);
  renderPairDetail(data, allGroupNames[0], allGroupNames[1] || allGroupNames[0]);

  el.abtestAnalysisEmpty.hidden = true;
  el.abtestAnalysisLoading.hidden = true;
  el.abtestAnalysisResults.hidden = false;
  if (el.abtestAnalysisCacheResetResult) el.abtestAnalysisCacheResetResult.hidden = false;

  // 그룹 차트: 결과 div가 visible 된 후 레이아웃 확정되고 나서 그려야 clientWidth가 정상
  requestAnimationFrame(() => renderGroupCharts(data));
}

async function runFlow() {
  const abTestId = el.abtestAnalysisId?.value?.trim();
  const gameCode = el.abtestAnalysisGame?.value || "cvs";
  if (!abTestId) return;

  el.abtestAnalysisEmpty.hidden = true;
  el.abtestAnalysisResults.hidden = true;
  el.abtestAnalysisLoading.hidden = false;

  try {
    const response = await fetch("/api/abtest-analysis/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abTestId, gameCode })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "분석 실패");
    renderResult(applyGroupRename(data));
  } catch (err) {
    el.abtestAnalysisLoading.hidden = true;
    el.abtestAnalysisEmpty.hidden = false;
    el.abtestAnalysisEmpty.innerHTML = `<strong>오류가 발생했습니다.</strong><p>${escapeHtml(err.message)}</p>`;
  }
}

// Session info
try {
  const res = await fetch("/api/session");
  const session = await res.json();
  if (el.viewerEmail) el.viewerEmail.textContent = session.email || "unknown";
  if (el.modePill) {
    el.modePill.textContent = session.mode || "unknown";
    el.modePill.className = `mode-pill mode-pill--${session.mode || "unknown"}`;
  }
} catch { /* ignore */ }

el.abtestAnalysisForm?.addEventListener("submit", event => {
  event.preventDefault();
  runFlow();
});

el.abtestCacheClearAll?.addEventListener("click", async () => {
  if (!confirm("전체 캐시를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
  el.abtestCacheClearAll.textContent = "초기화 중...";
  el.abtestCacheClearAll.disabled = true;
  await fetch("/api/abtest-analysis/cache/all", { method: "DELETE" });
  el.abtestCacheClearAll.textContent = "캐시 초기화";
  el.abtestCacheClearAll.disabled = false;
});

async function deleteCacheForCurrentTest() {
  const abTestId = el.abtestAnalysisId?.value?.trim();
  const gameCode = el.abtestAnalysisGame?.value || "cvs";
  if (!abTestId) return;
  if (!confirm(`ID ${abTestId} 캐시를 삭제하고 재분석하시겠습니까?`)) return;
  for (const btn of [el.abtestAnalysisCacheReset, el.abtestAnalysisCacheResetResult]) {
    if (btn) { btn.textContent = "삭제 중..."; btn.disabled = true; }
  }
  await fetch("/api/abtest-analysis/cache", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abTestId, gameCode })
  });
  for (const btn of [el.abtestAnalysisCacheReset, el.abtestAnalysisCacheResetResult]) {
    if (btn) { btn.textContent = "캐시 삭제"; btn.disabled = false; }
  }
  runFlow();
}

el.abtestAnalysisCacheReset?.addEventListener("click", deleteCacheForCurrentTest);
el.abtestAnalysisCacheResetResult?.addEventListener("click", deleteCacheForCurrentTest);

// ── Tab 전환 ──────────────────────────────────────────────────────────────────

function showTab(tab) {
  el.tabList?.classList.toggle("is-active", tab === "list");
  el.tabAnalysis?.classList.toggle("is-active", tab === "analysis");
  el.tabProductConfig?.classList.toggle("is-active", tab === "product-config");
  if (el.abtestListView) el.abtestListView.hidden = tab !== "list";
  if (el.abtestAnalysisView) el.abtestAnalysisView.hidden = tab !== "analysis";
  if (el.productConfigView) el.productConfigView.hidden = tab !== "product-config";
  if (tab === "analysis") {
    showAnalysisListSection();
    const gameCode = el.abtestAnalysisListGame?.value || "cvs";
    if (analysisListState.loadedGame !== gameCode) loadAnalysisList(gameCode);
  } else if (tab === "list") {
    const gameCode = el.abtestListGame?.value || "cvs";
    if (listState.loadedGame !== gameCode) loadAbtestList(gameCode);
  } else if (tab === "product-config") {
    showProductConfigListSection();
    const gameCode = el.productConfigListGame?.value || "cvs";
    if (productConfigTabState.loadedGame !== gameCode) loadProductConfigTabList(gameCode);
  }
}

el.tabList?.addEventListener("click", () => showTab("list"));
el.tabAnalysis?.addEventListener("click", () => showTab("analysis"));
el.tabProductConfig?.addEventListener("click", () => showTab("product-config"));

el.productConfigListGame?.addEventListener("change", () => {
  productConfigTabState.rows = null;
  productConfigTabState.loadedGame = null;
  productConfigTabState.filter.text = "";
  if (el.productConfigListSearch) el.productConfigListSearch.value = "";
  loadProductConfigTabList(el.productConfigListGame.value);
});

el.productConfigListSearch?.addEventListener("input", () => {
  productConfigTabState.filter.text = el.productConfigListSearch.value;
  renderProductConfigTabList();
});

el.abtestListGame?.addEventListener("change", () => {
  listState.loadedGame = null;
  loadAbtestList(el.abtestListGame.value);
});

el.abtestListStatus?.addEventListener("change", () => {
  listState.filter.status = el.abtestListStatus.value;
  renderAbtestList();
});

// ── A/B 분석 목록 ─────────────────────────────────────────────────────────────

const analysisListState = {
  rows: null,
  loadedGame: null,
  filter: { text: "", status: "all" }
};

function showAnalysisListSection() {
  if (el.abtestAnalysisListSection) el.abtestAnalysisListSection.hidden = false;
  if (el.abtestAnalysisDetailSection) el.abtestAnalysisDetailSection.hidden = true;
}

function showAnalysisDetailSection() {
  if (el.abtestAnalysisListSection) el.abtestAnalysisListSection.hidden = true;
  if (el.abtestAnalysisDetailSection) el.abtestAnalysisDetailSection.hidden = false;
}

async function loadAnalysisList(gameCode) {
  if (!el.abtestAnalysisListMeta || !el.abtestAnalysisListRoot) return;
  el.abtestAnalysisListMeta.textContent = "목록을 불러오는 중입니다.";
  el.abtestAnalysisListRoot.innerHTML = "";
  try {
    const response = await fetch(`/api/abtest-analysis-list?game=${encodeURIComponent(gameCode)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load A/B test list.");
    analysisListState.rows = payload.rows;
    analysisListState.loadedGame = gameCode;
    renderAnalysisList();
  } catch (error) {
    el.abtestAnalysisListMeta.textContent = error.message;
  }
}

function applyAnalysisFilter(rows) {
  let result = rows;
  const raw = (analysisListState.filter.text || "").trim().toLowerCase();
  if (raw) {
    const tokens = raw.split(/\s+/);
    result = result.filter(row => {
      const haystack = ((row.name || "") + " " + (row.ids || []).join(" ")).toLowerCase();
      return tokens.every(t => haystack.includes(t));
    });
  }
  const status = analysisListState.filter.status || "all";
  if (status === "active") result = result.filter(row => isRowActive(row));
  else if (status === "ended") result = result.filter(row => !isRowActive(row));
  return result;
}

function renderAnalysisList() {
  if (!el.abtestAnalysisListMeta || !el.abtestAnalysisListRoot) return;
  const allRows = analysisListState.rows || [];
  const rows = applyAnalysisFilter(allRows);
  const suffix = allRows.length !== rows.length ? ` (전체 ${allRows.length}개 중)` : "";
  el.abtestAnalysisListMeta.textContent = `${rows.length}개의 A/B Test${suffix}`;
  if (rows.length === 0) {
    el.abtestAnalysisListRoot.innerHTML = "<p>검색 결과가 없습니다.</p>";
    return;
  }
  el.abtestAnalysisListRoot.innerHTML = `
    <table class="abtest-table">
      <thead><tr><th>ID</th><th>이름</th><th>시작 (PST)</th><th>종료 (PST)</th><th>결론</th></tr></thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr class="abtest-row ${conclusionRowClass(row.conclusion)} ${isRowActive(row) ? 'abtest-row--active' : 'abtest-row--ended'}" data-index="${i}">
            <td class="abtest-id">${escapeHtml((row.ids || []).join(", "))}</td>
            <td class="abtest-name">${escapeHtml(row.name || "-")}</td>
            <td>${escapeHtml(pstDatetime(row.startTs))}</td>
            <td>${escapeHtml(pstDatetime(row.endTs))}</td>
            <td class="conclusion-cell">${renderConclusionBadge(row.conclusion, row.populationWeight)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  for (const tr of el.abtestAnalysisListRoot.querySelectorAll(".abtest-row")) {
    tr.addEventListener("click", () => {
      const row = rows[Number(tr.dataset.index)];
      if (row) selectAnalysisAbtest(row);
    });
  }
}

// ── Product Config ────────────────────────────────────────────────────────────

const ALL_PRODUCT_TYPES = [
  "Coin", "POG", "Wheel", "Voucher", "Gem", "VIP Deal", "Epic Pass",
  "Tier Up Deal", "Club Deal", "Daily Boost", "Coda Shop", "FTD", "Inhouse Ads",
  "ROOC IAM", "Smart IAM", "INS", "SPB", "BAB Deal", "Spin Deal", "Scratcher Deal",
  "Friends Deal", "Card Deal", "Boss Raiders Deal", "HOG Deal", "Early Access",
  "Santa Deal", "Coin Deal", "Gem Deal", "Bucks Deal", "Dynamic Offer", "Hot Offer",
  "Uplifting Deal", "Betting Deal", "Bucks", "Epic Miners", "Mission Deal", "Appcharge",
];

let _productConfigKey = null;

function productConfigKey(gameCode, ids) {
  return `${gameCode}-${[...ids].sort((a, b) => a - b).join(",")}`;
}

async function loadProductConfig(key) {
  _productConfigKey = key;
  try {
    const res = await fetch(`/api/abtest-product-config?key=${encodeURIComponent(key)}`);
    return await res.json();
  } catch {
    return { productTypes: [] };
  }
}

// ── Product 설정 탭 ───────────────────────────────────────────────────────────

const productConfigTabState = {
  rows: null,
  loadedGame: null,
  filter: { text: "" },
};

function showProductConfigListSection() {
  // no-op: accordion style — always show list section
}

async function loadProductConfigTabList(gameCode) {
  if (!el.productConfigListMeta || !el.productConfigListRoot) return;
  el.productConfigListMeta.textContent = "목록을 불러오는 중입니다.";
  el.productConfigListRoot.innerHTML = "";
  try {
    const res = await fetch(`/api/abtest-analysis-list?game=${encodeURIComponent(gameCode)}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to load list.");
    productConfigTabState.rows = payload.rows;
    productConfigTabState.loadedGame = gameCode;
    renderProductConfigTabList();
  } catch (err) {
    el.productConfigListMeta.textContent = err.message;
  }
}

function applyProductConfigListFilter(rows) {
  const raw = (productConfigTabState.filter.text || "").trim().toLowerCase();
  if (!raw) return rows;
  const tokens = raw.split(/\s+/);
  return rows.filter(row => {
    const hay = ((row.name || "") + " " + (row.ids || []).join(" ")).toLowerCase();
    return tokens.every(t => hay.includes(t));
  });
}

function renderProductConfigTabList() {
  if (!el.productConfigListMeta || !el.productConfigListRoot) return;
  const all = productConfigTabState.rows || [];
  const rows = applyProductConfigListFilter(all);
  const suffix = all.length !== rows.length ? ` (전체 ${all.length}개 중)` : "";
  el.productConfigListMeta.textContent = `${rows.length}개의 A/B Test${suffix}`;
  el.productConfigListRoot.innerHTML = "";
  if (rows.length === 0) {
    el.productConfigListRoot.innerHTML = "<p>검색 결과가 없습니다.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "abtest-table pc-accordion-table";
  table.innerHTML = `<thead><tr><th></th><th>ID</th><th>이름</th><th>시작 (PST)</th><th>종료 (PST)</th></tr></thead>`;
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const gameCode = el.productConfigListGame?.value || "cvs";
    const key = productConfigKey(gameCode, row.ids || []);

    // header row
    const tr = document.createElement("tr");
    tr.className = "abtest-row pc-accordion-row";
    tr.innerHTML = `
      <td class="pc-chevron">▶</td>
      <td>${(row.ids || []).join(", ")}</td>
      <td>${escapeHtml(row.name || "")}</td>
      <td>${pstDatetime(row.startTs)}</td>
      <td>${pstDatetime(row.endTs)}</td>`;

    // expand row
    const expandTr = document.createElement("tr");
    expandTr.className = "pc-expand-row";
    expandTr.hidden = true;
    const expandTd = document.createElement("td");
    expandTd.colSpan = 5;
    expandTd.className = "pc-expand-cell";
    expandTr.appendChild(expandTd);

    let loaded = false;

    tr.addEventListener("click", async () => {
      const isOpen = !expandTr.hidden;
      if (isOpen) {
        expandTr.hidden = true;
        tr.querySelector(".pc-chevron").textContent = "▶";
        tr.classList.remove("pc-accordion-row--open");
        return;
      }
      expandTr.hidden = false;
      tr.querySelector(".pc-chevron").textContent = "▼";
      tr.classList.add("pc-accordion-row--open");

      if (!loaded) {
        expandTd.innerHTML = `<p class="pc-expand-loading">불러오는 중...</p>`;
        const config = await loadProductConfig(key);
        loaded = true;
        const saved = new Set(config.productTypes || []);
        expandTd.innerHTML = `
          <div class="pc-expand-inner">
            <div class="product-config-types">
              ${ALL_PRODUCT_TYPES.map(pt =>
                `<label class="product-filter-chip">
                  <input type="checkbox" name="pt" value="${escapeHtml(pt)}"${saved.has(pt) ? " checked" : ""}> ${escapeHtml(pt)}
                </label>`
              ).join("")}
            </div>
            <div class="product-config-footer">
              <button type="button" class="run-button pc-save-btn">저장</button>
              <button type="button" class="edit-reset-btn pc-clear-btn">초기화</button>
              <p class="edit-status pc-status"></p>
            </div>
          </div>`;
      }

      const saveBtn = expandTd.querySelector(".pc-save-btn");
      const clearBtn = expandTd.querySelector(".pc-clear-btn");
      const statusEl = expandTd.querySelector(".pc-status");

      // re-attach listeners each open (idempotent via cloneNode pattern)
      const newSave = saveBtn.cloneNode(true);
      const newClear = clearBtn.cloneNode(true);
      saveBtn.replaceWith(newSave);
      clearBtn.replaceWith(newClear);

      newSave.addEventListener("click", async () => {
        const productTypes = [...expandTd.querySelectorAll("input[name=pt]:checked")].map(cb => cb.value);
        newSave.disabled = true;
        try {
          await fetch("/api/abtest-product-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, productTypes }),
          });
          statusEl.textContent = `저장되었습니다. (${productTypes.length}개 선택)`;
          setTimeout(() => { statusEl.textContent = ""; }, 2000);
        } catch {
          statusEl.textContent = "저장 실패";
        } finally {
          newSave.disabled = false;
        }
      });

      newClear.addEventListener("click", async () => {
        expandTd.querySelectorAll("input[name=pt]").forEach(cb => { cb.checked = false; });
        await fetch("/api/abtest-product-config", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        statusEl.textContent = "초기화되었습니다.";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
      });
    });

    tbody.appendChild(tr);
    tbody.appendChild(expandTr);
  }

  el.productConfigListRoot.appendChild(table);
}

function getCheckedProductTypes() {
  // used only for the analysis flow; reads from the current _productConfigKey via API (already loaded)
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────

function selectAnalysisAbtest(row) {
  const gameCode = el.abtestAnalysisListGame?.value || "cvs";
  if (el.abtestAnalysisGame) el.abtestAnalysisGame.value = gameCode;
  if (el.abtestAnalysisId) el.abtestAnalysisId.value = (row.ids || []).join(",");
  if (el.abtestAnalysisForm) el.abtestAnalysisForm.hidden = true;
  if (el.abtestAnalysisEmpty) el.abtestAnalysisEmpty.hidden = true;
  if (el.abtestAnalysisDetailTitle) el.abtestAnalysisDetailTitle.textContent = row.name || `A/B Test #${(row.ids || []).join(", ")}`;
  if (el.abtestAnalysisDetailMeta) el.abtestAnalysisDetailMeta.textContent = `ID: ${(row.ids || []).join(", ")} · ${pstDatetime(row.startTs)} ~ ${pstDatetime(row.endTs)} (PST)`;
  showAnalysisDetailSection();

  // product config 로드 후 분석 실행
  const key = productConfigKey(gameCode, row.ids || []);
  loadProductConfig(key).then(() => {
    runFlow();
  });
}

el.abtestAnalysisListStatus?.addEventListener("change", () => {
  analysisListState.filter.status = el.abtestAnalysisListStatus.value;
  renderAnalysisList();
});

el.abtestAnalysisListGame?.addEventListener("change", () => {
  analysisListState.rows = null;
  analysisListState.loadedGame = null;
  analysisListState.filter.text = "";
  if (el.abtestAnalysisListSearch) el.abtestAnalysisListSearch.value = "";
  loadAnalysisList(el.abtestAnalysisListGame.value);
});

el.abtestAnalysisListSearch?.addEventListener("input", () => {
  analysisListState.filter.text = el.abtestAnalysisListSearch.value;
  renderAnalysisList();
});

el.abtestAnalysisBackButton?.addEventListener("click", () => {
  if (el.abtestAnalysisForm) el.abtestAnalysisForm.hidden = false;
  showAnalysisListSection();
});

// ── A/B Test 목록 + Slack ─────────────────────────────────────────────────────

const listState = {
  rows: null,
  selected: null,
  slackThreads: [],
  manualData: null,
  editOpen: false,
  loadedGame: null,
  filter: { text: "", status: "all", dateFrom: null, dateTo: null },
  cal: { year: new Date().getFullYear(), month: new Date().getMonth(), step: 0 }
};

function cleanSlackText(text) {
  return String(text)
    .replace(/<@[A-Z0-9]+(?:\|[^>]*)?>(\s*)/g, "$1")
    .replace(/<!(?:subteam\^[^>]*|here|channel|everyone)>(\s*)/g, "$1")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:\/\/[^>]+)>/g, "$1")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/^\n+/, "")
    .trimEnd();
}

function pstDatetime(ts) {
  if (!ts) return "-";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleString("ko-KR", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function fmtCalDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function abtestTestKey(row) {
  return (row.ids || []).slice().sort((a, b) => Number(a) - Number(b)).join(",");
}

function isRowActive(row) {
  const end = row.endTs ? new Date(row.endTs).getTime() : null;
  return !end || end > Date.now();
}

function applyFilter(rows) {
  let result = rows;
  const raw = (listState.filter.text || "").trim().toLowerCase();
  if (raw) {
    const tokens = raw.split(/\s+/);
    result = result.filter(row => {
      const haystack = ((row.name || "") + " " + (row.ids || []).join(" ")).toLowerCase();
      return tokens.every(t => haystack.includes(t));
    });
  }
  const status = listState.filter.status || "all";
  if (status === "active") result = result.filter(row => isRowActive(row));
  else if (status === "ended") result = result.filter(row => !isRowActive(row));
  const { dateFrom, dateTo } = listState.filter;
  if (dateFrom && dateTo) {
    const from = Math.min(dateFrom, dateTo);
    const to = Math.max(dateFrom, dateTo) + 86400000 - 1;
    result = result.filter(row => {
      const start = row.startTs ? new Date(row.startTs).getTime() : null;
      if (!start) return false;
      const rawEnd = row.endTs ? new Date(row.endTs).getTime() : null;
      const end = rawEnd && new Date(rawEnd).getFullYear() > 1970 ? rawEnd : Infinity;
      return start <= to && end >= from;
    });
  }
  return result;
}

async function loadAbtestList(gameCode = "cvs") {
  if (!el.abtestListMeta || !el.abtestListRoot) return;
  el.abtestListMeta.textContent = "목록을 불러오는 중입니다.";
  el.abtestListRoot.innerHTML = "";
  try {
    const response = await fetch(`/api/abtest-list?game=${gameCode}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load A/B test list.");
    listState.rows = payload.rows;
    listState.loadedGame = gameCode;
    renderAbtestList();
  } catch (error) {
    el.abtestListMeta.textContent = error.message;
  }
}

function renderAbtestList() {
  if (!el.abtestListMeta || !el.abtestListRoot) return;
  const allRows = listState.rows || [];
  const rows = applyFilter(allRows);
  const suffix = allRows.length !== rows.length ? ` (전체 ${allRows.length}개 중)` : "";
  el.abtestListMeta.textContent = `${rows.length}개의 A/B Test${suffix}`;
  if (rows.length === 0) {
    el.abtestListRoot.innerHTML = "<p>검색 결과가 없습니다.</p>";
    return;
  }
  const table = document.createElement("table");
  table.className = "abtest-table";
  table.innerHTML = `<thead><tr><th>ID</th><th>이름</th><th>시작 (PST)</th><th>종료 (PST)</th><th>결론</th></tr></thead><tbody></tbody>`;
  const tbody = table.querySelector("tbody");

  rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.className = "abtest-row" + (isRowActive(row) ? " abtest-row--active" : " abtest-row--ended");
    tr.dataset.index = i;
    applyRowConclusion(tr, row.conclusion);

    const conclusionTd = document.createElement("td");
    conclusionTd.className = "conclusion-cell";

    const badge = document.createElement("span");
    badge.innerHTML = renderConclusionBadge(row.conclusion, row.populationWeight);

    const editBtn = document.createElement("button");
    editBtn.className = "conclusion-edit-btn";
    editBtn.title = "결론 변경";
    editBtn.textContent = "✎";

    const sel = document.createElement("select");
    sel.className = "conclusion-select conclusion-select--hidden";
    const opts = conclusionOptions(row.populationWeight);
    opts.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      if (row.conclusion === o.value) opt.selected = true;
      sel.appendChild(opt);
    });

    editBtn.addEventListener("click", e => {
      e.stopPropagation();
      sel.classList.remove("conclusion-select--hidden");
      editBtn.classList.add("conclusion-edit-btn--hidden");
      sel.focus();
    });

    sel.addEventListener("change", async e => {
      e.stopPropagation();
      const val = sel.value;
      await saveConclusion(row.primaryId, val);
      row.conclusion = val || null;
      applyRowConclusion(tr, row.conclusion);
      badge.innerHTML = renderConclusionBadge(row.conclusion, row.populationWeight);
      sel.classList.add("conclusion-select--hidden");
      editBtn.classList.remove("conclusion-edit-btn--hidden");
    });

    sel.addEventListener("blur", e => {
      sel.classList.add("conclusion-select--hidden");
      editBtn.classList.remove("conclusion-edit-btn--hidden");
    });

    sel.addEventListener("click", e => e.stopPropagation());

    conclusionTd.appendChild(badge);
    conclusionTd.appendChild(editBtn);
    conclusionTd.appendChild(sel);

    tr.innerHTML = `
      <td class="abtest-id">${escapeHtml((row.ids || []).join(", "))}</td>
      <td class="abtest-name">${escapeHtml(row.name || "-")}</td>
      <td>${escapeHtml(pstDatetime(row.startTs))}</td>
      <td>${escapeHtml(pstDatetime(row.endTs))}</td>
    `;
    tr.appendChild(conclusionTd);

    tr.addEventListener("click", () => selectAbtest(row));
    tbody.appendChild(tr);
  });

  el.abtestListRoot.innerHTML = "";
  el.abtestListRoot.appendChild(table);
}

function renderAbtestCalendar() {
  if (!el.abtestCalWrap) return;
  const { year, month, step } = listState.cal;
  const { dateFrom, dateTo } = listState.filter;
  const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const DAYS = ["일","월","화","수","목","금","토"];
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rangeFrom = (dateFrom && dateTo) ? Math.min(dateFrom, dateTo) : dateFrom;
  const rangeTo = (dateFrom && dateTo) ? Math.max(dateFrom, dateTo) : null;
  let cells = "";
  let day = 1;
  for (let w = 0; w < 6; w++) {
    let row = "<tr>";
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      if (idx < firstDow || day > daysInMonth) {
        row += "<td></td>";
      } else {
        const ts = new Date(year, month, day).getTime();
        let cls = "cal-day";
        if (rangeFrom && rangeTo && ts >= rangeFrom && ts <= rangeTo) cls += " cal-in-range";
        if (rangeFrom && ts === rangeFrom) cls += " cal-edge";
        if (rangeTo && ts === rangeTo) cls += " cal-edge";
        row += `<td class="${cls}" data-ts="${ts}">${day}</td>`;
        day++;
      }
    }
    row += "</tr>";
    cells += row;
    if (day > daysInMonth) break;
  }
  const hint = step === 0
    ? "시작 날짜를 선택하세요"
    : step === 1
    ? `${fmtCalDate(dateFrom)} → 종료 날짜를 선택하세요`
    : `${fmtCalDate(rangeFrom)} ~ ${fmtCalDate(rangeTo)}`;
  el.abtestCalWrap.innerHTML = `
    <div class="abtest-cal">
      <div class="cal-nav">
        <button class="cal-nav-btn" data-dir="-1">&#8249;</button>
        <span class="cal-month-label">${year}년 ${MONTHS[month]}</span>
        <button class="cal-nav-btn" data-dir="1">&#8250;</button>
      </div>
      <p class="cal-hint">${hint}</p>
      <table class="cal-grid">
        <thead><tr>${DAYS.map(d => `<th>${d}</th>`).join("")}</tr></thead>
        <tbody>${cells}</tbody>
      </table>
    </div>
  `;
  el.abtestCalWrap.querySelectorAll(".cal-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      let m = listState.cal.month + Number(btn.dataset.dir);
      let y = listState.cal.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      listState.cal.month = m;
      listState.cal.year = y;
      renderAbtestCalendar();
    });
  });
  el.abtestCalWrap.querySelectorAll(".cal-day").forEach(td => {
    td.addEventListener("click", () => {
      const ts = Number(td.dataset.ts);
      if (listState.cal.step !== 1) {
        listState.filter.dateFrom = ts;
        listState.filter.dateTo = null;
        listState.cal.step = 1;
      } else {
        listState.filter.dateTo = ts;
        listState.cal.step = 2;
        const from = fmtCalDate(Math.min(listState.filter.dateFrom, ts));
        const to = fmtCalDate(Math.max(listState.filter.dateFrom, ts));
        if (el.abtestDateBtn) el.abtestDateBtn.textContent = `${from} ~ ${to}`;
        if (el.abtestDateClear) el.abtestDateClear.hidden = false;
        renderAbtestList();
      }
      renderAbtestCalendar();
    });
  });
}

function selectAbtest(row) {
  listState.selected = row;
  listState.slackThreads = [];
  listState.manualData = null;
  listState.editOpen = false;
  if (el.abtestDetailTitle) el.abtestDetailTitle.textContent = row.name || `A/B Test #${(row.ids || []).join(", ")}`;
  if (el.abtestDetailMeta) el.abtestDetailMeta.textContent = `ID: ${(row.ids || []).join(", ")} · ${pstDatetime(row.startTs)} ~ ${pstDatetime(row.endTs)} (PST)`;
  if (el.abtestListSection) el.abtestListSection.hidden = true;
  if (el.abtestDetailSection) el.abtestDetailSection.hidden = false;
  if (el.abtestSlackLoading) el.abtestSlackLoading.hidden = false;
  if (el.abtestSlackNotfound) el.abtestSlackNotfound.hidden = true;
  if (el.abtestSlackResults) el.abtestSlackResults.hidden = true;
  if (el.abtestThreads) el.abtestThreads.innerHTML = "";
  if (el.abtestEditPanel) el.abtestEditPanel.hidden = true;
  if (el.abtestEditBtn) el.abtestEditBtn.textContent = "수정";
  fetchAbtestSlack(row);
}

async function fetchAbtestSlack(row) {
  const key = abtestTestKey(row);
  const [slackResult, manualResult] = await Promise.allSettled([
    fetch("/api/slack-abtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testIds: row.ids || [],
        testName: row.name || "",
        startDate: row.startTs ? row.startTs.slice(0, 10) : undefined,
        endDate: row.endTs ? row.endTs.slice(0, 10) : undefined
      })
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Slack 조회 실패"); return d; }),
    fetch(`/api/abtest-manual?key=${encodeURIComponent(key)}`).then(r => r.json())
  ]);

  listState.slackThreads = slackResult.status === "fulfilled" ? (slackResult.value.threads || []) : [];
  const md = manualResult.status === "fulfilled" ? manualResult.value : { announcement: null, analysisItems: [], outcome: null };
  listState.manualData = md;

  if (el.abtestSlackLoading) el.abtestSlackLoading.hidden = true;

  const hasManual = !!(md.announcement || md.analysisItems?.length || md.outcome);
  if (slackResult.status === "rejected" && !hasManual) {
    if (el.abtestSlackNotfound) {
      el.abtestSlackNotfound.hidden = false;
      el.abtestSlackNotfound.textContent = `오류: ${slackResult.reason?.message || "Slack 조회 실패"}`;
    }
  }

  renderManualEditPanel();
  renderAllAbtestThreads();
}

function renderAllAbtestThreads() {
  const slackThreads = listState.slackThreads || [];
  const manual = listState.manualData || { announcement: null, analysisItems: [], outcome: null };
  const hasManual = !!(manual.announcement || manual.analysisItems?.length || manual.outcome);

  if (!slackThreads.length && !hasManual) {
    if (el.abtestSlackNotfound) el.abtestSlackNotfound.hidden = false;
    if (el.abtestSlackResults) el.abtestSlackResults.hidden = true;
    if (el.abtestSlackNotfound && !el.abtestSlackNotfound.textContent.includes("오류")) {
      el.abtestSlackNotfound.textContent = "Slack에서 관련 스레드를 찾지 못했습니다.";
    }
    return;
  }

  if (el.abtestSlackNotfound) el.abtestSlackNotfound.hidden = true;
  if (el.abtestSlackResults) el.abtestSlackResults.hidden = false;

  const overrides = {
    hideAnnouncement: !!manual.announcement,
    hideAnalysis: !!(manual.analysisItems?.length),
    hideOutcome: !!manual.outcome
  };

  if (el.abtestThreads) {
    el.abtestThreads.innerHTML =
      slackThreads.map(t => threadCardHtml(t, overrides)).join("") +
      (hasManual ? manualCardHtml(manual) : "");
  }
}

function threadCardHtml(thread, overrides = {}) {
  const announcementHtml = (!overrides.hideAnnouncement && thread.announcement)
    ? `<div class="slack-section">
        <h4 class="slack-section-title slack-section-title--lg">공지</h4>
        <div class="slack-text">${escapeHtml(cleanSlackText(thread.announcement.text)).replaceAll("\n", "<br>")}</div>
      </div>` : "";
  const analysisHtml = (!overrides.hideAnalysis && thread.analysisResults?.length)
    ? `<div class="slack-section">
        <h4 class="slack-section-title slack-section-title--lg">분석 결과 (${thread.analysisResults.length}건)</h4>
        ${thread.analysisResults.map((r, i) => `
          <div class="slack-analysis-item">
            <div class="slack-analysis-index">${i + 1}</div>
            <div class="slack-text">${escapeHtml(cleanSlackText(r.text)).replaceAll("\n", "<br>")}</div>
            ${(r.images || []).map(img => {
              const imgSrc = img.proxyUrl || img.url || "";
              return `<img class="slack-image" src="${escapeHtml(imgSrc)}" alt="분석 이미지" loading="lazy"${img.width && img.height ? ` width="${img.width}" height="${img.height}"` : ""} />`;
            }).join("")}
          </div>
        `).join("")}
      </div>` : "";
  const outcomeHtml = (!overrides.hideOutcome && thread.outcome)
    ? `<div class="slack-section">
        <h4 class="slack-section-title slack-section-title--lg">결과</h4>
        <div class="slack-text">${escapeHtml(cleanSlackText(thread.outcome.text)).replaceAll("\n", "<br>")}</div>
      </div>` : "";
  const channelHtml = thread.channelName
    ? `<span class="slack-channel">#${escapeHtml(thread.channelName)}</span>` : "";
  return `
    <div class="slack-thread-card">
      <div class="slack-thread-header">
        ${channelHtml}
        ${thread.permalink ? `<a class="slack-permalink" href="${escapeHtml(thread.permalink)}" target="_blank" rel="noopener noreferrer">Slack에서 보기 ↗</a>` : ""}
      </div>
      ${announcementHtml}${analysisHtml}${outcomeHtml}
    </div>
  `;
}

function manualCardHtml(manual) {
  const announcementHtml = manual.announcement
    ? `<div class="slack-section">
        <h4 class="slack-section-title slack-section-title--lg">공지</h4>
        <div class="slack-text">${escapeHtml(cleanSlackText(manual.announcement.text)).replaceAll("\n", "<br>")}</div>
      </div>` : "";
  const analysisHtml = manual.analysisItems?.length
    ? `<div class="slack-section">
        <h4 class="slack-section-title slack-section-title--lg">분석 결과 (${manual.analysisItems.length}건)</h4>
        ${manual.analysisItems.map((item, i) => `
          <div class="slack-analysis-item">
            <div class="slack-analysis-index">${i + 1}</div>
            <div class="slack-text">${escapeHtml(cleanSlackText(item.text)).replaceAll("\n", "<br>")}</div>
            ${(item.images || []).map(img => {
              const imgSrc = img.proxyUrl || img.url || "";
              return `<img class="slack-image" src="${escapeHtml(imgSrc)}" alt="분석 이미지" loading="lazy"${img.width && img.height ? ` width="${img.width}" height="${img.height}"` : ""} />`;
            }).join("")}
          </div>
        `).join("")}
      </div>` : "";
  const outcomeHtml = manual.outcome
    ? `<div class="slack-section">
        <h4 class="slack-section-title slack-section-title--lg">결과</h4>
        <div class="slack-text">${escapeHtml(cleanSlackText(manual.outcome.text)).replaceAll("\n", "<br>")}</div>
      </div>` : "";
  return `
    <div class="slack-thread-card slack-thread-card--manual">
      <div class="slack-thread-header">
        <span class="thread-manual-badge">수동 추가</span>
      </div>
      ${announcementHtml}${analysisHtml}${outcomeHtml}
    </div>
  `;
}

function renderManualEditPanel() {
  const manual = listState.manualData || { announcement: null, analysisItems: [], outcome: null };
  if (el.editManualAnnouncement) {
    el.editManualAnnouncement.innerHTML = manual.announcement
      ? `<div class="edit-saved-item">
          <div class="edit-saved-info">
            ${manual.announcement.channelName ? `<span class="edit-saved-channel">#${escapeHtml(manual.announcement.channelName)}</span>` : ""}
            <span class="edit-saved-desc">${escapeHtml(String(manual.announcement.text || "").slice(0, 100))}</span>
          </div>
          <button class="edit-delete-btn" data-section="announcement" type="button">삭제</button>
        </div>` : "";
  }
  if (el.editManualAnalysis) {
    const items = manual.analysisItems || [];
    el.editManualAnalysis.innerHTML = items.map((item, i) => `
      <div class="edit-saved-item">
        <div class="edit-analysis-controls">
          <button type="button" class="edit-ctrl-btn" data-action="up" data-id="${escapeHtml(item.id)}"${i === 0 ? " disabled" : ""}>▲</button>
          <button type="button" class="edit-ctrl-btn" data-action="down" data-id="${escapeHtml(item.id)}"${i === items.length - 1 ? " disabled" : ""}>▼</button>
        </div>
        <div class="edit-saved-info">
          ${item.channelName ? `<span class="edit-saved-channel">#${escapeHtml(item.channelName)}</span>` : ""}
          <span class="edit-saved-desc">${escapeHtml(String(item.text || "").slice(0, 100))}</span>
        </div>
        <button class="edit-delete-btn" data-action="del" data-id="${escapeHtml(item.id)}" type="button">삭제</button>
      </div>
    `).join("");
  }
  if (el.editManualOutcome) {
    el.editManualOutcome.innerHTML = manual.outcome
      ? `<div class="edit-saved-item">
          <div class="edit-saved-info">
            ${manual.outcome.channelName ? `<span class="edit-saved-channel">#${escapeHtml(manual.outcome.channelName)}</span>` : ""}
            <span class="edit-saved-desc">${escapeHtml(String(manual.outcome.text || "").slice(0, 100))}</span>
          </div>
          <button class="edit-delete-btn" data-section="outcome" type="button">삭제</button>
        </div>` : "";
  }

  el.editManualAnnouncement?.querySelectorAll(".edit-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => { await callManualApi("DELETE", "/api/abtest-manual/announcement", {}); });
  });
  el.editManualAnalysis?.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "del") {
        await callManualApi("DELETE", "/api/abtest-manual/analysis", { id });
      } else {
        const items = listState.manualData?.analysisItems || [];
        const idx = items.findIndex(i => i.id === id);
        if (idx === -1) return;
        const newItems = [...items];
        if (action === "up" && idx > 0) [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
        else if (action === "down" && idx < items.length - 1) [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
        await callManualApi("POST", "/api/abtest-manual/analysis-reorder", { orderedIds: newItems.map(i => i.id) });
      }
    });
  });
  el.editManualOutcome?.querySelectorAll(".edit-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => { await callManualApi("DELETE", "/api/abtest-manual/outcome", {}); });
  });
}

async function refreshManualData() {
  const row = listState.selected;
  if (!row) return;
  const key = abtestTestKey(row);
  try {
    const resp = await fetch(`/api/abtest-manual?key=${encodeURIComponent(key)}`);
    listState.manualData = await resp.json();
  } catch {
    listState.manualData = { announcement: null, analysisItems: [], outcome: null };
  }
  renderManualEditPanel();
  renderAllAbtestThreads();
}

async function callManualApi(method, pathname, body) {
  const key = abtestTestKey(listState.selected);
  await fetch(pathname, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, ...body })
  });
  await refreshManualData();
}

// Edit panel events
el.abtestEditBtn?.addEventListener("click", () => {
  if (!listState.editOpen && !confirm("수동 데이터를 수정하시겠습니까?")) return;
  listState.editOpen = !listState.editOpen;
  if (el.abtestEditPanel) el.abtestEditPanel.hidden = !listState.editOpen;
  if (el.abtestEditBtn) el.abtestEditBtn.textContent = listState.editOpen ? "수정 닫기" : "수정";
  if (listState.editOpen) renderManualEditPanel();
});

el.abtestEditClose?.addEventListener("click", () => {
  listState.editOpen = false;
  if (el.abtestEditPanel) el.abtestEditPanel.hidden = true;
  if (el.abtestEditBtn) el.abtestEditBtn.textContent = "수정";
});

el.abtestEditReset?.addEventListener("click", async () => {
  if (!confirm("수동으로 추가한 데이터를 모두 삭제하시겠습니까?")) return;
  await callManualApi("DELETE", "/api/abtest-manual/all", {});
});

el.abtestBackButton?.addEventListener("click", () => {
  listState.selected = null;
  if (el.abtestDetailSection) el.abtestDetailSection.hidden = true;
  if (el.abtestListSection) el.abtestListSection.hidden = false;
});

el.abtestSearchText?.addEventListener("input", () => {
  listState.filter.text = el.abtestSearchText.value;
  renderAbtestList();
});

el.abtestDateBtn?.addEventListener("click", () => {
  const opening = el.abtestCalWrap.hidden;
  el.abtestCalWrap.hidden = !opening;
  el.abtestDateBtn.classList.toggle("abtest-date-btn--active", opening);
  if (opening) renderAbtestCalendar();
});

el.abtestDateClear?.addEventListener("click", () => {
  listState.filter.dateFrom = null;
  listState.filter.dateTo = null;
  listState.cal.step = 0;
  if (el.abtestDateClear) el.abtestDateClear.hidden = true;
  if (el.abtestDateBtn) {
    el.abtestDateBtn.classList.remove("abtest-date-btn--active");
    el.abtestDateBtn.textContent = "날짜 검색";
  }
  renderAbtestCalendar();
  renderAbtestList();
});

el.editAnnouncementSubmit?.addEventListener("click", async () => {
  const url = el.editAnnouncementUrl.value.trim();
  if (!url) return;
  el.editAnnouncementStatus.textContent = "처리 중...";
  el.editAnnouncementSubmit.disabled = true;
  try {
    const row = listState.selected;
    const key = abtestTestKey(row);
    const resp = await fetch("/api/abtest-manual/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, slackUrl: url, testIds: row.ids || [] })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "설정 실패");
    el.editAnnouncementUrl.value = "";
    el.editAnnouncementStatus.textContent = "설정되었습니다.";
    await refreshManualData();
  } catch (err) {
    el.editAnnouncementStatus.textContent = `오류: ${err.message}`;
  } finally {
    el.editAnnouncementSubmit.disabled = false;
  }
});

el.editAnalysisSubmit?.addEventListener("click", async () => {
  const url = el.editAnalysisUrl.value.trim();
  if (!url) return;
  el.editAnalysisStatus.textContent = "처리 중...";
  el.editAnalysisSubmit.disabled = true;
  try {
    const row = listState.selected;
    const key = abtestTestKey(row);
    const resp = await fetch("/api/abtest-manual/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, slackUrl: url, testIds: row.ids || [] })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "추가 실패");
    el.editAnalysisUrl.value = "";
    el.editAnalysisStatus.textContent = `${data.added?.length || 1}건 추가되었습니다.`;
    await refreshManualData();
  } catch (err) {
    el.editAnalysisStatus.textContent = `오류: ${err.message}`;
  } finally {
    el.editAnalysisSubmit.disabled = false;
  }
});

el.editOutcomeSubmit?.addEventListener("click", async () => {
  const url = el.editOutcomeUrl.value.trim();
  if (!url) return;
  el.editOutcomeStatus.textContent = "처리 중...";
  el.editOutcomeSubmit.disabled = true;
  try {
    const row = listState.selected;
    const key = abtestTestKey(row);
    const resp = await fetch("/api/abtest-manual/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, slackUrl: url, testIds: row.ids || [] })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "설정 실패");
    el.editOutcomeUrl.value = "";
    el.editOutcomeStatus.textContent = "설정되었습니다.";
    await refreshManualData();
  } catch (err) {
    el.editOutcomeStatus.textContent = `오류: ${err.message}`;
  } finally {
    el.editOutcomeSubmit.disabled = false;
  }
});

// 초기 목록 로드
loadAbtestList();
