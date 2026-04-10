import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PerformanceCharts from './PerformanceCharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Performance = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [slowAPIs, setSlowAPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, slowRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/data?days=${days}`),
        axios.get(`${API_URL}/slow-apis`)
      ]);
      setDashboardData(dashRes.data.data);
      setSlowAPIs(slowRes.data.data || []);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const overview = dashboardData?.overview || {};
  const trend = dashboardData?.trend || [];
  const apiStats = dashboardData?.apiStats || [];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mb-4"></div>
          <p className="text-on-surface-variant font-headline">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-black text-on-surface tracking-tight">Performance</h2>
          <p className="text-on-surface-variant mt-1">Deep-dive analytics & slow API detection</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-surface-container-highest text-on-surface border border-outline-variant/30 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="speed"
          label="AVG RESPONSE"
          value={`${overview.avgResponseTime || 0}ms`}
          color="text-sky-400"
          bgColor="bg-sky-400/10"
        />
        <StatCard
          icon="warning"
          label="SLOW APIS"
          value={overview.slowCount || 0}
          subtitle={`${overview.slowPercentage || '0.00'}% of tests`}
          color="text-red-400"
          bgColor="bg-red-400/10"
        />
        <StatCard
          icon="science"
          label="TOTAL TESTS"
          value={overview.totalTests || 0}
          color="text-emerald-400"
          bgColor="bg-emerald-400/10"
        />
        <StatCard
          icon="dns"
          label="UNIQUE APIS"
          value={overview.totalAPIs || 0}
          color="text-amber-400"
          bgColor="bg-amber-400/10"
        />
      </div>

      {/* Charts */}
      {overview && overview.totalTests > 0 && (
        <PerformanceCharts trend={trend} apiStats={apiStats} />
      )}

      {/* API Rankings Table */}
      {apiStats.length > 0 && (
        <div className="bg-surface-container-low rounded-xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary">leaderboard</span>
            <h3 className="text-lg font-headline font-bold text-on-surface">API Performance Rankings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left py-3 px-4 text-on-surface-variant font-medium">API Endpoint</th>
                  <th className="text-right py-3 px-4 text-on-surface-variant font-medium">Avg Response</th>
                  <th className="text-right py-3 px-4 text-on-surface-variant font-medium">Tests</th>
                  <th className="text-right py-3 px-4 text-on-surface-variant font-medium">Slow %</th>
                  <th className="text-right py-3 px-4 text-on-surface-variant font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {apiStats.map((api, index) => (
                  <tr key={index} className="border-b border-outline-variant/10 hover:bg-surface-container-highest/50 transition-colors">
                    <td className="py-3 px-4 text-on-surface font-mono text-xs truncate max-w-xs">{api.apiUrl}</td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface">{api.avgResponseTime}ms</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{api.totalTests}</td>
                    <td className="py-3 px-4 text-right text-on-surface-variant">{api.slowPercentage}%</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        parseFloat(api.slowPercentage) > 50
                          ? 'bg-red-500/20 text-red-400'
                          : parseFloat(api.slowPercentage) > 0
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {parseFloat(api.slowPercentage) > 50 ? 'Slow' : parseFloat(api.slowPercentage) > 0 ? 'Warning' : 'Healthy'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slow APIs Alert */}
      {slowAPIs.length > 0 && (
        <div className="bg-surface-container-low rounded-xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-error">report</span>
            <h3 className="text-lg font-headline font-bold text-on-surface">Slow API Alerts</h3>
            <span className="ml-auto text-xs text-on-surface-variant bg-red-500/10 px-3 py-1 rounded-full font-bold text-red-400">
              {slowAPIs.length} detected
            </span>
          </div>
          <div className="space-y-2">
            {slowAPIs.slice(0, 10).map((api, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-container-highest/30 hover:bg-surface-container-highest/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    api.httpMethod === 'GET' ? 'bg-sky-500/20 text-sky-400' :
                    api.httpMethod === 'POST' ? 'bg-emerald-500/20 text-emerald-400' :
                    api.httpMethod === 'PUT' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {api.httpMethod}
                  </span>
                  <span className="text-sm text-on-surface font-mono truncate">{api.apiUrl}</span>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <span className="text-red-400 font-bold text-sm">{api.responseTime}ms</span>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(api.timestamp || api.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!overview || overview.totalTests === 0) && !error && (
        <div className="bg-surface-container-low rounded-xl ghost-border p-12 text-center mt-8">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant opacity-40">monitoring</span>
          <p className="text-on-surface-variant mt-4 text-lg font-headline font-semibold">No performance data yet</p>
          <p className="text-sm text-on-surface-variant mt-2">Run some API tests to start seeing performance analytics here</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, subtitle, color, bgColor }) => (
  <div className="bg-surface-container-low rounded-xl ghost-border p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
      <span className={`material-symbols-outlined ${color}`}>{icon}</span>
    </div>
    <div>
      <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">{label}</p>
      <p className="text-2xl font-black text-on-surface font-headline tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
    </div>
  </div>
);

export default Performance;
