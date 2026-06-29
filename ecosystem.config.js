module.exports = { apps: [{ name: 'rush-bots', script: 'src/server.js', instances: 1, autorestart: true, max_memory_restart: '500M' }] };
