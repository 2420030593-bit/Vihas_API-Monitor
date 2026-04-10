import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
  Filler,
} from 'chart.js';
import {
  Line as ChartJSLine,
  Bar as ChartJSBar,
  Doughnut,
  Radar,
  PolarArea,
} from 'react-chartjs-2';

// Register all ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartJSTooltip,
  ChartJSLegend,
  Filler
);

// ─── Kinetic color palette ──────────────────────────────────────────────────
const K = {
  cyan:       '#3bbffa',
  cyanGlow:   'rgba(59,191,250,0.35)',
  cyanFaded:  'rgba(59,191,250,0.08)',
  mint:       '#69f6b8',
  mintGlow:   'rgba(105,246,184,0.35)',
  mintFaded:  'rgba(105,246,184,0.08)',
  coral:      '#ff716c',
  coralGlow:  'rgba(255,113,108,0.35)',
  coralFaded: 'rgba(255,113,108,0.08)',
  amber:      '#ffb148',
  amberGlow:  'rgba(255,177,72,0.35)',
  amberFaded: 'rgba(255,177,72,0.08)',
  violet:     '#a78bfa',
  violetGlow: 'rgba(167,139,250,0.35)',
  rose:       '#fb7185',
  roseGlow:   'rgba(251,113,133,0.35)',
  surface:    '#1a2c3e',
  text:       '#e6e6e6',
  muted:      '#9db7cb',
  gridLine:   'rgba(59,191,250,0.07)',
};

// ─── Shared tooltip style ───────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: 'rgba(10,20,40,0.95)',
  titleColor: K.text,
  bodyColor: K.text,
  borderColor: K.cyan,
  borderWidth: 1,
  padding: 14,
  cornerRadius: 10,
  displayColors: true,
  boxPadding: 6,
  titleFont: { family: "'Space Grotesk', sans-serif", size: 13, weight: '700' },
  bodyFont: { family: "'Inter', sans-serif", size: 12 },
};

const legendStyle = {
  display: true,
  position: 'top',
  labels: {
    color: K.text,
    font: { family: "'Space Grotesk', sans-serif", size: 12, weight: '600' },
    padding: 18,
    usePointStyle: true,
    pointStyle: 'circle',
    pointStyleWidth: 10,
  },
};

// ─── Helper: create a vertical gradient ─────────────────────────────────────
function makeGradient(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const PerformanceCharts = ({ trend = [], apiStats = [] }) => {
  if (!trend || trend.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-2xl ghost-border p-10 text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant opacity-40">monitoring</span>
        <p className="text-on-surface-variant mt-5 font-semibold text-lg">No chart data available yet</p>
        <p className="text-sm text-on-surface-variant mt-1 opacity-70">Run a few API tests to unlock beautiful analytics</p>
      </div>
    );
  }

  const labels = trend.map(t => t.date || new Date(t.timestamp).toLocaleDateString());

  // ─── 1) GRADIENT LINE CHART — Response Time Trend ────────────────────────
  const lineData = {
    labels,
    datasets: [
      {
        label: 'Avg Response Time (ms)',
        data: trend.map(t => t.avgResponseTime),
        borderColor: K.cyan,
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          if (!chart.chartArea) return K.cyanFaded;
          return makeGradient(chart.ctx, K.cyanGlow, 'transparent');
        },
        pointBackgroundColor: '#0a1428',
        pointBorderColor: K.cyan,
        pointBorderWidth: 2.5,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: K.cyan,
        tension: 0.45,
        fill: true,
        borderWidth: 3,
      },
      {
        label: 'Slow Count',
        data: trend.map(t => t.slowCount),
        borderColor: K.coral,
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          if (!chart.chartArea) return K.coralFaded;
          return makeGradient(chart.ctx, K.coralGlow, 'transparent');
        },
        pointBackgroundColor: '#0a1428',
        pointBorderColor: K.coral,
        pointBorderWidth: 2.5,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: K.coral,
        tension: 0.45,
        fill: true,
        borderWidth: 3,
        yAxisID: 'y1',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 1200, easing: 'easeOutQuart' },
    plugins: {
      legend: legendStyle,
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}${ctx.datasetIndex === 0 ? 'ms' : ''}`,
        },
      },
    },
    scales: {
      y: {
        position: 'left',
        ticks: { color: K.muted, font: { size: 11 }, padding: 8 },
        grid: { color: K.gridLine, drawBorder: false },
        title: { display: true, text: 'Response Time (ms)', color: K.text, font: { weight: '700', size: 12, family: "'Space Grotesk'" } },
      },
      y1: {
        position: 'right',
        ticks: { color: K.muted, font: { size: 11 }, padding: 8 },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Slow Count', color: K.text, font: { weight: '700', size: 12, family: "'Space Grotesk'" } },
      },
      x: {
        ticks: { color: K.muted, font: { size: 11 }, padding: 6, maxRotation: 45 },
        grid: { color: K.gridLine, drawBorder: false },
      },
    },
  };

  // ─── 2) ROUNDED BAR CHART — Daily Volume ────────────────────────────────
  const barData = {
    labels,
    datasets: [
      {
        label: 'Total Tests',
        data: trend.map(t => t.totalTests),
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          if (!chart.chartArea) return K.cyan;
          return makeGradient(chart.ctx, K.cyan, K.mint);
        },
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.55,
        categoryPercentage: 0.7,
      },
      {
        label: 'Slow Tests',
        data: trend.map(t => t.slowCount),
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          if (!chart.chartArea) return K.coral;
          return makeGradient(chart.ctx, K.coral, K.amber);
        },
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.55,
        categoryPercentage: 0.7,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: legendStyle,
      tooltip: tooltipStyle,
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: K.muted, font: { size: 11 }, padding: 8 },
        grid: { color: K.gridLine, drawBorder: false },
        title: { display: true, text: 'Count', color: K.text, font: { weight: '700', size: 12, family: "'Space Grotesk'" } },
      },
      x: {
        ticks: { color: K.muted, font: { size: 11 }, padding: 6 },
        grid: { color: K.gridLine, drawBorder: false },
      },
    },
  };

  // ─── 3) DOUGHNUT — Test Status Breakdown ────────────────────────────────
  const totalTests = trend.reduce((s, t) => s + t.totalTests, 0);
  const totalSlow  = trend.reduce((s, t) => s + t.slowCount, 0);
  const totalFast  = totalTests - totalSlow;

  const doughnutData = {
    labels: ['Fast Responses', 'Slow Responses'],
    datasets: [{
      data: [totalFast, totalSlow],
      backgroundColor: [K.mint, K.coral],
      hoverBackgroundColor: [K.mintGlow.replace('0.35','0.8'), K.coralGlow.replace('0.35','0.8')],
      borderColor: '#0a1428',
      borderWidth: 4,
      spacing: 4,
      borderRadius: 6,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    animation: { animateRotate: true, animateScale: true, duration: 1400, easing: 'easeOutQuart' },
    plugins: {
      legend: { ...legendStyle, position: 'bottom' },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: ctx => {
            const pct = ((ctx.parsed / totalTests) * 100).toFixed(1);
            return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
    },
  };

  // ─── 4) RADAR — Per-API Performance Profile ─────────────────────────────
  const radarAPIs = (apiStats.length > 0 ? apiStats : extractAPIsFromTrend(trend)).slice(0, 6);
  const radarLabels = radarAPIs.map(a => shortenUrl(a.apiUrl || a.label || 'API'));

  const radarData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'Avg Response (ms)',
        data: radarAPIs.map(a => a.avgResponseTime || 0),
        backgroundColor: K.cyanGlow,
        borderColor: K.cyan,
        borderWidth: 2.5,
        pointBackgroundColor: K.cyan,
        pointBorderColor: '#0a1428',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Slow %',
        data: radarAPIs.map(a => parseFloat(a.slowPercentage) || 0),
        backgroundColor: K.coralGlow,
        borderColor: K.coral,
        borderWidth: 2.5,
        pointBackgroundColor: K.coral,
        pointBorderColor: '#0a1428',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' },
    plugins: {
      legend: { ...legendStyle, position: 'bottom' },
      tooltip: tooltipStyle,
    },
    scales: {
      r: {
        grid: { color: K.gridLine },
        angleLines: { color: K.gridLine },
        ticks: { color: K.muted, backdropColor: 'transparent', font: { size: 10 } },
        pointLabels: { color: K.text, font: { size: 11, family: "'Space Grotesk'", weight: '600' } },
      },
    },
  };

  // ─── 5) POLAR AREA — Test Volume Distribution ───────────────────────────
  const polarAPIs = (apiStats.length > 0 ? apiStats : extractAPIsFromTrend(trend)).slice(0, 8);
  const polarColors = [K.cyan, K.mint, K.amber, K.violet, K.coral, K.rose, '#34d399', '#38bdf8'];

  const polarData = {
    labels: polarAPIs.map(a => shortenUrl(a.apiUrl || a.label || 'API')),
    datasets: [{
      data: polarAPIs.map(a => a.totalTests || a.count || 1),
      backgroundColor: polarColors.slice(0, polarAPIs.length).map(c => c + '88'),
      borderColor: polarColors.slice(0, polarAPIs.length),
      borderWidth: 2,
    }],
  };

  const polarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { animateRotate: true, animateScale: true, duration: 1300, easing: 'easeOutQuart' },
    plugins: {
      legend: { ...legendStyle, position: 'bottom', labels: { ...legendStyle.labels, font: { ...legendStyle.labels.font, size: 10 } } },
      tooltip: tooltipStyle,
    },
    scales: {
      r: {
        grid: { color: K.gridLine },
        ticks: { color: K.muted, backdropColor: 'transparent', font: { size: 10 } },
      },
    },
  };

  // ─── 6) SPARKLINE – Response-time mini area (top-of-page hero) ──────────
  const sparkData = {
    labels,
    datasets: [{
      data: trend.map(t => t.avgResponseTime),
      borderColor: K.cyan,
      backgroundColor: (ctx) => {
        const { chart } = ctx;
        if (!chart.chartArea) return K.cyanFaded;
        return makeGradient(chart.ctx, K.cyanGlow, 'transparent');
      },
      fill: true,
      tension: 0.5,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHitRadius: 10,
    }],
  };

  const sparkOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: { legend: { display: false }, tooltip: tooltipStyle },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── Hero sparkline banner ────────────────────────────────── */}
      <div className="bg-surface-container-low rounded-2xl ghost-border p-6 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2 relative z-10">
          <span className="material-symbols-outlined text-primary text-xl">electric_bolt</span>
          <h3 className="text-base font-headline font-bold text-on-surface">Response Time Overview</h3>
        </div>
        <div className="h-24 relative z-10">
          <ChartJSLine data={sparkData} options={sparkOptions} />
        </div>
        {/* Decorative glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
      </div>

      {/* ── Row 1: Line + Doughnut ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          icon="show_chart"
          title="Response Time Trend"
          subtitle="Average latency & slow count over time"
          className="lg:col-span-2"
          color="text-sky-400"
        >
          <div className="h-80">
            <ChartJSLine data={lineData} options={lineOptions} />
          </div>
        </ChartCard>

        <ChartCard
          icon="donut_large"
          title="Health Ratio"
          subtitle="Fast vs slow response breakdown"
          color="text-emerald-400"
        >
          <div className="h-80 flex flex-col items-center justify-center relative">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            {/* Center stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 32 }}>
              <span className="text-3xl font-black text-on-surface font-headline">{totalTests}</span>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Total</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: Bar + Radar ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          icon="bar_chart"
          title="Daily Test Volume"
          subtitle="Tests performed each day with slow-test overlay"
          color="text-sky-400"
        >
          <div className="h-80">
            <ChartJSBar data={barData} options={barOptions} />
          </div>
        </ChartCard>

        <ChartCard
          icon="radar"
          title="API Performance Radar"
          subtitle={radarAPIs.length > 0 ? 'Multi-axis comparison across endpoints' : 'Run tests on multiple APIs to compare'}
          color="text-violet-400"
        >
          <div className="h-80">
            {radarAPIs.length > 0 ? (
              <Radar data={radarData} options={radarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-on-surface-variant text-sm opacity-60">Need data from multiple APIs</p>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 3: Polar Area (full width) ──────────────────────── */}
      {polarAPIs.length > 1 && (
        <ChartCard
          icon="pie_chart"
          title="Test Distribution by Endpoint"
          subtitle="Volume share of each API tested"
          color="text-amber-400"
        >
          <div className="h-80 max-w-lg mx-auto">
            <PolarArea data={polarData} options={polarOptions} />
          </div>
        </ChartCard>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS & UTILS
// ═══════════════════════════════════════════════════════════════════════════

const ChartCard = ({ children, icon, title, subtitle, className = '', color = 'text-primary' }) => (
  <div className={`bg-surface-container-low rounded-2xl ghost-border p-6 flex flex-col ${className}`}>
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
        <span className={`material-symbols-outlined ${color} text-lg`}>{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-headline font-bold text-on-surface leading-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-on-surface-variant mt-0.5 opacity-70">{subtitle}</p>}
      </div>
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

function shortenUrl(url) {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split('/').filter(Boolean);
    const display = pathParts.length > 0 ? '/' + pathParts.slice(-2).join('/') : u.hostname;
    return display.length > 22 ? display.slice(0, 20) + '…' : display;
  } catch {
    return url.length > 22 ? url.slice(0, 20) + '…' : url;
  }
}

function extractAPIsFromTrend(trend) {
  // When no apiStats are passed, try to build synthetic per-date entries
  return trend.map(t => ({
    apiUrl: t.date || 'Unknown',
    label: t.date,
    avgResponseTime: t.avgResponseTime || 0,
    totalTests: t.totalTests || 0,
    slowPercentage: t.totalTests ? ((t.slowCount / t.totalTests) * 100).toFixed(1) : '0',
    count: t.totalTests || 1,
  }));
}

export default PerformanceCharts;
