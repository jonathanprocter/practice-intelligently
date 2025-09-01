module.exports = {
  apps: [{
    name: 'production-server',
    script: './dist/index.js',
    cwd: '/home/user/webapp',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000
    },
    error_file: './logs/pm2-production-error.log',
    out_file: './logs/pm2-production-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_restarts: 3,
    min_uptime: '10s',
    watch: false
  }]
};