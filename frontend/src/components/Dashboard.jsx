import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      const res = await axios.get(`${API_URL}/session/metrics`);
      setData(res.data.data); // Extract the nested data property
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch session metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 8000);
    return () => clearInterval(interval);
  }, []);

  const totalTests = data?.totalTests || 0;
  const avgResponseTime = data?.avgResponseTime || 0;
  const slowApis = data?.slowApis || 0;
  const successRate = data?.successRate || 0;
  
  const trend = data?.trend || [];
  const statusDist = data?.statusDistribution || {};
  const slowEndpoints = data?.slowEndpoints || [];

  // Trend Chart
  const trendData = {
    labels: trend.map(t => t.testNum),
    datasets: [{
      label: 'Response Time (ms)',
      data: trend.map(t => t.latency),
      borderColor: '#3b82f6', // blue-500
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 5, // Slightly larger to pop out
      pointBackgroundColor: trend.map(t => t.isError ? '#ef4444' : '#10b981'), // red or emerald
      pointBorderColor: '#0f1117', // Match background color for outline
      pointBorderWidth: 2,
      pointHoverRadius: 7,
      borderWidth: 3
    }]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(15, 17, 23, 0.9)', titleColor: '#e5e7eb', bodyColor: '#9ca3af', borderColor: '#374151', borderWidth: 1, padding: 12 }
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', padding: 10 } },
      x: { grid: { display: false }, ticks: { color: '#9ca3af', padding: 10 } }
    }
  };

  // Status Distribution
  const statusColors = {
    '200': '#10b981', // emerald
    '201': '#10b981',
    '400': '#eab308', // yellow
    '401': '#f59e0b', // amber
    '403': '#f59e0b',
    '404': '#f97316', // orange
    '500': '#ef4444', // red
    '502': '#ef4444',
  };

  const statusLabels = Object.keys(statusDist);
  const statusData = Object.values(statusDist);
  const statusColorsArray = statusLabels.map(s => statusColors[s] || '#6b7280');

  const statusChartData = {
    labels: statusLabels.map(l => `HTTP ${l}`),
    datasets: [{
      data: statusData,
      backgroundColor: statusColorsArray,
      borderRadius: 4,
      barThickness: 20
    }]
  };

  const statusOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(15, 17, 23, 0.9)', titleColor: '#e5e7eb', bodyColor: '#9ca3af', borderColor: '#374151', borderWidth: 1, padding: 12 }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
      y: { grid: { display: false }, ticks: { color: '#e5e7eb', font: { weight: 'bold' } } }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200 p-4 md:p-8 font-sans transition-colors duration-300">
      {/* Top Navigation */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">monitoring</span>
            Performance Overview
          </h1>
          <p className="text-sm text-gray-400 mt-1">Live metrics from API session</p>
        </div>
      </header>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
          <button onClick={fetchMetrics} className="ml-auto underline text-xs">Retry now</button>
        </div>
      ) : null}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Tests" value={loading ? <Skeleton className="h-8 w-16" /> : totalTests.toLocaleString()} icon="receipt_long" color="blue" />
        <MetricCard title="Avg Response Time" value={loading ? <Skeleton className="h-8 w-24" /> : `${avgResponseTime}ms`} icon="speed" color="purple" />
        <MetricCard title="Issues Detected" value={loading ? <Skeleton className="h-8 w-12" /> : slowApis} icon="warning" color="amber" />
        <MetricCard title="Success Rate" value={loading ? <Skeleton className="h-8 w-20" /> : `${successRate}%`} icon="check_circle" color="emerald" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Chart: Response Time Trend */}
        <div className="lg:col-span-2 bg-[#171a23]/80 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-lg">timeline</span>
            Response Time Trend
          </h2>
          <div className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {loading ? <Skeleton className="w-full h-[280px]" /> : (
              trend.length > 0 ? (
                <div style={{ height: '280px', minWidth: `${Math.max(600, trend.length * 45)}px` }}>
                  <Line data={trendData} options={trendOptions} />
                </div>
              ) : <NoData message="No trend data available" />
            )}
          </div>
        </div>
        
        {/* Right Chart: Status Distribution */}
        <div className="bg-[#171a23]/80 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-lg">analytics</span>
            Status Distribution
          </h2>
          <div className="h-[280px]">
            {loading ? <Skeleton className="w-full h-full" /> : (
              statusLabels.length > 0 ? <Bar data={statusChartData} options={statusOptions} /> : <NoData message="No status data generated yet" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Table */}
      <div className="bg-[#171a23]/80 border border-gray-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-lg">dns</span>
            Recent Slow or Failed APIs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#1a1d27]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Endpoint</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Call</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-14 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  </tr>
                ))
              ) : slowEndpoints.length > 0 ? (
                slowEndpoints.map((ep, i) => (
                  <tr key={i} className="hover:bg-[#1f2330] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[11px] font-bold px-2 py-1.5 rounded bg-[#1c1f2e] border ${
                        ep.method === 'GET' ? 'text-blue-400 border-blue-900/30' :
                        ep.method === 'POST' ? 'text-emerald-400 border-emerald-900/30' :
                        ep.method === 'PUT' ? 'text-amber-400 border-amber-900/30' :
                        ep.method === 'DELETE' ? 'text-red-400 border-red-900/30' :
                        'text-purple-400 border-purple-900/30'
                      }`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-300 max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl truncate" title={ep.endpoint}>
                      {ep.endpoint}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-white group-hover:text-amber-400 transition-colors">
                      {ep.avgTime.toLocaleString()}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {ep.lastCall}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
                        (ep.status === 'CRITICAL' || ep.status === 'FAILED') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(ep.status === 'CRITICAL' || ep.status === 'FAILED') ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        {ep.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <span className="material-symbols-outlined text-5xl mb-3 text-emerald-500/20">task_alt</span>
                      <p className="text-sm text-gray-400">All APIs are running optimally. No slow or failed endpoints detected.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const MetricCard = ({ title, value, icon, color }) => {
  const colorStyles = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', hover: 'group-hover:border-blue-500/40 group-hover:bg-blue-500/20', glow: 'bg-blue-500' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', hover: 'group-hover:border-purple-500/40 group-hover:bg-purple-500/20', glow: 'bg-purple-500' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hover: 'group-hover:border-amber-500/40 group-hover:bg-amber-500/20', glow: 'bg-amber-500' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20', glow: 'bg-emerald-500' }
  };

  const s = colorStyles[color];

  return (
    <div className={`bg-[#171a23]/80 border border-gray-800 rounded-2xl p-6 shadow-lg group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden backdrop-blur-md cursor-default`}>
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col h-full justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{title}</p>
          <div className="text-3xl font-bold text-white tracking-tight">
            {value}
          </div>
        </div>
        <div className={`p-3 rounded-xl border transition-colors duration-300 ${s.text} ${s.bg} ${s.border} ${s.hover}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      {/* background glow */}
      <div className={`absolute -bottom-12 -right-12 w-32 h-32 blur-[40px] opacity-[0.15] rounded-full ${s.glow} transition-opacity duration-300 group-hover:opacity-30`}></div>
    </div>
  );
};

const NoData = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500">
    <span className="material-symbols-outlined text-4xl mb-3 opacity-30">query_stats</span>
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export default Dashboard;
