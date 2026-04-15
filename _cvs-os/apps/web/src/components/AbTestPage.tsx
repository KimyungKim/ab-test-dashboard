'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHART_COLORS,
  drawBeforeAfterChart,
  drawLineChart,
  drawRetentionDayChart,
} from '../lib/chart-utils';
import {
  deleteAllAnalysisCache,
  deleteAnalysisCache,
  deleteManualAll,
  deleteManualAnnouncement,
  deleteManualAnalysis,
  deleteManualOutcome,
  getAbtestAnalysisList,
  getAbtestList,
  getAbtestManual,
  getProductConfig,
  postAbtestConclusion,
  postManualAnalysis,
  postManualAnalysisReorder,
  postManualAnnouncement,
  postManualOutcome,
  runAbtestAnalysis,
  setProductConfig,
  clearProductConfig,
  postSlackAbtest,
} from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmtNum(v: any, dec = 0): string {
  if (v == null) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: dec });
}

function fmtPct(v: any): string {
  if (v == null) return '—';
  return `${Number(v).toFixed(2)}%`;
}

function deltaLabel(ctrl: any, trt: any, pct = false): string {
  if (ctrl == null || trt == null) return '';
  const d = Number(trt) - Number(ctrl);
  const sign = d >= 0 ? '+' : '';
  const cls = d >= 0 ? 'abtest-delta-pos' : 'abtest-delta-neg';
  if (pct) return `<span class="${cls}">${sign}${d.toFixed(2)}pp</span>`;
  const pctD = ctrl != 0 ? ((d / Math.abs(ctrl)) * 100).toFixed(1) : '—';
  return `<span class="${cls}">${sign}${pctD}%</span>`;
}

function sigBadge(test: any): string {
  if (!test) return '<span class="abtest-sig-na">—</span>';
  const cls = test.sig ? 'abtest-sig-yes' : 'abtest-sig-no';
  const label = test.sig ? '✓ 유의' : '✗ 비유의';
  const pLabel = test.p < 0.001 ? 'p<0.001' : `p=${test.p}`;
  return `<span class="${cls}">${label}</span> <span class="abtest-pval">(${pLabel})</span>`;
}

function bootstrapBadge(test: any): string {
  if (!test) return '<span class="abtest-sig-na">—</span>';
  const cls = test.sig ? 'abtest-sig-yes' : 'abtest-sig-no';
  const label = test.sig ? '✓ 유의' : '✗ 비유의';
  const pLabel = test.p < 0.001 ? 'p<0.001' : `p=${test.p}`;
  return `<span class="${cls}">${label}</span> <span class="abtest-pval">(${pLabel})</span>`;
}

function conclusionOptions(populationWeight: any) {
  const n = Array.isArray(populationWeight) ? populationWeight.length : 2;
  const nT = n - 1;
  const opts: { value: string; label: string }[] = [{ value: '', label: '—' }];
  opts.push({ value: 'rollout-c', label: '롤아웃 - C' });
  if (nT === 1) {
    opts.push({ value: 'rollout-t', label: '롤아웃 - T' });
  } else {
    for (let i = 1; i <= nT; i++) opts.push({ value: `rollout-t${i}`, label: `롤아웃 - T${i}` });
  }
  opts.push({ value: 'stop', label: '중단' });
  opts.push({ value: 'restart', label: '재시작' });
  return opts;
}

function conclusionBadgeClass(value: string): string {
  if (!value) return '';
  if (value === 'rollout-c') return 'conclusion-badge--rollout-c';
  if (value.startsWith('rollout-t')) return 'conclusion-badge--rollout-t';
  if (value === 'stop') return 'conclusion-badge--stop';
  if (value === 'restart') return 'conclusion-badge--restart';
  return '';
}

function conclusionRowClass(value: string): string {
  if (!value) return '';
  if (value === 'rollout-c') return 'abtest-row--rollout-c';
  if (value.startsWith('rollout-t')) return 'abtest-row--rollout-t';
  if (value === 'stop') return 'abtest-row--stop';
  if (value === 'restart') return 'abtest-row--restart';
  return '';
}

function conclusionLabel(value: string, populationWeight: any): string {
  if (!value) return '';
  return (conclusionOptions(populationWeight).find(o => o.value === value) || {}).label || value;
}

function renderConclusionBadgeHtml(conclusion: string | null, populationWeight: any): string {
  if (!conclusion) return '<span class="conclusion-empty">—</span>';
  const label = conclusionLabel(conclusion, populationWeight);
  return `<span class="conclusion-badge ${conclusionBadgeClass(conclusion)}">${escapeHtml(label)}</span>`;
}

function pstDatetime(ts: string | null | undefined): string {
  if (!ts) return '-';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleString('ko-KR', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isRowActive(row: any): boolean {
  const end = row.endTs ? new Date(row.endTs).getTime() : null;
  return !end || end > Date.now();
}

function abtestTestKey(row: any): string {
  return (row.ids || []).slice().sort((a: any, b: any) => Number(a) - Number(b)).join(',');
}

function productConfigKey(gameCode: string, ids: any[]): string {
  return `${gameCode}-${[...ids].sort((a, b) => Number(a) - Number(b)).join(',')}`;
}

function cleanSlackText(text: string): string {
  return String(text)
    .replace(/<@[A-Z0-9]+(?:\|[^>]*)?>(\s*)/g, '$1')
    .replace(/<!(?:subteam\^[^>]*|here|channel|everyone)>(\s*)/g, '$1')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/^\n+/, '')
    .trimEnd();
}

const ALL_RETENTION_DAYS = [
  { key: 'd1', label: 'D1', n: 1 },
  { key: 'd3', label: 'D3', n: 3 },
  { key: 'd7', label: 'D7', n: 7 },
  { key: 'd14', label: 'D14', n: 14 },
  { key: 'd21', label: 'D21', n: 21 },
  { key: 'd30', label: 'D30', n: 30 },
  { key: 'd60', label: 'D60', n: 60 },
  { key: 'd90', label: 'D90', n: 90 },
  { key: 'd120', label: 'D120', n: 120 },
  { key: 'd150', label: 'D150', n: 150 },
  { key: 'd180', label: 'D180', n: 180 },
  { key: 'd360', label: 'D360', n: 360 },
];

const ALL_PRODUCT_TYPES = [
  'Coin', 'POG', 'Wheel', 'Voucher', 'Gem', 'VIP Deal', 'Epic Pass',
  'Tier Up Deal', 'Club Deal', 'Daily Boost', 'Coda Shop', 'FTD', 'Inhouse Ads',
  'ROOC IAM', 'Smart IAM', 'INS', 'SPB', 'BAB Deal', 'Spin Deal', 'Scratcher Deal',
  'Friends Deal', 'Card Deal', 'Boss Raiders Deal', 'HOG Deal', 'Early Access',
  'Santa Deal', 'Coin Deal', 'Gem Deal', 'Bucks Deal', 'Dynamic Offer', 'Hot Offer',
  'Uplifting Deal', 'Betting Deal', 'Bucks', 'Epic Miners', 'Mission Deal', 'Appcharge',
];

function pickRetentionDays(durationDays: number) {
  const active = ALL_RETENTION_DAYS.filter(d => d.n < durationDays);
  if (active.length === 0) return [];
  if (active.length === 1) return [active[0]];
  if (active.length === 2) return [active[0], active[active.length - 1]];
  const short = active[0];
  const long = active[active.length - 1];
  const midTarget = durationDays / 4;
  const midCandidates = active.slice(1, -1);
  const mid = midCandidates.reduce((best, d) =>
    Math.abs(d.n - midTarget) < Math.abs(best.n - midTarget) ? d : best
  );
  return [short, mid, long];
}

function applyGroupRename(data: any): any {
  const treatments = (data.allGroupNames || []).filter((n: string) => n !== data.controlName);
  if (treatments.length < 2) return data;
  const renameMap: Record<string, string> = { Treatment: 'Treatment 1' };
  const rename = (name: string) => renameMap[name] ?? name;
  const renamePairKeys = (obj: any) => {
    if (!obj) return obj;
    const out: any = {};
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
    groups: data.groups.map((g: any) => ({ ...g, group_name: rename(g.group_name) })),
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
        Object.entries(data.segmentAnalysis.segDist || {}).map(([seg, groupCounts]: [string, any]) => [
          seg,
          Object.fromEntries(Object.entries(groupCounts).map(([g, c]) => [rename(g), c])),
        ])
      ),
      pairSegmentEffects: renamePairKeys(data.segmentAnalysis.pairSegmentEffects),
    } : data.segmentAnalysis,
    dailyRevRows: (data.dailyRevRows || []).map((r: any) => ({ ...r, group_name: rename(r.group_name) })),
    dailyPreRevRows: (data.dailyPreRevRows || []).map((r: any) => ({ ...r, group_name: rename(r.group_name) })),
    dailyProductRows: (data.dailyProductRows || []).map((r: any) => ({ ...r, group_name: rename(r.group_name) })),
    productAnalysis: data.productAnalysis ? {
      ...data.productAnalysis,
      pairProductEffects: renamePairKeys(data.productAnalysis.pairProductEffects),
    } : data.productAnalysis,
  };
}

function lookupPair(pairObj: any, groupA: string, groupB: string, allGroupNames: string[]) {
  const ai = allGroupNames.indexOf(groupA), bi = allGroupNames.indexOf(groupB);
  const flipped = ai > bi;
  const key = flipped ? `${groupB}|${groupA}` : `${groupA}|${groupB}`;
  const d = pairObj?.[key];
  if (!d) return null;
  if (!flipped) return d;
  const flipTest = (t: any) => t ? { ...t, diff: -t.diff, ci_lo: -t.ci_hi, ci_hi: -t.ci_lo } : t;
  return { ...d, a: d.b, b: d.a, allUserTest: flipTest(d.allUserTest), payerOnlyTest: flipTest(d.payerOnlyTest) };
}

function buildPreCumulativeSeries(data: any) {
  const { allGroupNames, groups, dailyPreRevRows } = data;
  const totalN: Record<string, number> = {};
  for (const g of groups) totalN[g.group_name] = Number(g.n) || 1;
  const rows = dailyPreRevRows || [];
  const revPerUserSeries: Record<string, { day: number; value: number }[]> = {};
  const payerRateSeries: Record<string, { day: number; value: number }[]> = {};
  for (const name of allGroupNames) {
    const n = totalN[name];
    const byDay: Record<number, { revenue: number; payers: number }> = {};
    for (const r of rows.filter((r: any) => r.group_name === name)) {
      const d = Number(r.day_num);
      byDay[d] = { revenue: Number(r.daily_revenue), payers: Number(r.new_payers) };
    }
    const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
    let cumRev = 0, cumPayers = 0;
    const revPts: { day: number; value: number }[] = [];
    const payerPts: { day: number; value: number }[] = [];
    for (const day of days) {
      cumRev += byDay[day].revenue;
      cumPayers += byDay[day].payers;
      revPts.push({ day, value: cumRev / n });
      payerPts.push({ day, value: (cumPayers / n) * 100 });
    }
    revPerUserSeries[name] = revPts;
    payerRateSeries[name] = payerPts;
  }
  return { revPerUserSeries, payerRateSeries };
}

function buildCumulativeSeries(data: any) {
  const { allGroupNames, groups, dailyRevRows, segmentAnalysis } = data;
  const totalN: Record<string, number> = {};
  for (const g of groups) totalN[g.group_name] = Number(g.n) || 1;
  const segUserN: Record<string, Record<string, number>> = {};
  for (const name of allGroupNames) {
    segUserN[name] = {};
    for (const [seg, counts] of Object.entries(segmentAnalysis?.segDist || {})) {
      segUserN[name][seg] = Number((counts as any)[name] || 0) || 1;
    }
  }
  const rows = dailyRevRows || [];
  const revPerUserSeries: Record<string, { day: number; value: number }[]> = {};
  const payerRateSeries: Record<string, { day: number; value: number }[]> = {};
  for (const name of allGroupNames) {
    const n = totalN[name];
    const byDay: Record<number, { revenue: number; new_payers: number }> = {};
    for (const r of rows.filter((r: any) => r.group_name === name)) {
      const d = Number(r.day_num);
      if (!byDay[d]) byDay[d] = { revenue: 0, new_payers: 0 };
      byDay[d].revenue += Number(r.daily_revenue);
      byDay[d].new_payers += Number(r.new_payers);
    }
    const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
    let cumRev = 0, cumPayers = 0;
    const revPts: { day: number; value: number }[] = [];
    const payerPts: { day: number; value: number }[] = [];
    for (const day of days) {
      cumRev += byDay[day].revenue;
      cumPayers += byDay[day].new_payers;
      revPts.push({ day, value: cumRev / n });
      payerPts.push({ day, value: (cumPayers / n) * 100 });
    }
    revPerUserSeries[name] = revPts;
    payerRateSeries[name] = payerPts;
  }
  const allSegs = ['Whale', 'Non-whale', 'Non-payer'];
  const segRevSeries: Record<string, Record<string, { day: number; value: number }[]>> = {};
  for (const seg of allSegs) {
    segRevSeries[seg] = {};
    for (const name of allGroupNames) {
      const segN = segUserN[name]?.[seg] || 1;
      const byDay: Record<number, number> = {};
      for (const r of rows.filter((r: any) => r.group_name === name && r.segment === seg)) {
        const d = Number(r.day_num);
        byDay[d] = (byDay[d] || 0) + Number(r.daily_revenue);
      }
      const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
      let cum = 0;
      const pts: { day: number; value: number }[] = [];
      for (const day of days) {
        cum += byDay[day];
        pts.push({ day, value: cum / segN });
      }
      segRevSeries[seg][name] = pts;
    }
  }
  return { revPerUserSeries, payerRateSeries, segRevSeries };
}

// ── Simple HTML table renderer ────────────────────────────────────────────────

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | null)[][] }) {
  return (
    <table className="simple-table">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} dangerouslySetInnerHTML={{ __html: h }} />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} dangerouslySetInnerHTML={{ __html: cell ?? '—' }} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Group Charts section ──────────────────────────────────────────────────────

function GroupChartsSection({ data }: { data: any }) {
  const revPerUserRef = useRef<HTMLCanvasElement>(null);
  const payerRateRef = useRef<HTMLCanvasElement>(null);
  const whaleRef = useRef<HTMLCanvasElement>(null);
  const nonWhaleRef = useRef<HTMLCanvasElement>(null);
  const nonPayerRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data) return;
    const { allGroupNames, groupSummary, meta } = data;
    const groups = allGroupNames.map((name: string, i: number) => ({ name, color: CHART_COLORS[i] || '#888' }));
    const durationDays = meta.durationDays || 1;
    const { revPerUserSeries: preRevSeries, payerRateSeries: prePayerSeries } = buildPreCumulativeSeries(data);
    const { revPerUserSeries, payerRateSeries, segRevSeries } = buildCumulativeSeries(data);

    const timer = requestAnimationFrame(() => {
      if (revPerUserRef.current) {
        drawBeforeAfterChart(revPerUserRef.current, {
          groups, preSeries: preRevSeries, inSeries: revPerUserSeries,
          preDays: 30, durationDays, formatY: (v: number) => `$${fmtNum(v, 2)}`,
        });
      }
      if (payerRateRef.current) {
        drawBeforeAfterChart(payerRateRef.current, {
          groups, preSeries: prePayerSeries, inSeries: payerRateSeries,
          preDays: 30, durationDays, formatY: (v: number) => `${fmtNum(v, 1)}%`,
        });
      }
      const segCanvases: Record<string, React.RefObject<HTMLCanvasElement | null>> = {
        Whale: whaleRef, 'Non-whale': nonWhaleRef, 'Non-payer': nonPayerRef,
      };
      for (const [seg, ref] of Object.entries(segCanvases)) {
        if (ref.current) {
          drawLineChart(ref.current, {
            series: groups.map((g: any) => ({ name: g.name, color: g.color, points: segRevSeries[seg]?.[g.name] || [] })),
            durationDays, formatY: (v: number) => `$${fmtNum(v, 0)}`,
          });
        }
      }
    });
    return () => cancelAnimationFrame(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return null;
  const { allGroupNames, groupSummary, meta } = data;
  const groups = allGroupNames.map((name: string, i: number) => ({ name, color: CHART_COLORS[i] || '#888' }));
  const durationDays = meta.durationDays || 1;
  const activeDays = ALL_RETENTION_DAYS.filter(d => d.n < durationDays);

  return (
    <div className="analysis-card" id="abtest-analysis-group-charts">
      <div className="group-charts-grid">
        <div className="group-chart-item">
          <p className="group-chart-title">Revenue / Assigned User (할당 전후)</p>
          <canvas ref={revPerUserRef} />
        </div>
        <div className="group-chart-item">
          <p className="group-chart-title">Payer Rate (할당 전후)</p>
          <canvas ref={payerRateRef} />
        </div>
        <div className="group-chart-item group-chart-wide">
          <p className="group-chart-title">Revenue / User (Segment별)</p>
          <div className="segment-charts-grid">
            <div className="segment-chart-item">
              <p className="segment-chart-label">Whale</p>
              <canvas ref={whaleRef} />
            </div>
            <div className="segment-chart-item">
              <p className="segment-chart-label">Non-whale</p>
              <canvas ref={nonWhaleRef} />
            </div>
            <div className="segment-chart-item">
              <p className="segment-chart-label">Non-payer</p>
              <canvas ref={nonPayerRef} />
            </div>
          </div>
        </div>
        {activeDays.length > 0 && (
          <RetentionDayCharts groups={groups} groupSummary={groupSummary} activeDays={activeDays} />
        )}
      </div>
    </div>
  );
}

function RetentionDayCharts({ groups, groupSummary, activeDays }: {
  groups: { name: string; color: string }[];
  groupSummary: any;
  activeDays: { key: string; label: string; n: number }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
      {activeDays.map(d => (
        <RetentionDayChart key={d.key} label={d.label} groups={groups.map(g => ({
          name: g.name, color: g.color,
          value: groupSummary[g.name]?.retention?.[d.key] ?? null,
        }))} />
      ))}
    </div>
  );
}

function RetentionDayChart({ label, groups }: { label: string; groups: { name: string; color: string; value: number | null }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) drawRetentionDayChart(canvasRef.current, { groups });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(groups)]);
  return (
    <div className="retention-day-item">
      <p className="retention-day-label">{label}</p>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ── Retention line chart ──────────────────────────────────────────────────────

function RetentionLineChart({ pairRet, groupA, groupB, colorA, colorB, durationDays }: {
  pairRet: any; groupA: string; groupB: string; colorA: string; colorB: string; durationDays: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const days = ALL_RETENTION_DAYS.filter(d => d.n < durationDays);
    if (days.length < 2) return;
    const series = [
      { name: groupA, color: colorA, values: days.map(d => pairRet?.[d.key]?.a_rate ?? null) },
      { name: groupB, color: colorB, values: days.map(d => pairRet?.[d.key]?.b_rate ?? null) },
    ];
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement?.clientWidth || 600;
    const H = 240;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const PAD = { top: 20, right: 24, bottom: 58, left: 48 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const allVals = series.flatMap(s => s.values).filter((v): v is number => v !== null);
    if (!allVals.length) return;
    const rawMax = Math.max(...allVals);
    const yMax = Math.ceil(rawMax / 5) * 5 + 5;
    const yMin = 0;
    const xAt = (i: number) => PAD.left + (days.length > 1 ? i / (days.length - 1) : 0.5) * chartW;
    const yAt = (v: number) => PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
    ctx.clearRect(0, 0, W, H);
    const yTicks = 5;
    ctx.font = '11px system-ui, sans-serif';
    for (let i = 0; i <= yTicks; i++) {
      const v = yMin + (yMax - yMin) * i / yTicks;
      const y = yAt(v);
      ctx.strokeStyle = 'rgba(29,29,27,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(v.toFixed(0) + '%', PAD.left - 6, y);
    }
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    days.forEach((d, i) => ctx.fillText(d.label, xAt(i), PAD.top + chartH + 8));
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      let moved = false;
      s.values.forEach((v, i) => {
        if (v === null) { moved = false; return; }
        if (!moved) { ctx.moveTo(xAt(i), yAt(v)); moved = true; } else ctx.lineTo(xAt(i), yAt(v));
      });
      ctx.stroke();
      s.values.forEach((v, i) => {
        if (v === null) return;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xAt(i), yAt(v), 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(xAt(i), yAt(v), 3, 0, Math.PI * 2); ctx.fill();
      });
    }
    const legendY = PAD.top + chartH + 30;
    const SWATCH = 12, GAP = 6, SPACING = 24;
    ctx.textBaseline = 'middle'; ctx.font = '11px system-ui, sans-serif';
    const itemWidths = series.map(s => SWATCH + GAP + ctx.measureText(s.name).width);
    const totalW = itemWidths.reduce((a, b) => a + b, 0) + SPACING * (series.length - 1);
    let lx = PAD.left + (chartW - totalW) / 2;
    for (const s of series) {
      ctx.fillStyle = s.color; ctx.fillRect(lx, legendY - 2, SWATCH, 3);
      ctx.fillStyle = '#63584f'; ctx.textAlign = 'left';
      ctx.fillText(s.name, lx + SWATCH + GAP, legendY);
      lx += SWATCH + GAP + ctx.measureText(s.name).width + SPACING;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pairRet), groupA, groupB, durationDays]);
  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />;
}

// ── Product Breakdown Item ────────────────────────────────────────────────────

function ProductBreakdownItem({ pt, a, b, test, groupA, groupB, colorA, colorB, data }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const { groups, dailyProductRows, meta } = data;
    const groupN: Record<string, number> = {};
    for (const g of groups) groupN[g.group_name] = Number(g.n) || 1;
    const rows = (dailyProductRows || []).filter((r: any) => r.product_type === pt);
    const seriesMap: Record<string, { day: number; value: number }[]> = {};
    for (const name of [groupA, groupB]) {
      const byDay: Record<number, number> = {};
      for (const r of rows.filter((r: any) => r.group_name === name)) {
        const d = Number(r.day_num);
        byDay[d] = (byDay[d] || 0) + Number(r.daily_revenue);
      }
      const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
      let cum = 0;
      const pts: { day: number; value: number }[] = [];
      for (const day of days) { cum += byDay[day]; pts.push({ day, value: cum / groupN[name] }); }
      seriesMap[name] = pts;
    }
    const hasData = [groupA, groupB].some(n => (seriesMap[n] || []).length > 0);
    if (hasData) {
      const timer = requestAnimationFrame(() => {
        if (canvasRef.current) {
          drawLineChart(canvasRef.current, {
            series: [
              { name: groupA, color: colorA, points: seriesMap[groupA] || [] },
              { name: groupB, color: colorB, points: seriesMap[groupB] || [] },
            ],
            durationDays: meta.durationDays || 1,
            formatY: (v: number) => `$${fmtNum(v, 2)}`,
            chartH: 160,
          });
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pt, groupA, groupB]);

  return (
    <div className="product-breakdown-item">
      <div className="product-breakdown-header">
        <span className="product-breakdown-name">{pt}</span>
        <span className="product-breakdown-stat">{groupA}: <strong>${fmtNum(a.mean, 2)}</strong></span>
        <span className="product-breakdown-stat">{groupB}: <strong>${fmtNum(b.mean, 2)}</strong></span>
        <span className="product-breakdown-stat">Delta: <span dangerouslySetInnerHTML={{ __html: deltaLabel(a.mean, b.mean) }} /></span>
        <span className="product-breakdown-stat">Payer Rate: {fmtPct(a.payerRate)} / {fmtPct(b.payerRate)}</span>
        <span className="product-breakdown-sig" dangerouslySetInnerHTML={{ __html: bootstrapBadge(test) }} />
      </div>
      <canvas ref={canvasRef} className="product-breakdown-canvas" />
    </div>
  );
}

// ── Analysis Results Section ──────────────────────────────────────────────────

function AnalysisResults({ data, groupA, groupB }: { data: any; groupA: string; groupB: string }) {
  if (!data) return null;
  const { allGroupNames, groupSummary, meta, pairRevenue, pairRetention, pairPrePeriod, pairPostRollout, segmentAnalysis, productAnalysis } = data;
  const colorA = CHART_COLORS[allGroupNames.indexOf(groupA)] || '#888';
  const colorB = CHART_COLORS[allGroupNames.indexOf(groupB)] || '#888';
  const activeDays = ALL_RETENTION_DAYS.filter(d => d.n < meta.durationDays);
  const DAYS = activeDays.map(d => d.key);
  const DAY_LABELS = activeDays.map(d => d.label);
  const retDays = pickRetentionDays(meta.durationDays);

  // Pre-period
  const pre = lookupPair(pairPrePeriod, groupA, groupB, allGroupNames);
  const preRows: (string | null)[][] = pre ? [
    ['Revenue/Assigned User', `$${fmtNum(pre.revenue.a, 2)}`, `$${fmtNum(pre.revenue.b, 2)}`, deltaLabel(pre.revenue.a, pre.revenue.b), sigBadge(pre.revenue.test)],
    ['Payer Rate', `${fmtNum(pre.payerRate.a, 1)}%`, `${fmtNum(pre.payerRate.b, 1)}%`, deltaLabel(pre.payerRate.a, pre.payerRate.b), sigBadge(pre.payerRate.test)],
    ['Revenue/Payer', `$${fmtNum(pre.revenuePerPayer?.a, 2)}`, `$${fmtNum(pre.revenuePerPayer?.b, 2)}`, deltaLabel(pre.revenuePerPayer?.a, pre.revenuePerPayer?.b), sigBadge(pre.revenuePerPayer?.test)],
  ] : [];

  // Retention
  const retPair = lookupPair(pairRetention, groupA, groupB, allGroupNames);
  const retRows: (string | null)[][] = DAYS.map((d, i) => {
    const r = retPair?.[d];
    if (!r) return [DAY_LABELS[i], '—', '—', '—', '—'];
    return [DAY_LABELS[i], fmtPct(r.a_rate), fmtPct(r.b_rate), deltaLabel(r.a_rate, r.b_rate, true), sigBadge(r.test)];
  });

  // Revenue
  const rev = lookupPair(pairRevenue, groupA, groupB, allGroupNames);
  const revenueRows: (string | null)[][] = [];
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
      : '[CUPED adj] Revenue / Assigned User';
    revenueRows.push(
      ['Revenue/Assigned User', `$${fmtNum(a.mean, 2)}`, `$${fmtNum(b.mean, 2)}`, deltaLabel(a.mean, b.mean), 'Bootstrap', bootstrapBadge(rev.allUserTest)],
      [cuperLabel, `$${fmtNum(cuperA, 2)}`, `$${fmtNum(cuperB, 2)}`, deltaLabel(cuperA, cuperB), 'Bootstrap', bootstrapBadge(cuperTest)],
      ['Payer Rate', fmtPct(a.n ? a.nonZeroCount / a.n * 100 : 0), fmtPct(b.n ? b.nonZeroCount / b.n * 100 : 0), deltaLabel(a.n ? a.nonZeroCount / a.n * 100 : 0, b.n ? b.nonZeroCount / b.n * 100 : 0, true), 'z-test', sigBadge(rev.payerRateTest)],
      ['Revenue/Payer', `$${fmtNum(a.nonZeroMean, 2)}`, `$${fmtNum(b.nonZeroMean, 2)}`, deltaLabel(a.nonZeroMean, b.nonZeroMean), 'Bootstrap', bootstrapBadge(rev.payerOnlyTest)],
    );
  }

  // Segment
  const sa = segmentAnalysis;
  const segDistRows: (string | null)[][] = [];
  const segEffectRows: (string | null)[][] = [];
  const segPayerRows: (string | null)[][] = [];
  if (sa) {
    const ss = sa.segmentStats || {};
    const segLabel = (seg: string) => {
      const s = ss[seg];
      if (!s) return seg;
      return `${seg} ($${fmtNum(s.min, 0)} ~ $${fmtNum(s.max, 0)})`;
    };
    const aTotal = sa.segmentOrder.reduce((s: number, seg: string) => s + (sa.segDist[seg]?.[groupA] || 0), 0);
    const bTotal = sa.segmentOrder.reduce((s: number, seg: string) => s + (sa.segDist[seg]?.[groupB] || 0), 0);
    for (const seg of sa.segmentOrder) {
      const an = sa.segDist[seg]?.[groupA] || 0, bn = sa.segDist[seg]?.[groupB] || 0;
      segDistRows.push([segLabel(seg), an.toLocaleString(), bn.toLocaleString(), fmtPct(aTotal ? an / aTotal * 100 : 0), fmtPct(bTotal ? bn / bTotal * 100 : 0)]);
    }
    const segPair = lookupPair(sa.pairSegmentEffects, groupA, groupB, allGroupNames);
    for (const seg of sa.segmentOrder) {
      const e = segPair?.[seg];
      if (!e) { segEffectRows.push([segLabel(seg), '—', '—', '—', '—', '—']); segPayerRows.push([segLabel(seg), '—', '—', '—', '—', '—']); continue; }
      const testLabel = seg === 'Whale' ? 'Bootstrap (raw)' : 'Bootstrap (log)';
      segEffectRows.push([segLabel(seg), `$${fmtNum(e.a.mean, 2)}`, `$${fmtNum(e.b.mean, 2)}`, deltaLabel(e.a.mean, e.b.mean), testLabel, bootstrapBadge(e.test)]);
      const ar = e.a.n ? e.a.nonZeroCount / e.a.n * 100 : 0;
      const br = e.b.n ? e.b.nonZeroCount / e.b.n * 100 : 0;
      segPayerRows.push([segLabel(seg), fmtPct(ar), fmtPct(br), deltaLabel(ar, br, true), 'z-test', sigBadge(e.payerRateTest)]);
    }
  }

  // Post-rollout
  const pr = lookupPair(pairPostRollout, groupA, groupB, allGroupNames);
  const postRows: (string | null)[][] = pr ? [
    ['Revenue/Assigned User', `$${fmtNum(pr.a.mean, 2)}`, `$${fmtNum(pr.b.mean, 2)}`, deltaLabel(pr.a.mean, pr.b.mean, true), 'Bootstrap', bootstrapBadge(pr.allUserTest)],
    ['Payer Rate', fmtPct(pr.a.n ? pr.a.nonZeroCount / pr.a.n * 100 : 0), fmtPct(pr.b.n ? pr.b.nonZeroCount / pr.b.n * 100 : 0), deltaLabel(pr.a.n ? pr.a.nonZeroCount / pr.a.n * 100 : 0, pr.b.n ? pr.b.nonZeroCount / pr.b.n * 100 : 0, true), 'z-test', sigBadge(pr.payerRateTest)],
    ['Revenue/Payer', `$${fmtNum(pr.a.nonZeroMean, 2)}`, `$${fmtNum(pr.b.nonZeroMean, 2)}`, deltaLabel(pr.a.nonZeroMean, pr.b.nonZeroMean, true), 'Bootstrap', bootstrapBadge(pr.allUserTest)],
  ] : [];

  // Product breakdown
  let productItems: any[] = [];
  if (productAnalysis?.allProductTypes?.length) {
    const allTypes = productAnalysis.allProductTypes;
    const ai = allGroupNames.indexOf(groupA), bi = allGroupNames.indexOf(groupB);
    const flipped = ai > bi;
    const key = flipped ? `${groupB}|${groupA}` : `${groupA}|${groupB}`;
    const pairData = productAnalysis.pairProductEffects?.[key] || {};
    productItems = allTypes.map((pt: string) => {
      const e = pairData[pt];
      if (!e) return null;
      const a = flipped ? e.b : e.a;
      const b = flipped ? e.a : e.b;
      const test = e.test ? (flipped ? { ...e.test, diff: -(e.test.diff ?? 0), ci_lo: -(e.test.ci_hi ?? 0), ci_hi: -(e.test.ci_lo ?? 0) } : e.test) : null;
      return { pt, a, b, test, absDelta: Math.abs(a.mean - b.mean) };
    }).filter(Boolean).sort((x: any, y: any) => {
      if (x.pt === 'Others') return 1;
      if (y.pt === 'Others') return -1;
      return y.absDelta - x.absDelta;
    });
  }

  // Ranking
  const bestRev = Math.max(...allGroupNames.map((n: string) => groupSummary[n]?.revPerUser ?? -Infinity));
  const bestPayer = Math.max(...allGroupNames.map((n: string) => groupSummary[n]?.payerRate ?? -Infinity));
  const bestRet = retDays.map(d => Math.max(...allGroupNames.map((n: string) => groupSummary[n]?.retention?.[d.key] ?? -Infinity)));
  const preRevVals = allGroupNames.map((n: string) => groupSummary[n]?.preRevPerUser ?? null).filter((v: any) => v != null);
  const bestPreRev = preRevVals.length ? Math.max(...preRevVals) : null;
  const worstPreRev = preRevVals.length ? Math.min(...preRevVals) : null;
  const onlyOne = bestPreRev === worstPreRev;
  const rankHeaders = ['그룹', 'N', '<span class="ranking-ref-header">할당 전 30일 매출</span>', 'Revenue/User', 'Payer Rate', ...retDays.map(d => d.label + ' Ret')];
  const rankRows: (string | null)[][] = allGroupNames.map((name: string) => {
    const s = groupSummary[name];
    const winBadge = (val: any, best: any) => val === best ? ' <span class="ranking-winner">▲</span>' : '';
    const preV = s.preRevPerUser;
    const preArrow = !onlyOne && preV === bestPreRev ? ' <span class="ranking-pre-hi">▲</span>' : '';
    const preRevCell = `<span class="ranking-ref-val">$${fmtNum(preV, 2)}${preArrow}</span>`;
    const revCell = `$${fmtNum(s.revPerUser, 2)}${winBadge(s.revPerUser, bestRev)}`;
    const payerCell = `${fmtPct(s.payerRate)}${winBadge(s.payerRate, bestPayer)}`;
    const retCells = retDays.map((d, i) => {
      const v = s.retention?.[d.key];
      return v != null ? `${fmtPct(v)}${winBadge(v, bestRet[i])}` : '—';
    });
    return [escapeHtml(name), fmtNum(s.n), preRevCell, revCell, payerCell, ...retCells];
  });

  return (
    <>
      {/* Ranking */}
      <div className="analysis-card">
        <div className="visual-card-head"><h3>그룹 요약</h3></div>
        <div className="table-root">
          <SimpleTable headers={rankHeaders} rows={rankRows} />
        </div>
      </div>

      {/* Group Charts */}
      <GroupChartsSection data={data} />

      {/* Retention Chart */}
      <div className="analysis-card">
        <div className="visual-card-head"><h3>Retention</h3></div>
        <RetentionLineChart
          pairRet={retPair}
          groupA={groupA} groupB={groupB}
          colorA={colorA} colorB={colorB}
          durationDays={meta.durationDays}
        />
        <div className="table-root" style={{ marginTop: 16 }}>
          <SimpleTable
            headers={['Day', escapeHtml(groupA), escapeHtml(groupB), 'Delta', '유의성']}
            rows={retRows}
          />
        </div>
      </div>

      {/* Pre-period */}
      {pre && (
        <div className="analysis-card">
          <div className="visual-card-head"><h3>할당 전 30일 지표</h3></div>
          <div className="table-root">
            <SimpleTable
              headers={['지표', escapeHtml(groupA), escapeHtml(groupB), 'Delta', '유의성']}
              rows={preRows}
            />
          </div>
        </div>
      )}

      {/* Revenue */}
      {revenueRows.length > 0 && (
        <div className="analysis-card">
          <div className="visual-card-head"><h3>Revenue</h3></div>
          <div className="table-root">
            <SimpleTable
              headers={['지표', escapeHtml(groupA), escapeHtml(groupB), 'Delta', '검정', '유의성']}
              rows={revenueRows}
            />
          </div>
        </div>
      )}

      {/* Segment */}
      {sa && (
        <div className="analysis-card">
          <div className="visual-card-head"><h3>Revenue 세그먼트 분석</h3></div>
          <div className="table-root table-root--mb">
            <SimpleTable
              headers={['세그먼트', `${escapeHtml(groupA)} (n)`, `${escapeHtml(groupB)} (n)`, '비율 (A)', '비율 (B)']}
              rows={segDistRows}
            />
          </div>
          <div className="table-root table-root--mb">
            <SimpleTable
              headers={['세그먼트', `Rev/User (${escapeHtml(groupA)})`, `Rev/User (${escapeHtml(groupB)})`, 'Delta', '검정', '유의성']}
              rows={segEffectRows}
            />
          </div>
          <div className="table-root">
            <SimpleTable
              headers={['세그먼트', `Payer Rate (${escapeHtml(groupA)})`, `Payer Rate (${escapeHtml(groupB)})`, 'Delta', '검정', '유의성']}
              rows={segPayerRows}
            />
          </div>
        </div>
      )}

      {/* Product Breakdown */}
      {productItems.length > 0 && (
        <div className="analysis-card">
          <div className="visual-card-head"><h3>Product Breakdown</h3></div>
          {productItems.map((item: any) => (
            <ProductBreakdownItem
              key={item.pt}
              pt={item.pt} a={item.a} b={item.b} test={item.test}
              groupA={groupA} groupB={groupB} colorA={colorA} colorB={colorB}
              data={data}
            />
          ))}
        </div>
      )}

      {/* Post-rollout */}
      {pr && (
        <div className="analysis-card">
          <div className="visual-card-head"><h3>종료 후 60일 지표</h3></div>
          <div className="table-root">
            <SimpleTable
              headers={['지표', escapeHtml(groupA), escapeHtml(groupB), 'Delta', '검정', '유의성']}
              rows={postRows}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── Thread Cards ──────────────────────────────────────────────────────────────

function ThreadCard({ thread, overrides }: { thread: any; overrides: any }) {
  const showAnnouncement = !overrides.hideAnnouncement && thread.announcement;
  const showAnalysis = !overrides.hideAnalysis && thread.analysisResults?.length;
  const showOutcome = !overrides.hideOutcome && thread.outcome;
  return (
    <div className="slack-thread-card">
      <div className="slack-thread-header">
        {thread.channelName && <span className="slack-channel">#{thread.channelName}</span>}
        {thread.permalink && (
          <a className="slack-permalink" href={thread.permalink} target="_blank" rel="noopener noreferrer">
            Slack에서 보기 ↗
          </a>
        )}
      </div>
      {showAnnouncement && (
        <div className="slack-section">
          <h4 className="slack-section-title slack-section-title--lg">공지</h4>
          <div className="slack-text" dangerouslySetInnerHTML={{
            __html: escapeHtml(cleanSlackText(thread.announcement.text)).replaceAll('\n', '<br>')
          }} />
        </div>
      )}
      {showAnalysis && (
        <div className="slack-section">
          <h4 className="slack-section-title slack-section-title--lg">분석 결과 ({thread.analysisResults.length}건)</h4>
          {thread.analysisResults.map((r: any, i: number) => (
            <div className="slack-analysis-item" key={i}>
              <div className="slack-analysis-index">{i + 1}</div>
              <div className="slack-text" dangerouslySetInnerHTML={{
                __html: escapeHtml(cleanSlackText(r.text)).replaceAll('\n', '<br>')
              }} />
              {(r.images || []).map((img: any, j: number) => {
                const imgSrc = img.proxyUrl || img.url || '';
                return (
                  <img key={j} className="slack-image" src={imgSrc} alt="분석 이미지" loading="lazy"
                    {...(img.width && img.height ? { width: img.width, height: img.height } : {})}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
      {showOutcome && (
        <div className="slack-section">
          <h4 className="slack-section-title slack-section-title--lg">결과</h4>
          <div className="slack-text" dangerouslySetInnerHTML={{
            __html: escapeHtml(cleanSlackText(thread.outcome.text)).replaceAll('\n', '<br>')
          }} />
        </div>
      )}
    </div>
  );
}

function ManualCard({ manual }: { manual: any }) {
  return (
    <div className="slack-thread-card slack-thread-card--manual">
      <div className="slack-thread-header">
        <span className="thread-manual-badge">수동 추가</span>
      </div>
      {manual.announcement && (
        <div className="slack-section">
          <h4 className="slack-section-title slack-section-title--lg">공지</h4>
          <div className="slack-text" dangerouslySetInnerHTML={{
            __html: escapeHtml(cleanSlackText(manual.announcement.text)).replaceAll('\n', '<br>')
          }} />
        </div>
      )}
      {manual.analysisItems?.length > 0 && (
        <div className="slack-section">
          <h4 className="slack-section-title slack-section-title--lg">분석 결과 ({manual.analysisItems.length}건)</h4>
          {manual.analysisItems.map((item: any, i: number) => (
            <div className="slack-analysis-item" key={i}>
              <div className="slack-analysis-index">{i + 1}</div>
              <div className="slack-text" dangerouslySetInnerHTML={{
                __html: escapeHtml(cleanSlackText(item.text)).replaceAll('\n', '<br>')
              }} />
              {(item.images || []).map((img: any, j: number) => {
                const imgSrc = img.proxyUrl || img.url || '';
                return (
                  <img key={j} className="slack-image" src={imgSrc} alt="분석 이미지" loading="lazy"
                    {...(img.width && img.height ? { width: img.width, height: img.height } : {})}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
      {manual.outcome && (
        <div className="slack-section">
          <h4 className="slack-section-title slack-section-title--lg">결과</h4>
          <div className="slack-text" dangerouslySetInnerHTML={{
            __html: escapeHtml(cleanSlackText(manual.outcome.text)).replaceAll('\n', '<br>')
          }} />
        </div>
      )}
    </div>
  );
}

// ── AbTestInSlackTab ──────────────────────────────────────────────────────────

function AbTestInSlackTab() {
  const [game, setGame] = useState('cvs');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState<number | null>(null);
  const [dateTo, setDateTo] = useState<number | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calStep, setCalStep] = useState(0);
  const [rows, setRows] = useState<any[] | null>(null);
  const [listMeta, setListMeta] = useState('목록을 불러오는 중입니다.');
  const [selected, setSelected] = useState<any | null>(null);
  const [slackThreads, setSlackThreads] = useState<any[]>([]);
  const [manualData, setManualData] = useState<any>(null);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackNotFound, setSlackNotFound] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [announcementUrl, setAnnouncementUrl] = useState('');
  const [announcementStatus, setAnnouncementStatus] = useState('');
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [outcomeUrl, setOutcomeUrl] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('');
  const [loadedGame, setLoadedGame] = useState<string | null>(null);
  const announcementSubmitRef = useRef(false);
  const analysisSubmitRef = useRef(false);
  const outcomeSubmitRef = useRef(false);

  const loadList = useCallback(async (g: string) => {
    setListMeta('목록을 불러오는 중입니다.');
    setRows(null);
    try {
      const payload = await getAbtestList(g);
      setRows(payload.rows);
      setLoadedGame(g);
    } catch (err: any) {
      setListMeta(err.message);
    }
  }, []);

  useEffect(() => { loadList('cvs'); }, [loadList]);

  useEffect(() => {
    if (loadedGame !== game) loadList(game);
  }, [game, loadedGame, loadList]);

  const applyFilter = (allRows: any[]) => {
    let result = allRows;
    const raw = searchText.trim().toLowerCase();
    if (raw) {
      const tokens = raw.split(/\s+/);
      result = result.filter(row => {
        const hay = ((row.name || '') + ' ' + (row.ids || []).join(' ')).toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }
    if (statusFilter === 'active') result = result.filter(isRowActive);
    else if (statusFilter === 'ended') result = result.filter(r => !isRowActive(r));
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
  };

  const filteredRows = rows ? applyFilter(rows) : [];

  useEffect(() => {
    if (rows === null) return;
    const suffix = rows.length !== filteredRows.length ? ` (전체 ${rows.length}개 중)` : '';
    setListMeta(`${filteredRows.length}개의 A/B Test${suffix}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchText, statusFilter, dateFrom, dateTo]);

  async function selectAbtest(row: any) {
    setSelected(row);
    setSlackLoading(true);
    setSlackNotFound(null);
    setSlackThreads([]);
    setManualData(null);
    setEditOpen(false);

    const key = abtestTestKey(row);
    const [slackResult, manualResult] = await Promise.allSettled([
      postSlackAbtest({
        testIds: row.ids || [],
        testName: row.name || '',
        startDate: row.startTs ? row.startTs.slice(0, 10) : undefined,
        endDate: row.endTs ? row.endTs.slice(0, 10) : undefined,
      }),
      getAbtestManual(key),
    ]);
    setSlackLoading(false);
    const threads = slackResult.status === 'fulfilled' ? (slackResult.value.threads || []) : [];
    const md = manualResult.status === 'fulfilled' ? manualResult.value : { announcement: null, analysisItems: [], outcome: null };
    setSlackThreads(threads);
    setManualData(md);
    const hasManual = !!(md.announcement || md.analysisItems?.length || md.outcome);
    if (slackResult.status === 'rejected' && !hasManual) {
      setSlackNotFound(`오류: ${(slackResult.reason as any)?.message || 'Slack 조회 실패'}`);
    } else if (!threads.length && !hasManual) {
      setSlackNotFound('Slack에서 관련 스레드를 찾지 못했습니다.');
    }
  }

  async function refreshManual() {
    if (!selected) return;
    const key = abtestTestKey(selected);
    try {
      const md = await getAbtestManual(key);
      setManualData(md);
    } catch {
      setManualData({ announcement: null, analysisItems: [], outcome: null });
    }
  }

  async function callManualApi(method: string, fn: () => Promise<any>) {
    await fn();
    await refreshManual();
  }

  // Calendar
  const fmtCalDate = (ts: number | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const DAYS_HDR = ['일','월','화','수','목','금','토'];

  const renderCalendar = () => {
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const rangeFrom = dateFrom && dateTo ? Math.min(dateFrom, dateTo) : dateFrom;
    const rangeTo = dateFrom && dateTo ? Math.max(dateFrom, dateTo) : null;
    const cells: React.ReactElement[] = [];
    let day = 1;
    for (let w = 0; w < 6; w++) {
      const rowCells: React.ReactElement[] = [];
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        if (idx < firstDow || day > daysInMonth) {
          rowCells.push(<td key={d} />);
        } else {
          const ts = new Date(calYear, calMonth, day).getTime();
          let cls = 'cal-day';
          if (rangeFrom && rangeTo && ts >= rangeFrom && ts <= rangeTo) cls += ' cal-in-range';
          if (rangeFrom && ts === rangeFrom) cls += ' cal-edge';
          if (rangeTo && ts === rangeTo) cls += ' cal-edge';
          const dayNum = day;
          rowCells.push(
            <td key={d} className={cls} onClick={() => {
              if (calStep !== 1) {
                setDateFrom(ts); setDateTo(null); setCalStep(1);
              } else {
                setDateTo(ts); setCalStep(2);
              }
            }}>{dayNum}</td>
          );
          day++;
        }
      }
      cells.push(<tr key={w}>{rowCells}</tr>);
      if (day > daysInMonth) break;
    }
    const hint = calStep === 0 ? '시작 날짜를 선택하세요'
      : calStep === 1 ? `${fmtCalDate(dateFrom)} → 종료 날짜를 선택하세요`
      : `${fmtCalDate(rangeFrom)} ~ ${fmtCalDate(rangeTo)}`;
    return (
      <div className="abtest-cal">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => {
            let m = calMonth - 1, y = calYear;
            if (m < 0) { m = 11; y--; }
            setCalMonth(m); setCalYear(y);
          }}>‹</button>
          <span className="cal-month-label">{calYear}년 {MONTHS[calMonth]}</span>
          <button className="cal-nav-btn" onClick={() => {
            let m = calMonth + 1, y = calYear;
            if (m > 11) { m = 0; y++; }
            setCalMonth(m); setCalYear(y);
          }}>›</button>
        </div>
        <p className="cal-hint">{hint}</p>
        <table className="cal-grid">
          <thead><tr>{DAYS_HDR.map(d => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>{cells}</tbody>
        </table>
      </div>
    );
  };

  const dateRangeLabel = dateFrom && dateTo
    ? `${fmtCalDate(Math.min(dateFrom, dateTo))} ~ ${fmtCalDate(Math.max(dateFrom, dateTo))}`
    : '날짜 검색';

  const hasManual = !!(manualData?.announcement || manualData?.analysisItems?.length || manualData?.outcome);
  const overrides = {
    hideAnnouncement: !!manualData?.announcement,
    hideAnalysis: !!(manualData?.analysisItems?.length),
    hideOutcome: !!manualData?.outcome,
  };

  // Conclusion editing state per row
  const [editingConclusion, setEditingConclusion] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<any[]>([]);

  useEffect(() => {
    if (rows) setLocalRows(rows);
  }, [rows]);

  const updateConclusion = async (row: any, val: string) => {
    await postAbtestConclusion(row.primaryId, val || null);
    setLocalRows(prev => prev.map(r => r.primaryId === row.primaryId ? { ...r, conclusion: val || null } : r));
    setEditingConclusion(null);
  };

  const filteredLocalRows = localRows.length ? applyFilter(localRows) : filteredRows;

  if (selected) {
    return (
      <div>
        <div className="abtest-detail-header">
          <button className="secondary-button" type="button" style={{ padding: '10px 16px', border: 'none', borderRadius: 14, color: '#fff', cursor: 'pointer' }}
            onClick={() => setSelected(null)}>← 목록으로</button>
          <div>
            <h2>{selected.name || `A/B Test #${(selected.ids || []).join(', ')}`}</h2>
            <p className="subheadline">ID: {(selected.ids || []).join(', ')} · {pstDatetime(selected.startTs)} ~ {pstDatetime(selected.endTs)} (PST)</p>
          </div>
          <button type="button" className="abtest-edit-btn" onClick={() => {
            if (!editOpen && !confirm('수동 데이터를 수정하시겠습니까?')) return;
            setEditOpen(!editOpen);
          }}>{editOpen ? '수정 닫기' : '수정'}</button>
        </div>

        {editOpen && (
          <div className="abtest-edit-panel">
            <div className="edit-panel-header">
              <h3 className="edit-panel-title">수동 추가</h3>
              <div className="edit-panel-header-actions">
                <button type="button" className="edit-reset-btn" onClick={async () => {
                  if (!confirm('수동으로 추가한 데이터를 모두 삭제하시겠습니까?')) return;
                  await deleteManualAll({ key: abtestTestKey(selected) });
                  await refreshManual();
                }}>초기화</button>
                <button type="button" className="edit-panel-close" onClick={() => setEditOpen(false)}>×</button>
              </div>
            </div>

            {/* Announcement */}
            <div className="edit-section">
              <h4 className="edit-section-title">공지</h4>
              {manualData?.announcement && (
                <div className="edit-saved-item">
                  <div className="edit-saved-info">
                    {manualData.announcement.channelName && <span className="edit-saved-channel">#{manualData.announcement.channelName}</span>}
                    <span className="edit-saved-desc">{String(manualData.announcement.text || '').slice(0, 100)}</span>
                  </div>
                  <button className="edit-delete-btn" type="button" onClick={async () => {
                    await deleteManualAnnouncement({ key: abtestTestKey(selected) });
                    await refreshManual();
                  }}>삭제</button>
                </div>
              )}
              <div className="edit-input-row">
                <input type="url" className="edit-text-input" placeholder="Slack 링크..." value={announcementUrl}
                  onChange={e => setAnnouncementUrl(e.target.value)} />
                <button type="button" className="edit-submit-btn" disabled={announcementSubmitRef.current}
                  onClick={async () => {
                    if (!announcementUrl.trim()) return;
                    setAnnouncementStatus('처리 중...');
                    announcementSubmitRef.current = true;
                    try {
                      await postManualAnnouncement({ key: abtestTestKey(selected), slackUrl: announcementUrl.trim(), testIds: selected.ids || [] });
                      setAnnouncementUrl('');
                      setAnnouncementStatus('설정되었습니다.');
                      await refreshManual();
                    } catch (err: any) { setAnnouncementStatus(`오류: ${err.message}`); }
                    finally { announcementSubmitRef.current = false; }
                  }}>설정</button>
              </div>
              <p className="edit-status">{announcementStatus}</p>
            </div>

            {/* Analysis */}
            <div className="edit-section">
              <h4 className="edit-section-title">분석 결과</h4>
              {(manualData?.analysisItems || []).map((item: any, i: number) => (
                <div className="edit-saved-item" key={item.id}>
                  <div className="edit-analysis-controls">
                    <button type="button" className="edit-ctrl-btn" disabled={i === 0} onClick={async () => {
                      const items = manualData.analysisItems;
                      const newItems = [...items];
                      [newItems[i - 1], newItems[i]] = [newItems[i], newItems[i - 1]];
                      await postManualAnalysisReorder({ key: abtestTestKey(selected), orderedIds: newItems.map((x: any) => x.id) });
                      await refreshManual();
                    }}>▲</button>
                    <button type="button" className="edit-ctrl-btn" disabled={i === manualData.analysisItems.length - 1} onClick={async () => {
                      const items = manualData.analysisItems;
                      const newItems = [...items];
                      [newItems[i], newItems[i + 1]] = [newItems[i + 1], newItems[i]];
                      await postManualAnalysisReorder({ key: abtestTestKey(selected), orderedIds: newItems.map((x: any) => x.id) });
                      await refreshManual();
                    }}>▼</button>
                  </div>
                  <div className="edit-saved-info">
                    {item.channelName && <span className="edit-saved-channel">#{item.channelName}</span>}
                    <span className="edit-saved-desc">{String(item.text || '').slice(0, 100)}</span>
                  </div>
                  <button className="edit-delete-btn" type="button" onClick={async () => {
                    await deleteManualAnalysis({ key: abtestTestKey(selected), id: item.id });
                    await refreshManual();
                  }}>삭제</button>
                </div>
              ))}
              <div className="edit-input-row">
                <input type="url" className="edit-text-input" placeholder="Slack 링크..." value={analysisUrl}
                  onChange={e => setAnalysisUrl(e.target.value)} />
                <button type="button" className="edit-submit-btn" onClick={async () => {
                  if (!analysisUrl.trim()) return;
                  setAnalysisStatus('처리 중...');
                  try {
                    const data: any = await postManualAnalysis({ key: abtestTestKey(selected), slackUrl: analysisUrl.trim(), testIds: selected.ids || [] });
                    setAnalysisUrl('');
                    setAnalysisStatus(`${data.added?.length || 1}건 추가되었습니다.`);
                    await refreshManual();
                  } catch (err: any) { setAnalysisStatus(`오류: ${err.message}`); }
                }}>추가</button>
              </div>
              <p className="edit-status">{analysisStatus}</p>
            </div>

            {/* Outcome */}
            <div className="edit-section">
              <h4 className="edit-section-title">결과</h4>
              {manualData?.outcome && (
                <div className="edit-saved-item">
                  <div className="edit-saved-info">
                    {manualData.outcome.channelName && <span className="edit-saved-channel">#{manualData.outcome.channelName}</span>}
                    <span className="edit-saved-desc">{String(manualData.outcome.text || '').slice(0, 100)}</span>
                  </div>
                  <button className="edit-delete-btn" type="button" onClick={async () => {
                    await deleteManualOutcome({ key: abtestTestKey(selected) });
                    await refreshManual();
                  }}>삭제</button>
                </div>
              )}
              <div className="edit-input-row">
                <input type="url" className="edit-text-input" placeholder="Slack 링크..." value={outcomeUrl}
                  onChange={e => setOutcomeUrl(e.target.value)} />
                <button type="button" className="edit-submit-btn" onClick={async () => {
                  if (!outcomeUrl.trim()) return;
                  setOutcomeStatus('처리 중...');
                  try {
                    await postManualOutcome({ key: abtestTestKey(selected), slackUrl: outcomeUrl.trim(), testIds: selected.ids || [] });
                    setOutcomeUrl('');
                    setOutcomeStatus('설정되었습니다.');
                    await refreshManual();
                  } catch (err: any) { setOutcomeStatus(`오류: ${err.message}`); }
                }}>설정</button>
              </div>
              <p className="edit-status">{outcomeStatus}</p>
            </div>
          </div>
        )}

        {slackLoading && <div className="abtest-slack-loading">Slack 데이터를 불러오는 중입니다...</div>}
        {!slackLoading && slackNotFound && !hasManual && (
          <div className="abtest-slack-notfound">{slackNotFound}</div>
        )}
        {!slackLoading && (slackThreads.length > 0 || hasManual) && (
          <div>
            {slackThreads.map((t: any, i: number) => <ThreadCard key={i} thread={t} overrides={overrides} />)}
            {hasManual && <ManualCard manual={manualData} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="abtest-list-section">
      <div className="panel-header panel-header-tight">
        <h2>A/B Tests</h2>
        <p className="subheadline">{listMeta}</p>
      </div>
      <div className="abtest-search-bar">
        <select className="abtest-game-select" value={game} onChange={e => { setGame(e.target.value); setLoadedGame(null); }}>
          <option value="cvs">CVS</option>
          <option value="cbn">CBN</option>
          <option value="jpm">JPM</option>
        </select>
        <select className="abtest-game-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">전체</option>
          <option value="active">진행중</option>
          <option value="ended">종료</option>
        </select>
        <input type="text" className="abtest-search-input" placeholder="이름, ID 검색..." value={searchText}
          onChange={e => setSearchText(e.target.value)} autoComplete="off" />
        <button type="button" className={`abtest-date-btn${showCal ? ' abtest-date-btn--active' : ''}`}
          onClick={() => setShowCal(!showCal)}>{dateRangeLabel}</button>
        {(dateFrom && dateTo) && (
          <button type="button" className="abtest-date-clear" onClick={() => {
            setDateFrom(null); setDateTo(null); setCalStep(0); setShowCal(false);
          }}>× 초기화</button>
        )}
      </div>
      {showCal && <div className="abtest-cal-wrap">{renderCalendar()}</div>}
      <div className="abtest-list-root">
        {filteredLocalRows.length === 0 && rows !== null && <p>검색 결과가 없습니다.</p>}
        {filteredLocalRows.length > 0 && (
          <table className="abtest-table">
            <thead>
              <tr><th>ID</th><th>이름</th><th>시작 (PST)</th><th>종료 (PST)</th><th>결론</th></tr>
            </thead>
            <tbody>
              {filteredLocalRows.map((row, i) => {
                const rowCls = `abtest-row ${isRowActive(row) ? 'abtest-row--active' : 'abtest-row--ended'} ${conclusionRowClass(row.conclusion)}`;
                const isEditing = editingConclusion === (row.primaryId ?? i);
                return (
                  <tr key={row.primaryId ?? i} className={rowCls} onClick={() => selectAbtest(row)}>
                    <td className="abtest-id">{(row.ids || []).join(', ')}</td>
                    <td className="abtest-name">{row.name || '-'}</td>
                    <td>{pstDatetime(row.startTs)}</td>
                    <td>{pstDatetime(row.endTs)}</td>
                    <td className="conclusion-cell" onClick={e => e.stopPropagation()}>
                      {!isEditing && (
                        <>
                          <span dangerouslySetInnerHTML={{ __html: renderConclusionBadgeHtml(row.conclusion, row.populationWeight) }} />
                          <button className="conclusion-edit-btn" title="결론 변경"
                            onClick={e => { e.stopPropagation(); setEditingConclusion(row.primaryId ?? i); }}>✎</button>
                        </>
                      )}
                      {isEditing && (
                        <select className="conclusion-select" defaultValue={row.conclusion || ''}
                          autoFocus
                          onChange={async e => { await updateConclusion(row, e.target.value); }}
                          onBlur={() => setEditingConclusion(null)}>
                          {conclusionOptions(row.populationWeight).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── AbTestDashboardTab ────────────────────────────────────────────────────────

function AbTestDashboardTab() {
  const [game, setGame] = useState('cvs');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [listMeta, setListMeta] = useState('목록을 불러오는 중입니다.');
  const [loadedGame, setLoadedGame] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailMeta, setDetailMeta] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [analysisGame, setAnalysisGame] = useState('cvs');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [groupA, setGroupA] = useState('');
  const [groupB, setGroupB] = useState('');
  const [cacheResetting, setCacheResetting] = useState(false);

  const loadList = useCallback(async (g: string) => {
    setListMeta('목록을 불러오는 중입니다.');
    setRows(null);
    try {
      const payload = await getAbtestAnalysisList(g);
      setRows(payload.rows);
      setLoadedGame(g);
    } catch (err: any) {
      setListMeta(err.message);
    }
  }, []);

  useEffect(() => { loadList('cvs'); }, [loadList]);
  useEffect(() => {
    if (loadedGame !== game) loadList(game);
  }, [game, loadedGame, loadList]);

  const applyFilter = (allRows: any[]) => {
    let result = allRows;
    const raw = searchText.trim().toLowerCase();
    if (raw) {
      const tokens = raw.split(/\s+/);
      result = result.filter(row => {
        const hay = ((row.name || '') + ' ' + (row.ids || []).join(' ')).toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }
    if (statusFilter === 'active') result = result.filter(isRowActive);
    else if (statusFilter === 'ended') result = result.filter(r => !isRowActive(r));
    return result;
  };

  const filteredRows = rows ? applyFilter(rows) : [];

  useEffect(() => {
    if (rows === null) return;
    const suffix = rows.length !== filteredRows.length ? ` (전체 ${rows.length}개 중)` : '';
    setListMeta(`${filteredRows.length}개의 A/B Test${suffix}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchText, statusFilter]);

  async function runFlow(id: string, g: string) {
    if (!id) return;
    setAnalysisLoading(true);
    setAnalysisData(null);
    setAnalysisError(null);
    try {
      const data = await runAbtestAnalysis(id, g);
      const renamed = applyGroupRename(data);
      setAnalysisData(renamed);
      const names = renamed.allGroupNames || [];
      setGroupA(names[0] || '');
      setGroupB(names[1] || names[0] || '');
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function selectRow(row: any) {
    const g = game;
    setAnalysisGame(g);
    setAnalysisId((row.ids || []).join(','));
    setDetailTitle(row.name || `A/B Test #${(row.ids || []).join(', ')}`);
    setDetailMeta(`ID: ${(row.ids || []).join(', ')} · ${pstDatetime(row.startTs)} ~ ${pstDatetime(row.endTs)} (PST)`);
    setShowDetail(true);
    runFlow((row.ids || []).join(','), g);
  }

  async function handleCacheReset() {
    if (!analysisId) return;
    if (!confirm(`ID ${analysisId} 캐시를 삭제하고 재분석하시겠습니까?`)) return;
    setCacheResetting(true);
    try {
      await deleteAnalysisCache(analysisId, analysisGame);
    } finally {
      setCacheResetting(false);
    }
    runFlow(analysisId, analysisGame);
  }

  const allGroupNames: string[] = analysisData?.allGroupNames || [];

  return (
    <div>
      {!showDetail ? (
        <div id="abtest-analysis-list-section">
          <div className="panel-header panel-header-tight">
            <h2>A/B Test 분석</h2>
            <p className="subheadline">테스트를 선택하면 Retention, Revenue, Wager, %ROOC를 통계 검정과 함께 분석합니다.</p>
          </div>
          <div className="abtest-search-bar">
            <select className="abtest-game-select" value={game} onChange={e => { setGame(e.target.value); setLoadedGame(null); }}>
              <option value="cvs">CVS</option>
              <option value="cbn">CBN</option>
              <option value="jpm">JPM</option>
            </select>
            <select className="abtest-game-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="active">진행중</option>
              <option value="ended">종료</option>
            </select>
            <input type="text" className="abtest-search-input" placeholder="이름, ID 검색..." value={searchText}
              onChange={e => setSearchText(e.target.value)} autoComplete="off" />
          </div>
          <p className="subheadline">{listMeta}</p>
          <div className="abtest-list-root">
            {filteredRows.length === 0 && rows !== null && <p>검색 결과가 없습니다.</p>}
            {filteredRows.length > 0 && (
              <table className="abtest-table">
                <thead>
                  <tr><th>ID</th><th>이름</th><th>시작 (PST)</th><th>종료 (PST)</th><th>결론</th></tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const rowCls = `abtest-row ${isRowActive(row) ? 'abtest-row--active' : 'abtest-row--ended'} ${conclusionRowClass(row.conclusion)}`;
                    return (
                      <tr key={row.primaryId ?? i} className={rowCls} onClick={() => selectRow(row)}>
                        <td className="abtest-id">{(row.ids || []).join(', ')}</td>
                        <td className="abtest-name">{row.name || '-'}</td>
                        <td>{pstDatetime(row.startTs)}</td>
                        <td>{pstDatetime(row.endTs)}</td>
                        <td className="conclusion-cell" dangerouslySetInnerHTML={{ __html: renderConclusionBadgeHtml(row.conclusion, row.populationWeight) }} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div id="abtest-analysis-detail-section">
          <div className="abtest-detail-header">
            <button className="secondary-button" type="button" style={{ padding: '10px 16px', border: 'none', borderRadius: 14, color: '#fff', cursor: 'pointer' }}
              onClick={() => setShowDetail(false)}>← 목록으로</button>
            <div>
              <h2>{detailTitle}</h2>
              <p className="subheadline">{detailMeta}</p>
            </div>
            {analysisData && (
              <button type="button" className="cache-reset-button" disabled={cacheResetting} onClick={handleCacheReset}>
                {cacheResetting ? '삭제 중...' : '캐시 삭제'}
              </button>
            )}
          </div>

          <form className="analysis-form" onSubmit={e => { e.preventDefault(); runFlow(analysisId, analysisGame); }}>
            <label className="field">
              <span className="form-label">Game</span>
              <select value={analysisGame} onChange={e => setAnalysisGame(e.target.value)}>
                <option value="cvs">CVS</option>
                <option value="cbn">CBN</option>
                <option value="jpm">JPM</option>
              </select>
            </label>
            <label className="field">
              <span className="form-label">A/B Test ID</span>
              <input type="text" value={analysisId} onChange={e => setAnalysisId(e.target.value)}
                placeholder="e.g. 215" autoComplete="off" />
            </label>
            <button className="run-button" type="submit">분석 실행</button>
            <button type="button" className="cache-reset-button" disabled={cacheResetting} onClick={handleCacheReset}>
              {cacheResetting ? '삭제 중...' : '캐시 초기화'}
            </button>
          </form>

          {!analysisLoading && !analysisData && !analysisError && (
            <div className="analysis-empty">
              <strong>아직 실행 전입니다.</strong>
              <p>Game과 A/B Test ID를 입력하고 실행하면 통계 검정 결과를 볼 수 있습니다.</p>
            </div>
          )}
          {analysisError && (
            <div className="analysis-empty">
              <strong>오류가 발생했습니다.</strong>
              <p>{analysisError}</p>
            </div>
          )}
          {analysisLoading && (
            <p className="subheadline">쿼리 실행 중입니다. 잠시만 기다려주세요...</p>
          )}

          {analysisData && !analysisLoading && (
            <>
              {/* Groups summary */}
              <div className="analysis-card">
                <div className="visual-card-head"><h3>그룹 구성</h3></div>
                <div className="summary-grid">
                  {analysisData.groups.map((g: any) => (
                    <div key={g.group_name} className="summary-card">
                      <p className="summary-label">{g.group_name}</p>
                      <p className="summary-value">{fmtNum(g.n)}</p>
                      <p className="summary-sub">assigned users</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pair selector */}
              <div className="analysis-card pair-selector-card">
                <div className="pair-selector">
                  <span className="pair-selector-label">상세 비교</span>
                  <select className="pair-group-select" value={groupA} onChange={e => setGroupA(e.target.value)}>
                    {allGroupNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="pair-vs">vs</span>
                  <select className="pair-group-select" value={groupB} onChange={e => setGroupB(e.target.value)}>
                    {allGroupNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {groupA && groupB && (
                <AnalysisResults data={analysisData} groupA={groupA} groupB={groupB} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── ProductConfigTab ──────────────────────────────────────────────────────────

function ProductConfigTab() {
  const [game, setGame] = useState('cvs');
  const [searchText, setSearchText] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [listMeta, setListMeta] = useState('목록을 불러오는 중입니다.');
  const [loadedGame, setLoadedGame] = useState<string | null>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [loadedConfigs, setLoadedConfigs] = useState<Record<string, string[]>>({});
  const [savedStatuses, setSavedStatuses] = useState<Record<string, string>>({});
  const [checkedTypes, setCheckedTypes] = useState<Record<string, Set<string>>>({});

  const loadList = useCallback(async (g: string) => {
    setListMeta('목록을 불러오는 중입니다.');
    setRows(null);
    try {
      const payload = await getAbtestAnalysisList(g);
      setRows(payload.rows);
      setLoadedGame(g);
    } catch (err: any) {
      setListMeta(err.message);
    }
  }, []);

  useEffect(() => { loadList('cvs'); }, [loadList]);
  useEffect(() => {
    if (loadedGame !== game) loadList(game);
  }, [game, loadedGame, loadList]);

  const filteredRows = rows ? rows.filter(row => {
    const raw = searchText.trim().toLowerCase();
    if (!raw) return true;
    const tokens = raw.split(/\s+/);
    const hay = ((row.name || '') + ' ' + (row.ids || []).join(' ')).toLowerCase();
    return tokens.every(t => hay.includes(t));
  }) : [];

  useEffect(() => {
    if (rows === null) return;
    const suffix = rows.length !== filteredRows.length ? ` (전체 ${rows.length}개 중)` : '';
    setListMeta(`${filteredRows.length}개의 A/B Test${suffix}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchText]);

  const toggleRow = async (key: string, row: any) => {
    const isOpen = openKeys.has(key);
    if (isOpen) {
      setOpenKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
      return;
    }
    setOpenKeys(prev => new Set(prev).add(key));
    if (!loadedConfigs[key]) {
      try {
        const config = await getProductConfig(key);
        const saved = new Set(config.productTypes || []);
        setLoadedConfigs(prev => ({ ...prev, [key]: config.productTypes || [] }));
        setCheckedTypes(prev => ({ ...prev, [key]: saved }));
      } catch {
        setLoadedConfigs(prev => ({ ...prev, [key]: [] }));
        setCheckedTypes(prev => ({ ...prev, [key]: new Set() }));
      }
    }
  };

  const handleCheck = (key: string, pt: string, checked: boolean) => {
    setCheckedTypes(prev => {
      const s = new Set(prev[key] || []);
      if (checked) s.add(pt); else s.delete(pt);
      return { ...prev, [key]: s };
    });
  };

  const handleSave = async (key: string) => {
    const types = [...(checkedTypes[key] || [])];
    try {
      await setProductConfig(key, types);
      setSavedStatuses(prev => ({ ...prev, [key]: `저장되었습니다. (${types.length}개 선택)` }));
      setTimeout(() => setSavedStatuses(prev => ({ ...prev, [key]: '' })), 2000);
    } catch {
      setSavedStatuses(prev => ({ ...prev, [key]: '저장 실패' }));
    }
  };

  const handleClear = async (key: string) => {
    setCheckedTypes(prev => ({ ...prev, [key]: new Set() }));
    await clearProductConfig(key);
    setSavedStatuses(prev => ({ ...prev, [key]: '초기화되었습니다.' }));
    setTimeout(() => setSavedStatuses(prev => ({ ...prev, [key]: '' })), 2000);
  };

  return (
    <div id="product-config-list-section">
      <div className="panel-header panel-header-tight">
        <h2>Product 타입 설정</h2>
        <p className="subheadline">AB Test별로 분석에 포함할 상품 타입을 선택하고 저장합니다. 미선택 시 해당 테스트의 상품 분석을 건너뜁니다.</p>
      </div>
      <div className="abtest-search-bar">
        <select className="abtest-game-select" value={game} onChange={e => { setGame(e.target.value); setLoadedGame(null); }}>
          <option value="cvs">CVS</option>
          <option value="cbn">CBN</option>
          <option value="jpm">JPM</option>
        </select>
        <input type="text" className="abtest-search-input" placeholder="이름, ID 검색..." value={searchText}
          onChange={e => setSearchText(e.target.value)} autoComplete="off" />
      </div>
      <p className="subheadline">{listMeta}</p>
      <div className="abtest-list-root">
        {filteredRows.length === 0 && rows !== null && <p>검색 결과가 없습니다.</p>}
        {filteredRows.length > 0 && (
          <table className="abtest-table pc-accordion-table">
            <thead>
              <tr><th></th><th>ID</th><th>이름</th><th>시작 (PST)</th><th>종료 (PST)</th></tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => {
                const key = productConfigKey(game, row.ids || []);
                const isOpen = openKeys.has(key);
                const configLoaded = key in loadedConfigs;
                const checked = checkedTypes[key] || new Set();
                return (
                  <React.Fragment key={row.primaryId ?? i}>
                    <tr className={`abtest-row pc-accordion-row${isOpen ? ' pc-accordion-row--open' : ''}`}
                      onClick={() => toggleRow(key, row)}>
                      <td className="pc-chevron">{isOpen ? '▼' : '▶'}</td>
                      <td>{(row.ids || []).join(', ')}</td>
                      <td className="abtest-name">{row.name || ''}</td>
                      <td>{pstDatetime(row.startTs)}</td>
                      <td>{pstDatetime(row.endTs)}</td>
                    </tr>
                    {isOpen && (
                      <tr className="pc-expand-row">
                        <td colSpan={5} className="pc-expand-cell">
                          <div className="pc-expand-inner">
                            {!configLoaded ? (
                              <p className="pc-expand-loading">불러오는 중...</p>
                            ) : (
                              <>
                                <div className="product-config-types">
                                  {ALL_PRODUCT_TYPES.map(pt => (
                                    <label key={pt} className="product-filter-chip">
                                      <input type="checkbox" name="pt" value={pt}
                                        checked={checked.has(pt)}
                                        onChange={e => handleCheck(key, pt, e.target.checked)} />
                                      {pt}
                                    </label>
                                  ))}
                                </div>
                                <div className="product-config-footer">
                                  <button type="button" className="run-button" onClick={() => handleSave(key)}>저장</button>
                                  <button type="button" className="edit-reset-btn" onClick={() => handleClear(key)}>초기화</button>
                                  <p className="edit-status">{savedStatuses[key] || ''}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

type Tab = 'list' | 'analysis' | 'product-config';

export default function AbTestPage() {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearAll = async () => {
    if (!confirm('전체 캐시를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    setClearingCache(true);
    try { await deleteAllAnalysisCache(); } finally { setClearingCache(false); }
  };

  return (
    <div className="page-shell page-shell-compact">
      <header className="topbar">
        <div>
          <h1 className="topbar-title">A/B Test Dashboard</h1>
        </div>
        <div className="topbar-meta">
          <button type="button" className="cache-reset-button" disabled={clearingCache} onClick={handleClearAll}>
            {clearingCache ? '초기화 중...' : '캐시 초기화'}
          </button>
        </div>
      </header>

      <nav className="view-tabs">
        <button type="button" className={`view-tab${activeTab === 'list' ? ' is-active' : ''}`} onClick={() => setActiveTab('list')}>
          A/B Test in Slack
        </button>
        <button type="button" className={`view-tab${activeTab === 'analysis' ? ' is-active' : ''}`} onClick={() => setActiveTab('analysis')}>
          A/B Test Dashboard
        </button>
        <button type="button" className={`view-tab view-tab--secondary${activeTab === 'product-config' ? ' is-active' : ''}`} onClick={() => setActiveTab('product-config')}>
          Product 설정
        </button>
      </nav>

      {activeTab === 'list' && (
        <main className="abtest-view abtest-view--active">
          <section className="panel panel-results abtest-panel">
            <AbTestInSlackTab />
          </section>
        </main>
      )}
      {activeTab === 'analysis' && (
        <main className="abtest-view abtest-view--active">
          <section className="panel panel-results abtest-panel">
            <AbTestDashboardTab />
          </section>
        </main>
      )}
      {activeTab === 'product-config' && (
        <main className="abtest-view abtest-view--active">
          <section className="panel panel-results abtest-panel">
            <ProductConfigTab />
          </section>
        </main>
      )}
    </div>
  );
}
