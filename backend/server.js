require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// =============================================
// Environment Configuration
// =============================================
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-performance-monitor';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || '50mb';

// =============================================
// Middleware Setup
// =============================================

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins
    if (NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // In production, allow all render.com domains and FRONTEND_URL
      if (!origin || 
          origin.includes('onrender.com') || 
          origin === FRONTEND_URL ||
          origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now - can be restricted later
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

// Request logging middleware (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// =============================================
// Database Connection
// =============================================
let isDBConnected = false;

const connectDB = async () => {
  const maxRetries = 3;
  let retries = 0;

  const attemptConnection = async () => {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      isDBConnected = true;
      console.log('✓ MongoDB connected successfully');
      console.log(`  Database: ${mongoose.connection.name}`);
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.warn(`⚠ MongoDB connection attempt ${retries} failed. Retrying in 3 seconds...`);
        console.warn(`  Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return attemptConnection();
      } else {
        console.warn('✗ MongoDB connection failed - Using in-memory storage as fallback');
        console.warn('  Data will persist during this session but reset on server restart.');
        console.warn('  To use persistent storage:');
        console.warn('    1. Start MongoDB locally: mongod');
        console.warn('    2. Or set MONGODB_URI to a cloud database URL');
        console.warn(`    3. Current MONGODB_URI: ${MONGODB_URI.substring(0, 50)}...`);
        isDBConnected = false;
        return false;
      }
    }
  };

  await attemptConnection();
};

// Connect to database (non-blocking - app continues even if DB fails)
connectDB().catch(err => console.error('Database connection setup error:', err));

// Monitor connection state
mongoose.connection.on('connected', () => {
  isDBConnected = true;
  console.log('✓ Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  isDBConnected = false;
  console.warn('⚠ Mongoose disconnected from MongoDB');
});

mongoose.connection.on('error', (error) => {
  isDBConnected = false;
  console.error('✗ MongoDB connection error:', error.message);
});

// =============================================
// Routes
// =============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Performance Monitor Backend is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: isDBConnected ? 'MongoDB Connected' : 'Using In-Memory Storage',
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/', apiRoutes);



// =============================================
// Error Handling
// =============================================

// 404 handler (must come before error handling)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: NODE_ENV === 'development' ? err.message : 'Access denied'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: NODE_ENV === 'development' ? err.message : 'Server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================
// Server Startup
// =============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  API Performance Monitor Backend          ║
║  Version: 1.0.0                           ║
╚════════════════════════════════════════════╝

📊 Server Information:
  • URL: http://localhost:${PORT}
  • Environment: ${NODE_ENV}
  • Node Version: ${process.version}
  
🔗 API Endpoints:
  • Health Check: http://localhost:${PORT}/health
  • API Base: http://localhost:${PORT}/api
  
🗄️  Database:
  • Status: ${isDBConnected ? '✓ Connected' : '⚠ Using In-Memory Storage'}
  • URI: ${MONGODB_URI.substring(0, 50)}...

💡 Tips:
  • Open browser console for debugging
  • Check .env file for configuration
  • Use API documentation in README.md

Ready to accept requests! 🚀
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⛔ SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    if (isDBConnected) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n⛔ SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    if (isDBConnected) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  });
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
