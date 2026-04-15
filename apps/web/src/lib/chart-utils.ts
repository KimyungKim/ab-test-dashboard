// eslint-disable-next-line @typescript-eslint/no-explicit-any

export const CHART_COLORS = ['#94a3b8', '#0f7173', '#f97316', '#a855f7', '#ec4899', '#10b981'];

function fmtNum(v: any, dec = 0): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: dec });
}

export function setupCanvas(canvas: HTMLCanvasElement, H: number): { ctx: CanvasRenderingContext2D; W: number; H: number } {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = '';
  canvas.width = 1;
  const W = canvas.parentElement?.clientWidth || 400;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  pad: { top: number; right: number; bottom: number; left: number },
  W: number,
  H: number,
  maxV: number,
  steps: number,
  formatY: (v: number) => string
): void {
  for (let i = 0; i <= steps; i++) {
    const v = maxV * i / steps;
    const y = pad.top + (H - pad.top - pad.bottom) * (1 - i / steps);
    ctx.strokeStyle = '#e5e0d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#9e9790';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(formatY(v), pad.left - 5, y + 4);
  }
}

export interface GroupedBarChartOptions {
  xLabels: string[];
  groups: { name: string; color: string; values: (number | null)[] }[];
  formatY?: (v: number) => string;
  chartH?: number;
}

export function drawGroupedBarChart(canvas: HTMLCanvasElement, options: GroupedBarChartOptions): void {
  const { xLabels, groups, formatY = (v: number) => fmtNum(v, 2), chartH: fixedH = 220 } = options;
  if (!canvas) return;
  const H = fixedH;
  const { ctx, W } = setupCanvas(canvas, H);
  const pad = { top: 28, right: 16, bottom: 44, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const valid = groups.filter(g => g.values.some(v => v != null && v > 0));
  if (!valid.length) return;
  const maxV = Math.max(...valid.flatMap(g => g.values).filter((v): v is number => v != null), 0.001) * 1.2;

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
    ctx.fillStyle = '#63584f';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label, slotCX, H - pad.bottom + 14);
  });

  const legendY = H - 8;
  const totalW = valid.reduce((s, g) => s + 10 + 4 + ctx.measureText(g.name).width + 12, 0);
  let lx = W / 2 - totalW / 2;
  valid.forEach(g => {
    ctx.fillStyle = g.color;
    ctx.fillRect(lx, legendY - 9, 10, 10);
    ctx.fillStyle = '#1d1d1b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(g.name, lx + 14, legendY);
    lx += 14 + ctx.measureText(g.name).width + 12;
  });
}

export interface RetentionDayChartOptions {
  groups: { name: string; color: string; value: number | null }[];
  formatY?: (v: number) => string;
}

export function drawRetentionDayChart(canvas: HTMLCanvasElement, options: RetentionDayChartOptions): void {
  const { groups, formatY = (v: number) => `${fmtNum(v, 2)}%` } = options;
  if (!canvas) return;
  const H = 320, W = 130;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const pad = { top: 20, right: 6, bottom: 24, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = groups.map(g => g.value ?? 0);
  const maxV = Math.max(...values.filter(v => v > 0), 0.001) * 1.25;

  for (let i = 0; i <= 2; i++) {
    const v = maxV * i / 2;
    const y = pad.top + chartH * (1 - i / 2);
    ctx.strokeStyle = '#e5e0d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#9e9790';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
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
    ctx.fillStyle = '#1d1d1b';
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(formatY(v), x + barW / 2, y - 2);
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(x + barW / 2, H - pad.bottom + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export interface LineChartPoint {
  day: number;
  value: number;
}

export interface LineChartSeries {
  name: string;
  color: string;
  points: LineChartPoint[];
}

export interface LineChartOptions {
  series: LineChartSeries[];
  durationDays: number;
  formatY?: (v: number) => string;
  chartH?: number;
}

export function getLineTooltip(): HTMLDivElement {
  let t = document.getElementById('linechart-tooltip') as HTMLDivElement | null;
  if (!t) {
    t = document.createElement('div');
    t.id = 'linechart-tooltip';
    document.body.appendChild(t);
  }
  return t;
}

export function drawLineChart(canvas: HTMLCanvasElement, options: LineChartOptions): void {
  const { series, durationDays, formatY = (v: number) => fmtNum(v, 2), chartH: fixedH = 360 } = options;
  if (!canvas) return;
  const H = fixedH;
  const { ctx, W } = setupCanvas(canvas, H);
  const pad = { top: 16, right: 16, bottom: 36, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const allValues = series.flatMap(s => s.points.map(p => p.value));
  const maxV = Math.max(...allValues.filter(v => v > 0), 0.001) * 1.1;

  drawGrid(ctx, pad, W, H, maxV, 4, formatY);

  ctx.fillStyle = '#63584f';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  const xTicks = 4;
  for (let i = 0; i <= xTicks; i++) {
    const day = Math.round(durationDays * i / xTicks);
    const x = pad.left + (day / durationDays) * chartW;
    ctx.fillText(`D${day}`, x, H - pad.bottom + 14);
  }

  for (const { color, points } of series) {
    if (!points.length) continue;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
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
    }
    ctx.stroke();
  }

  const legendY = H - 8;
  ctx.font = '10px system-ui';
  const totalLegW = series.reduce((s, g) => s + 14 + ctx.measureText(g.name).width + 12, 0);
  let lx = Math.max(pad.left, W / 2 - totalLegW / 2);
  for (const { name, color } of series) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, legendY - 6, 10, 2);
    ctx.fillStyle = '#1d1d1b';
    ctx.textAlign = 'left';
    ctx.fillText(name, lx + 14, legendY);
    lx += 14 + ctx.measureText(name).width + 12;
  }

  const tooltip = getLineTooltip();

  canvas.onmousemove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    let closest: (LineChartPoint & { seriesName: string; color: string }) | null = null;
    let minDist = Infinity;
    for (const s of series) {
      for (const p of s.points) {
        const px = pad.left + (p.day / durationDays) * chartW;
        const py = pad.top + chartH * (1 - p.value / maxV);
        const dist = Math.hypot(mx - px, my - py);
        if (dist < minDist) {
          minDist = dist;
          closest = { ...p, seriesName: s.name, color: s.color };
        }
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
        const pt = s.points.find(p => p.day === closest!.day);
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
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY - tooltip.offsetHeight / 2) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  };

  canvas.onmouseleave = () => {
    tooltip.style.display = 'none';
  };
}

export interface BeforeAfterGroup {
  name: string;
  color: string;
}

export interface BeforeAfterChartOptions {
  groups: BeforeAfterGroup[];
  preSeries: Record<string, LineChartPoint[]>;
  inSeries: Record<string, LineChartPoint[]>;
  preDays: number;
  durationDays: number;
  formatY?: (v: number) => string;
  chartH?: number;
}

export function drawBeforeAfterChart(canvas: HTMLCanvasElement, options: BeforeAfterChartOptions): void {
  const { groups, preSeries, inSeries, preDays, durationDays, formatY = (v: number) => fmtNum(v, 2), chartH: fixedH = 360 } = options;
  if (!canvas) return;

  const hasPreData = groups.some(g => (preSeries[g.name] || []).length > 0);
  if (!hasPreData) {
    drawLineChart(canvas, {
      series: groups.map(g => ({ name: g.name, color: g.color, points: inSeries[g.name] || [] })),
      durationDays,
      formatY,
      chartH: fixedH,
    });
    return;
  }

  const H = fixedH;
  const { ctx, W } = setupCanvas(canvas, H);
  const pad = { top: 20, right: 60, bottom: 36, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const gapW = 60;
  const preW = chartW / 3 - gapW / 2;
  const inW = chartW * 2 / 3 - gapW / 2;
  const preEndX = pad.left + preW;
  const inStartX = preEndX + gapW;
  const divX = preEndX + gapW / 2;

  const preVals = groups.flatMap(g => (preSeries[g.name] || []).map(p => p.value));
  const inVals = groups.flatMap(g => (inSeries[g.name] || []).map(p => p.value));
  const maxPre = Math.max(...preVals.filter(v => v > 0), 0.001) * 1.1;
  const maxIn = Math.max(...inVals.filter(v => v > 0), 0.001) * 1.1;

  const xForPre = (day: number) => pad.left + ((day + preDays) / preDays) * preW;
  const xForIn = (day: number) => inStartX + (day / durationDays) * inW;
  const yForPre = (val: number) => pad.top + chartH * (1 - val / maxPre);
  const yForIn = (val: number) => pad.top + chartH * (1 - val / maxIn);

  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  ctx.fillRect(pad.left, pad.top, preW, chartH);

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = maxPre * i / steps;
    const y = pad.top + chartH * (1 - i / steps);
    ctx.strokeStyle = '#e5e0d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(preEndX, y);
    ctx.stroke();
    ctx.fillStyle = '#9e9790';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(formatY(v), pad.left - 5, y + 4);
  }

  for (let i = 0; i <= steps; i++) {
    const v = maxIn * i / steps;
    const y = pad.top + chartH * (1 - i / steps);
    ctx.strokeStyle = '#e5e0d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inStartX, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#9e9790';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(formatY(v), W - pad.right + 5, y + 4);
  }

  ctx.fillStyle = '#63584f';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`D-${preDays}`, xForPre(-preDays), H - pad.bottom + 14);
  ctx.fillText(`D-${Math.round(preDays / 2)}`, xForPre(-Math.round(preDays / 2)), H - pad.bottom + 14);
  for (let i = 0; i <= 4; i++) {
    const day = Math.round(durationDays * i / 4);
    ctx.fillText(`D${day}`, xForIn(day), H - pad.bottom + 14);
  }

  ctx.fillStyle = '#888';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('할당', divX, pad.top - 5);

  ctx.fillStyle = '#aaa';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Before Assign', pad.left + preW / 2, pad.top + 10);
  ctx.fillText('After Assign', inStartX + inW / 2, pad.top + 10);

  for (const g of groups) {
    const pts = (preSeries[g.name] || []).slice().sort((a, b) => a.day - b.day);
    if (!pts.length) continue;
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    pts.forEach(({ day, value }, i) => {
      const x = xForPre(day), y = yForPre(value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const g of groups) {
    const pts = (inSeries[g.name] || []).slice().sort((a, b) => a.day - b.day);
    if (!pts.length) continue;
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    pts.forEach(({ day, value }, i) => {
      const x = xForIn(day), y = yForIn(value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  const legendY = H - 8;
  ctx.font = '10px system-ui';
  ctx.setLineDash([]);
  const totalLegW = groups.reduce((s, g) => s + 14 + ctx.measureText(g.name).width + 12, 0);
  let lx = Math.max(pad.left, W / 2 - totalLegW / 2);
  for (const g of groups) {
    ctx.fillStyle = g.color;
    ctx.fillRect(lx, legendY - 6, 10, 2);
    ctx.fillStyle = '#1d1d1b';
    ctx.textAlign = 'left';
    ctx.fillText(g.name, lx + 14, legendY);
    lx += 14 + ctx.measureText(g.name).width + 12;
  }

  const tooltip = getLineTooltip();
  canvas.onmousemove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const isPre = mx < divX;

    let closest: (LineChartPoint & { side: string; groupName: string }) | null = null;
    let minDist = Infinity;
    if (isPre) {
      for (const g of groups) {
        for (const p of (preSeries[g.name] || [])) {
          const px = xForPre(p.day), py = yForPre(p.value);
          const dist = Math.hypot(mx - px, (e.clientY - rect.top) * (H / rect.height) - py);
          if (dist < minDist) {
            minDist = dist;
            closest = { ...p, side: 'pre', groupName: g.name };
          }
        }
      }
    } else {
      for (const g of groups) {
        for (const p of (inSeries[g.name] || [])) {
          const px = xForIn(p.day), py = yForIn(p.value);
          const dist = Math.hypot(mx - px, (e.clientY - rect.top) * (H / rect.height) - py);
          if (dist < minDist) {
            minDist = dist;
            closest = { ...p, side: 'in', groupName: g.name };
          }
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
        const pt = (src[g.name] || []).find(p => p.day === closest!.day);
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
    } else {
      tooltip.style.display = 'none';
    }
  };
  canvas.onmouseleave = () => {
    tooltip.style.display = 'none';
  };
}
