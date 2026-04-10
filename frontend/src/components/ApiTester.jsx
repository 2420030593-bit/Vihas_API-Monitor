import React, { useState } from 'react';
import axios from 'axios';

const ApiTester = ({ onTestComplete }) => {
  const [formData, setFormData] = useState({
    apiUrl: 'https://jsonplaceholder.typicode.com/posts',
    httpMethod: 'GET',
    headers: '{}',
    body: '{}',
    slowThreshold: 2000
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('params');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const parseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!formData.apiUrl.startsWith('http://') && !formData.apiUrl.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      const headers = parseJSON(formData.headers) || {};
      const body = formData.httpMethod !== 'GET' ? parseJSON(formData.body) : null;

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/test`,
        {
          apiUrl: formData.apiUrl.trim(),
          httpMethod: formData.httpMethod,
          headers,
          body,
          slowThreshold: parseInt(formData.slowThreshold)
        }
      );

      if (response.data.success) {
        setResult(response.data.data);
        onTestComplete?.(response.data.data);
      } else {
        setError(response.data.message || 'Failed to test API');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error testing API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-8 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-headline font-bold text-on-surface">API Tester</h2>
        <p className="text-on-surface-variant mt-2">Send requests to any API and inspect responses in real-time</p>
      </div>

      {/* API Request Section */}
      <div className="bg-surface-container-low p-6 rounded-xl ghost-border space-y-6">
        {/* Test Presets */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-headline font-semibold text-on-surface-variant uppercase tracking-wider">Test Presets</label>
          <select 
            onChange={(e) => {
              if (e.target.value) {
                setFormData(prev => ({...prev, apiUrl: e.target.value}));
              }
            }}
            className="w-full md:w-auto self-start bg-surface-container-highest text-on-surface text-sm px-4 py-3 rounded-lg outline-none border-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
            style={{ backgroundImage: 'none' }}
          >
            <option value="">-- Choose a preset to test --</option>
            <optgroup label="🐢 Slow APIs (Latency Testing)">
              <option value="https://httpstat.us/200?sleep=3000">1️⃣ Delayed Response (3 seconds)</option>
              <option value="https://httpstat.us/200?sleep=5000">2️⃣ Very Slow API (5 seconds)</option>
              <option value="https://deelay.me/4000/https://jsonplaceholder.typicode.com/posts">3️⃣ Slow JSON Response (4s delay)</option>
            </optgroup>
            <optgroup label="❌ Error Responses">
              <option value="https://httpstat.us/400">4️⃣ Bad Request (400)</option>
              <option value="https://httpstat.us/401">5️⃣ Unauthorized (401)</option>
              <option value="https://httpstat.us/404">6️⃣ Not Found (404)</option>
              <option value="https://httpstat.us/500">7️⃣ Server Error (500)</option>
            </optgroup>
            <optgroup label="⚠️ Mixed Scenarios">
              <option value="https://httpstat.us/500?sleep=4000">8️⃣ Mixed Slow + Error (500 with 4s delay)</option>
            </optgroup>
            <optgroup label="⚡ Fast APIs (~100-300ms)">
              <option value="https://api.github.com/users/octocat">1️⃣ GitHub User API (Fast)</option>
              <option value="https://jsonplaceholder.typicode.com/posts/1">2️⃣ JSONPlaceholder Post (Fast)</option>
              <option value="https://dog.ceo/api/breeds/image/random">3️⃣ Dog Image API 🐶</option>
              <option value="https://api.adviceslip.com/advice">4️⃣ Advice API 🧠</option>
              <option value="https://official-joke-api.appspot.com/random_joke">5️⃣ Random Joke API 😂</option>
              <option value="https://api.thecatapi.com/v1/images/search">6️⃣ Cat Image API 🐱</option>
            </optgroup>
            <optgroup label="🌐 Useful & Large Data APIs">
              <option value="https://restcountries.com/v3.1/name/india">🌍 Country Info (India)</option>
              <option value="https://picsum.photos/v2/list">📸 Random Images List</option>
              <option value="https://dog.ceo/api/breeds/list/all">🐕 Dog Breeds List (Large JSON)</option>
              <option value="https://wttr.in/London?format=j1">🌤️ Weather API (London)</option>
            </optgroup>
          </select>
        </div>

        {/* URL Bar */}
        <div className="flex shadow-md items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
          <select
            name="httpMethod"
            value={formData.httpMethod}
            onChange={handleChange}
            className="appearance-none bg-surface-container-highest text-primary font-headline font-bold px-6 py-3 pr-10 rounded-lg border-none focus:ring-2 focus:ring-primary/50 cursor-pointer uppercase text-sm"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            name="apiUrl"
            value={formData.apiUrl}
            onChange={handleChange}
            className="flex-1 bg-surface-container-highest border-none rounded-lg px-6 py-3 font-mono text-sm text-on-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none"
            placeholder="https://api.example.com/endpoint"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold px-8 py-3 rounded-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">send</span>
            <span>{loading ? 'SENDING...' : 'SEND'}</span>
          </button>
        </div>

        {/* Request Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Panel */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="flex border-b border-outline-variant/10">
              <button
                onClick={() => setActiveTab('params')}
                className={`px-6 py-3 text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
                  activeTab === 'params' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Headers
              </button>
              <button
                onClick={() => setActiveTab('body')}
                className={`px-6 py-3 text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
                  activeTab === 'body' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Body
              </button>
              <button
                onClick={() => setActiveTab('threshold')}
                className={`px-6 py-3 text-xs font-headline font-bold tracking-widest uppercase transition-colors ${
                  activeTab === 'threshold' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Threshold
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'params' && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-3">JSON Headers</p>
                  <textarea
                    name="headers"
                    value={formData.headers}
                    onChange={handleChange}
                    className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 font-mono text-sm text-on-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                    rows="6"
                    placeholder='{"Content-Type": "application/json"}'
                  />
                </div>
              )}

              {activeTab === 'body' && formData.httpMethod !== 'GET' && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-3">JSON Body</p>
                  <textarea
                    name="body"
                    value={formData.body}
                    onChange={handleChange}
                    className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 font-mono text-sm text-on-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                    rows="6"
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}

              {activeTab === 'threshold' && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-3">Slow API Threshold (ms)</p>
                  <input
                    type="number"
                    name="slowThreshold"
                    value={formData.slowThreshold}
                    onChange={handleChange}
                    className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 font-mono text-sm text-on-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none"
                    min="0"
                  />
                  <p className="text-xs text-on-surface-variant mt-3">Requests slower than this will be marked as slow</p>
                </div>
              )}
            </div>
          </div>

          {/* Response Panel */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 flex flex-col">
            {result ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${result.responseStatus >= 200 && result.responseStatus < 300 ? 'bg-secondary' : result.responseStatus >= 400 ? 'bg-error' : 'bg-tertiary'}`}></span>
                      <span className={`text-secondary font-mono font-bold text-sm ${result.responseStatus >= 400 ? 'text-error' : ''}`}>
                        {result.responseStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-headline font-medium tracking-widest text-on-surface-variant uppercase">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">timer</span>
                        <span>{result.responseTime}ms</span>
                      </div>
                      {result.isSlowAPI && (
                        <div className="flex items-center gap-1 text-error bg-error/10 px-2 py-1 rounded">
                          <span>🐢 Slow API</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(result.responseData, null, 2));
                    }}
                    className="p-2 rounded hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-surface-container-lowest font-mono text-xs leading-relaxed p-6 relative">
                  <pre className="text-on-surface whitespace-pre-wrap break-words">
                    {JSON.stringify(result.responseData, null, 2)}
                  </pre>
                </div>
              </>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-error mb-4">
                  <span className="material-symbols-outlined text-5xl">error_outline</span>
                </div>
                <p className="text-error font-semibold">{error}</p>
              </div>
            ) : (
              <div className="p-6 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl opacity-30">send</span>
                <p className="mt-4">Send a request to see response</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTester;
