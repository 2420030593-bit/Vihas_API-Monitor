require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

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
    const { apiUrl, httpMethod = 'GET', requestHeaders = {}, requestBody = null } = req.body;

    if (!apiUrl) {
      return res.status(400).json({
        success: false,
        message: 'apiUrl is required'
      });
    }

    const startTime = Date.now();
    
    try {
      const response = await axios({
        method: httpMethod,
        url: apiUrl,
        headers: requestHeaders,
        data: requestBody,
        timeout: API_TIMEOUT,
        validateStatus: () => true // Accept all status codes
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

      const result = {
        _id: String(sessionData.testResults.length + 1),
        apiUrl,
        httpMethod,
        responseStatus: 0,
        responseTime,
        isSlowAPI: true,
        timestamp: new Date(),
        error: error.message
      };

      sessionData.testResults.push(result);

      res.status(400).json({
        success: false,
        data: result,
        message: `API test failed: ${error.message}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing API',
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
  const avgResponseTime = totalTests > 0 
    ? Math.round(sessionData.testResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests)
    : 0;

  const uniqueAPIs = [...new Set(sessionData.testResults.map(r => r.apiUrl))].length;

  res.json({
    success: true,
    data: {
      totalTests,
      slowAPIs,
      avgResponseTime,
      uniqueAPIs,
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
