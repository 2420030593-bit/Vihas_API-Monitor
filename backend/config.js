/**
 * Environment Configuration Validator
 * Ensures all required environment variables are properly set
 */

const requiredEnvVars = {
  NODE_ENV: {
    required: false,
    default: 'development',
    description: 'Application environment (development/production)'
  },
  PORT: {
    required: false,
    default: '5000',
    description: 'Server port'
  },
  MONGODB_URI: {
    required: false,
    default: 'mongodb://localhost:27017/api-performance-monitor',
    description: 'MongoDB connection string'
  },
  FRONTEND_URL: {
    required: false,
    default: 'http://localhost:3000',
    description: 'Frontend URL for CORS'
  },
  API_TIMEOUT: {
    required: false,
    default: '30000',
    description: 'API request timeout in milliseconds'
  },
  REQUEST_BODY_LIMIT: {
    required: false,
    default: '50mb',
    description: 'Request body size limit'
  }
};

/**
 * Validates environment configuration
 * @returns {Object} Configuration object with all env vars
 * @throws {Error} If required env vars are missing
 */
function validateEnv() {
  const config = {};
  const missingVars = [];

  for (const [key, settings] of Object.entries(requiredEnvVars)) {
    const value = process.env[key] || settings.default;

    if (!value && settings.required) {
      missingVars.push(`${key}: ${settings.description}`);
    }

    config[key] = value;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    throw new Error('Environment configuration incomplete');
  }

  return config;
}

/**
 * Prints environment configuration guide
 */
function printConfigGuide() {
  console.log('\n📝 Environment Variables Configuration Guide:');
  console.log('═══════════════════════════════════════════\n');

  for (const [key, settings] of Object.entries(requiredEnvVars)) {
    const required = settings.required ? '[REQUIRED]' : '[OPTIONAL]';
    console.log(`${required} ${key}`);
    console.log(`  Description: ${settings.description}`);
    if (settings.default) {
      console.log(`  Default: ${settings.default}`);
    }
    console.log();
  }

  console.log('Example .env file:');
  console.log('──────────────────');
  for (const [key, settings] of Object.entries(requiredEnvVars)) {
    console.log(`${key}=${settings.default || ''}`);
  }
  console.log('\n');
}

module.exports = {
  validateEnv,
  printConfigGuide,
  requiredEnvVars
};
