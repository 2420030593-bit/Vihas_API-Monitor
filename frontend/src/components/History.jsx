import React, { useState, useEffect } from 'react';
import axios from 'axios';

const History = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterUrl, setFilterUrl] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchResults();
  }, [sortBy, sortOrder, page]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const params = {
        sortBy,
        order: sortOrder,
        limit: 50,
        skip: (page - 1) * 50
      };
      if (filterUrl) {
        params.apiUrl = filterUrl;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/results`,
        { params }
      );

      if (response.data.success) {
        setResults(response.data.data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to load test results');
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    setFilterUrl(e.target.value);
  };

  const handleSearch = () => {
    setPage(1);
    fetchResults();
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'bg-secondary/10 text-secondary';
    if (status >= 300 && status < 400) return 'bg-primary/10 text-primary';
    if (status >= 400 && status < 500) return 'bg-tertiary/10 text-tertiary';
    if (status >= 500) return 'bg-error/10 text-error';
    return 'bg-on-surface-variant/10 text-on-surface-variant';
  };

  const getResponseTimeColor = (time, isSlowAPI) => {
    if (isSlowAPI) return 'text-error font-bold';
    if (time > 1000) return 'text-tertiary font-bold';
    if (time > 100) return 'text-primary font-bold';
    return 'text-secondary font-bold';
  };

  const getMethodColor = (method) => {
    switch(method) {
      case 'GET': return 'bg-primary/10 text-primary';
      case 'POST': return 'bg-secondary/10 text-secondary';
      case 'PUT': return 'bg-tertiary/10 text-tertiary';
      case 'DELETE': return 'bg-error/10 text-error';
      case 'PATCH': return 'bg-primary-container/20 text-primary-container';
      default: return 'bg-on-surface-variant/10 text-on-surface-variant';
    }
  };

  return (
    <div className="min-h-screen bg-surface p-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-headline font-bold text-on-surface">Test History</h2>
        <p className="text-on-surface-variant mt-2">Review and analyze all your API test results</p>
      </div>

      {/* Filters Section */}
      <div className="bg-surface-container-low rounded-xl ghost-border p-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Filter by API URL..."
              value={filterUrl}
              onChange={handleFilter}
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary/30 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold px-6 py-3 rounded-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">search</span>
            <span>Search</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant block mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary/30 cursor-pointer outline-none text-sm"
            >
              <option value="timestamp">Timestamp</option>
              <option value="responseTime">Response Time</option>
              <option value="responseStatus">Status Code</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant block mb-2">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full appearance-none bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary/30 cursor-pointer outline-none text-sm"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant block mb-2">Results</label>
            <button
              onClick={() => {
                setPage(1);
                fetchResults();
              }}
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-2 text-on-surface hover:bg-surface-container-high transition-colors text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-on-surface-variant">Loading results...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-5xl text-error">error_outline</span>
          <p className="text-error font-semibold mt-3">{error}</p>
        </div>
      )}

      {/* Results Table */}
      {!loading && !error && results.length > 0 && (
        <div className="bg-surface-container-low rounded-xl ghost-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="px-6 py-4 text-left text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant">API URL</th>
                  <th className="px-6 py-4 text-left text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant">Method</th>
                  <th className="px-6 py-4 text-center text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant">Time</th>
                  <th className="px-6 py-4 text-center text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-headline font-bold tracking-widest uppercase text-on-surface-variant">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result._id} className="border-b border-outline-variant/10 hover:bg-surface-container-highest transition-colors">
                    <td className="px-6 py-4 text-on-surface truncate max-w-xs font-mono text-xs" title={result.apiUrl}>
                      {result.apiUrl}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getMethodColor(result.httpMethod)}`}>
                        {result.httpMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(result.responseStatus)}`}>
                        {result.responseStatus}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-center ${getResponseTimeColor(result.responseTime, result.isSlowAPI)}`}>
                      {result.responseTime}ms
                    </td>
                    <td className="px-6 py-4 text-center">
                      {result.isSlowAPI ? (
                        <div className="flex items-center justify-center gap-1 px-3 py-1 bg-error/10 text-error rounded-lg text-xs font-bold mx-auto w-fit">
                          <span className="material-symbols-outlined text-sm">trending_down</span>
                          <span>Slow</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-lg text-xs font-bold mx-auto w-fit">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span>Fast</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">
                      {new Date(result.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && results.length === 0 && (
        <div className="bg-surface-container-low rounded-xl ghost-border p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-50">history</span>
          <p className="mt-4 text-on-surface-variant font-semibold">No test results found</p>
          <p className="text-sm text-on-surface-variant mt-1">Start testing APIs from the Tester tab to see results here</p>
        </div>
      )}
    </div>
  );
};

export default History;
