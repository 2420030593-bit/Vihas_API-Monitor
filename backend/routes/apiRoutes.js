const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Test an API endpoint
router.post('/test', apiController.testAPI);

// Get all test results
router.get('/results', apiController.getAllResults);

// Get results for a specific API
router.get('/results/:apiUrl', apiController.getApiResults);

// Get slow APIs
router.get('/slow-apis', apiController.getSlowAPIs);

// Get dashboard data
router.get('/dashboard/data', apiController.getDashboardData);

// Compare APIs
router.post('/compare', apiController.compareAPIs);

// Delete old results
router.post('/cleanup', apiController.deleteOldResults);

// Get session metrics
router.get('/session/metrics', apiController.getSessionMetrics);

module.exports = router;
