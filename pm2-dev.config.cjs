/**
 * PM2 Configuration for Development
 * 
 * This configuration runs the application in development mode with:
 * - Hot reload support
 * - Environment variable management
 * - Log rotation
 * - Performance monitoring
 */

module.exports = {
  apps: [{
    name: 'practice-intelligence-dev',
    script: './node_modules/.bin/tsx',
    args: 'server/index.ts',
    instances: 1,
    exec_mode: 'fork',
    autorestart: false,
    watch: false,
    max_memory_restart: '2G',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: process.env.PORT || 5000,
      
      // These will be pulled from .env
      DATABASE_URL: process.env.DATABASE_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      SESSION_SECRET: process.env.SESSION_SECRET || 'development-secret-change-in-production',
      
      // Feature flags
      AI_ENABLED: 'true',
      ENHANCED_TIMELINE: 'true',
      AUTO_CLEANUP: 'true',
      PERFORMANCE_MONITORING: 'true',
      DEBUG: 'app:*'
    },
    
    // Error handling
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    
    // Node.js flags
    node_args: '--max-old-space-size=2048',
  }]
};