module.exports = {
  apps: [
    {
      name: 'ninaivukalanjiyam-backend',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      }
    }
  ]
};
