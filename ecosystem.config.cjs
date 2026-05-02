module.exports = {
  apps: [
    {
      name: 'flormajor',
      script: 'server.js',
      cwd: '/opt/flormajor/current',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
      },
      error_file: '/opt/flormajor/shared/logs/error.log',
      out_file: '/opt/flormajor/shared/logs/out.log',
      time: true,
    },
  ],
}
