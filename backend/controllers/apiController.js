const axios = require('axios');
const https = require('https');
const TestResult = require('../models/TestResult');

const SLOW_API_THRESHOLD = process.env.SLOW_API_THRESHOLD || 2000;

// Test an API and save the result
exports.testAPI = async (req, res) => {
  try {
    const { apiUrl, httpMethod, headers, body, slowThreshold } = req.body;

    // Validate input
    if (!apiUrl || !httpMethod) {
      return res.status(400).json({
        success: false,
        message: 'API URL and HTTP Method are required'
      });
    }

    const startTime = Date.now();
    let responseStatus, responseData;

    try {
      // Make the API request
      const axiosConfig = {
        method: httpMethod.toLowerCase(),
        url: apiUrl,
        headers: headers || {},
        timeout: 30000,
        validateStatus: () => true, // Accept all status codes
        httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Disable SSL certificate validation
      };

      if (body && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
        axiosConfig.data = body;
      }

      const response = await axios(axiosConfig);
      responseStatus = response.status;
      responseData = response.data;
    } catch (error) {
      responseStatus = error.response?.status || 0;
      responseData = { error: error.message };
    }

    const responseTime = Date.now() - startTime;
    const threshold = slowThreshold || SLOW_API_THRESHOLD;
    const isSlowAPI = responseTime > threshold;

    // Try to save to database, but don't fail if it's not available
    try {
      const testResult = new TestResult({
        apiUrl,
        httpMethod,
        requestHeaders: headers || {},
        requestBody: body || null,
        responseStatus,
        responseData,
        responseTime,
        isSlowAPI,
        slowThreshold: threshold
      });

      await testResult.save();
    } catch (dbError) {
      // Database operation failed, but we still return the result
      console.warn('Warning: Could not save test result to database:', dbError.message);
    }

    res.status(200).json({
      success: true,
      data: {
        responseStatus,
        responseTime,
        responseData,
        isSlowAPI,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error testing API:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing API',
      error: error.message
    });
  }
};

// Get all test results
exports.getAllResults = async (req, res) => {
  try {
    const { apiUrl, sortBy = 'timestamp', order = 'desc', limit = 100 } = req.query;

    let query = {};
    if (apiUrl) {
      query.apiUrl = apiUrl;
    }

    const results = await TestResult.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

// Get results for a specific API
exports.getApiResults = async (req, res) => {
  try {
    const { apiUrl } = req.params;
    const decodedUrl = decodeURIComponent(apiUrl);

    const results = await TestResult.find({ apiUrl: decodedUrl })
      .sort({ timestamp: -1 })
      .lean();

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No results found for this API'
      });
    }

    // Calculate statistics
    const avgResponseTime = 
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const slowCount = results.filter(r => r.isSlowAPI).length;
    const minResponseTime = Math.min(...results.map(r => r.responseTime));
    const maxResponseTime = Math.max(...results.map(r => r.responseTime));

    res.status(200).json({
      success: true,
      count: results.length,
      statistics: {
        avgResponseTime: Math.round(avgResponseTime),
        minResponseTime,
        maxResponseTime,
        slowCount,
        slowPercentage: ((slowCount / results.length) * 100).toFixed(2)
      },
      data: results
    });
  } catch (error) {
    console.error('Error fetching API results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching API results',
      error: error.message
    });
  }
};

// Get slow APIs
exports.getSlowAPIs = async (req, res) => {
  try {
    const slowAPIs = await TestResult.find({ isSlowAPI: true })
      .sort({ responseTime: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      count: slowAPIs.length,
      data: slowAPIs
    });
  } catch (error) {
    console.error('Error fetching slow APIs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching slow APIs',
      error: error.message
    });
  }
};

// Get performance dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all results in the timeframe
    const results = await TestResult.find({
      timestamp: { $gte: startDate }
    }).lean();

    // Get unique APIs
    const uniqueAPIs = [...new Set(results.map(r => r.apiUrl))];

    // Calculate average response time per API
    const apiStats = uniqueAPIs.map(apiUrl => {
      const apiResults = results.filter(r => r.apiUrl === apiUrl);
      const avgTime = 
        apiResults.reduce((sum, r) => sum + r.responseTime, 0) / apiResults.length;
      const slowCount = apiResults.filter(r => r.isSlowAPI || r.responseStatus >= 400 || !r.responseStatus).length;

      return {
        apiUrl,
        avgResponseTime: Math.round(avgTime),
        totalTests: apiResults.length,
        slowCount,
        slowPercentage: ((slowCount / apiResults.length) * 100).toFixed(2)
      };
    });

    // Response time trend (by day) - preload last N days so charts render full lines
    const trendData = {};
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendData[dateStr] = { total: 0, count: 0, slow: 0 };
    }

    results.forEach(result => {
      const date = new Date(result.timestamp).toISOString().split('T')[0];
      if (trendData[date]) {
        trendData[date].total += result.responseTime;
        trendData[date].count += 1;
        if (result.isSlowAPI || result.responseStatus >= 400 || !result.responseStatus) {
          trendData[date].slow += 1;
        }
      }
    });

    const trend = Object.entries(trendData).map(([date, data]) => ({
      date,
      avgResponseTime: data.count > 0 ? Math.round(data.total / data.count) : 0,
      slowCount: data.slow,
      totalTests: data.count
    }));

    // Overall statistics
    const totalTests = results.length;
    const avgResponseTime = 
      results.reduce((sum, r) => sum + r.responseTime, 0) / (totalTests || 1);
    const slowCount = results.filter(r => r.isSlowAPI || r.responseStatus >= 400 || !r.responseStatus).length;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTests,
          avgResponseTime: Math.round(avgResponseTime),
          slowCount,
          slowPercentage: ((slowCount / (totalTests || 1)) * 100).toFixed(2),
          totalAPIs: uniqueAPIs.length
        },
        apiStats: apiStats.sort((a, b) => b.avgResponseTime - a.avgResponseTime),
        trend: trend.sort((a, b) => new Date(a.date) - new Date(b.date))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Compare API performance
exports.compareAPIs = async (req, res) => {
  try {
    const { apiUrls } = req.body;

    if (!apiUrls || !Array.isArray(apiUrls) || apiUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide array of API URLs to compare'
      });
    }

    const comparison = {};

    for (const apiUrl of apiUrls) {
      const results = await TestResult.find({ apiUrl })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      if (results.length > 0) {
        const avgTime = 
          results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        comparison[apiUrl] = {
          avgResponseTime: Math.round(avgTime),
          minResponseTime: Math.min(...results.map(r => r.responseTime)),
          maxResponseTime: Math.max(...results.map(r => r.responseTime)),
          totalTests: results.length,
          slowCount: results.filter(r => r.isSlowAPI).length,
          lastTestTime: results[0].timestamp,
          recentResults: results
        };
      }
    }

    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing APIs:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing APIs',
      error: error.message
    });
  }
};

// Delete old results (optional cleanup)
exports.deleteOldResults = async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await TestResult.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old test results`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting old results:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting old results',
      error: error.message
    });
  }
};

// Get session metrics for the new Dashboard
exports.getSessionMetrics = async (req, res) => {
  try {
    const results = await TestResult.find().lean();
    
    const totalTests = results.length;
    const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / (totalTests || 1));
    const slowApis = results.filter(r => r.isSlowAPI || r.responseStatus >= 400 || !r.responseStatus).length;
    // Calculate success count (2xx status codes)
    const successCount = results.filter(r => r.responseStatus >= 200 && r.responseStatus < 300).length;
    const successRate = totalTests > 0 ? ((successCount / totalTests) * 100).toFixed(1) : 0;

    const statusDistribution = {};
    results.forEach(r => {
      const status = r.responseStatus || 0;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    // Map individual tests based on progression (last 50 tests)
    const recentResults = results.slice(-50);
    const trend = recentResults.map((r, index) => ({
      testNum: `Test ${results.length - recentResults.length + index + 1}`,
      latency: r.responseTime,
      isError: r.responseStatus >= 400 || !r.responseStatus
    }));

    // Slow or failed endpoints
    const endpointData = {};
    results.filter(r => r.isSlowAPI || r.responseStatus >= 400 || !r.responseStatus).forEach(r => {
      const key = `${r.httpMethod}-${r.apiUrl}`;
      if (!endpointData[key]) {
        endpointData[key] = { method: r.httpMethod, endpoint: r.apiUrl, total: 0, count: 0, latest: r.timestamp, isError: false };
      }
      endpointData[key].total += r.responseTime;
      endpointData[key].count += 1;
      if (r.responseStatus >= 400 || !r.responseStatus) endpointData[key].isError = true;
      if (new Date(r.timestamp) > new Date(endpointData[key].latest)) {
        endpointData[key].latest = r.timestamp;
      }
    });

    const now = Date.now();
    const slowEndpoints = Object.values(endpointData).map(d => {
      const avg = Math.round(d.total / d.count);
      const minDiff = Math.abs(Math.round((now - new Date(d.latest).getTime()) / 60000));
      let lastCallStr = minDiff < 1 ? 'Just now' : `${minDiff} min ago`;
      if (minDiff >= 60) {
        lastCallStr = `${Math.round(minDiff/60)} hr ago`;
      }
      return {
        method: d.method,
        endpoint: d.endpoint,
        avgTime: avg,
        lastCall: lastCallStr,
        status: d.isError ? 'FAILED' : (avg > 3000 ? 'CRITICAL' : 'WARNING')
      };
    }).sort((a,b) => b.avgTime - a.avgTime).slice(0, 10);

    res.status(200).json({
      totalTests,
      avgResponseTime,
      slowApis,
      successRate: parseFloat(successRate),
      trend,
      statusDistribution,
      slowEndpoints
    });
  } catch (error) {
    console.error('Error fetching session metrics:', error);
    res.status(500).json({ error: error.message });
  }
};

