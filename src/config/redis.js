const { createClient } = require('redis');
const client = createClient({ url: process.env.REDIS_URL });
client.on('error', (e) => console.error('Redis error', e));
(async () => { await client.connect(); console.log('✅ Redis connected'); })();
module.exports = client;
