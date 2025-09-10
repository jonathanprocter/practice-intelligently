module.exports = {
  apps: [{
    name: 'therapy-app',
    script: './node_modules/.bin/tsx',
    args: 'server/index.ts',
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    watch: false,
    instances: 1
  }]
};
