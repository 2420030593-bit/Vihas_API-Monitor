require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const http = require('http');

const app = express();

// =============================================
// Configuration
// =============================================
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000');

console.log(`
╔════════════════════════════════════════════╗
║  API Performance Monitor Backend          ║
║  Version: 1.0.0 (No Database)             ║
╚════════════════════════════════════════════╝

📊 Environment: ${NODE_ENV}
🗄️  Storage: In-Memory (Session-based)
⏱️  API Timeout: ${API_TIMEOUT}ms
🚀 Starting on port ${PORT}...
`);

// =============================================
// In-Memory Storage
// =============================================
const sessionData = {
  testResults: [],
  sessionStart: new Date(),
  testCount: 0
};

// =============================================
// Middleware
// =============================================

// CORS - Allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =============================================
// Routes
// =============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Performance Monitor Backend is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    storage: 'In-Memory Session Storage'
  });
});

// =============================================
// API Routes
// =============================================

// Test API Endpoint
app.post('/api/test', async (req, res) => {
  try {
    const { apiUrl, httpMethod = 'GET', requestHeaders = {}, requestBody = null, disableSSLVerify = true } = req.body;

    if (!apiUrl) {
      return res.status(400).json({
        success: false,
        message: 'apiUrl is required'
      });
    }

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format. Must start with http:// or https://'
      });
    }

    const startTime = Date.now();
    
    try {
      // Create proper agent instances
      const httpsAgent = new https.Agent({
        rejectUnauthorized: !disableSSLVerify
      });
      const httpAgent = new http.Agent();

      const response = await axios({
        method: httpMethod,
        url: apiUrl,
        headers: requestHeaders,
        data: requestBody,
        timeout: API_TIMEOUT,
        validateStatus: () => true, // Accept all status codes
        httpsAgent: httpsAgent,
        httpAgent: httpAgent
      });

      const responseTime = Date.now() - startTime;
      const isSlowAPI = responseTime > 2000;

      const result = {
        _id: String(sessionData.testResults.length + 1),
        apiUrl,
        httpMethod,
        responseStatus: response.status,
        responseTime,
        isSlowAPI,
        timestamp: new Date(),
        responseData: response.data
      };

      sessionData.testResults.push(result);
      sessionData.testCount++;

      res.json({
        success: true,
        data: result,
        message: `API tested successfully in ${responseTime}ms`
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Generate user-friendly error messages
      let userFriendlyMessage = error.message;
      if (error.code === 'ECONNREFUSED') {
        userFriendlyMessage = 'Connection refused - The API server may be down or unreachable';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        userFriendlyMessage = 'Connection timeout - The API is not responding. Check the URL and try again.';
      } else if (error.message.includes('certificate')) {
        userFriendlyMessage = 'SSL certificate error - The API has certificate issues. This is a known issue with some test APIs.';
      } else if (error.message.includes('ENOTFOUND')) {
        userFriendlyMessage = 'Domain not found - Please check the URL is correct';
      }

      const result = {
        _id: String(sessionData.testResults.length + 1),
        apiUrl,
        httpMethod,
        responseStatus: 0,
        responseTime,
        isSlowAPI: true,
        timestamp: new Date(),
        error: userFriendlyMessage,
        errorCode: error.code || 'UNKNOWN'
      };

      sessionData.testResults.push(result);

      res.status(400).json({
        success: false,
        data: result,
        message: `API test failed: ${userFriendlyMessage}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing API - Please check the URL and try again',
      error: error.message
    });
  }
});

// Get all test results
app.get('/api/results', (req, res) => {
  res.json({
    success: true,
    data: sessionData.testResults,
    total: sessionData.testResults.length
  });
});

// Get results for specific API
app.get('/api/results/:apiUrl', (req, res) => {
  const apiUrl = decodeURIComponent(req.params.apiUrl);
  const results = sessionData.testResults.filter(r => r.apiUrl === apiUrl);
  
  res.json({
    success: true,
    data: results,
    total: results.length
  });
});

// Get slow APIs
app.get('/api/slow-apis', (req, res) => {
  const slowAPIs = sessionData.testResults.filter(r => r.isSlowAPI);
  res.json({
    success: true,
    data: slowAPIs,
    total: slowAPIs.length
  });
});

// Get dashboard data
app.get('/api/dashboard/data', (req, res) => {
  const totalTests = sessionData.testResults.length;
  const slowAPIs = sessionData.testResults.filter(r => r.isSlowAPI).length;
  const avgResponseTime = totalTests > 0 
    ? Math.round(sessionData.testResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests)
    : 0;

  // Group by status code
  const statusCodes = {};
  sessionData.testResults.forEach(r => {
    const status = r.responseStatus || 'Error';
    statusCodes[status] = (statusCodes[status] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      totalTests,
      slowAPIs,
      avgResponseTime,
      statusCodes,
      sessionStart: sessionData.sessionStart
    }
  });
});

// Compare APIs
app.post('/api/compare', (req, res) => {
  const { apis } = req.body;
  
  if (!apis || !Array.isArray(apis)) {
    return res.status(400).json({
      success: false,
      message: 'apis array is required'
    });
  }

  const comparison = apis.map(apiUrl => {
    const results = sessionData.testResults.filter(r => r.apiUrl === apiUrl);
    const responseTimes = results.map(r => r.responseTime);
    
    return {
      apiUrl,
      totalTests: results.length,
      avgResponseTime: results.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / results.length) : 0,
      minResponseTime: results.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: results.length > 0 ? Math.max(...responseTimes) : 0,
      slowCount: results.filter(r => r.isSlowAPI).length
    };
  });

  res.json({
    success: true,
    data: comparison
  });
});

// Delete old results
app.post('/api/cleanup', (req, res) => {
  const { hoursOld = 24 } = req.body;
  const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  
  const before = sessionData.testResults.length;
  sessionData.testResults = sessionData.testResults.filter(r => new Date(r.timestamp) > cutoffTime);
  const after = sessionData.testResults.length;
  const deleted = before - after;

  res.json({
    success: true,
    message: `Deleted ${deleted} old test results`,
    deleted
  });
});

// Get session metrics
app.get('/api/session/metrics', (req, res) => {
  const totalTests = sessionData.testResults.length;
  const slowAPIs = sessionData.testResults.filter(r => r.isSlowAPI).length;
  const successfulTests = sessionData.testResults.filter(r => r.responseStatus >= 200 && r.responseStatus < 300).length;
  const successRate = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0;
  const avgResponseTime = totalTests > 0 
    ? Math.round(sessionData.testResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests)
    : 0;

  // Build trend data (last 20 tests)
  const trend = sessionData.testResults.slice(-20).map((r, idx) => ({
    testNum: idx + 1,
    latency: r.responseTime,
    isError: r.responseStatus < 200 || r.responseStatus >= 400
  }));

  // Build status distribution
  const statusDistribution = {};
  sessionData.testResults.forEach(r => {
    const status = r.responseStatus || 'Error';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  // Build slow endpoints list (group by API URL and show slowest ones)
  const apiMetrics = {};
  sessionData.testResults.forEach(r => {
    if (!apiMetrics[r.apiUrl]) {
      apiMetrics[r.apiUrl] = {
        apiUrl: r.apiUrl,
        httpMethod: r.httpMethod,
        totalTests: 0,
        slowCount: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        responseTimes: []
      };
    }
    apiMetrics[r.apiUrl].totalTests++;
    apiMetrics[r.apiUrl].responseTimes.push(r.responseTime);
    if (r.isSlowAPI) {
      apiMetrics[r.apiUrl].slowCount++;
    }
    apiMetrics[r.apiUrl].maxResponseTime = Math.max(apiMetrics[r.apiUrl].maxResponseTime, r.responseTime);
  });

  // Calculate averages and sort
  const slowEndpoints = Object.values(apiMetrics)
    .map(api => ({
      ...api,
      avgResponseTime: Math.round(api.responseTimes.reduce((a, b) => a + b, 0) / api.responseTimes.length)
    }))
    .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    .slice(0, 10)
    .map(({ responseTimes, ...rest }) => rest); // Remove responseTimes array

  const uniqueAPIs = Object.keys(apiMetrics).length;

  res.json({
    success: true,
    data: {
      totalTests,
      slowApis: slowAPIs,
      avgResponseTime,
      successRate,
      uniqueAPIs,
      trend,
      statusDistribution,
      slowEndpoints,
      sessionStart: sessionData.sessionStart,
      uptime: process.uptime()
    }
  });
});

// =============================================
// Error Handling
// =============================================

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: {
      GET: [
        '/health',
        '/api/results',
        '/api/results/:apiUrl',
        '/api/slow-apis',
        '/api/dashboard/data',
        '/api/session/metrics'
      ],
      POST: [
        '/api/test',
        '/api/compare',
        '/api/cleanup'
      ]
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// =============================================
// Start Server
// =============================================

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 API Base: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`\n🚀 Ready to accept requests!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
