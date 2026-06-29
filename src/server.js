require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const bot = require('./bot');
const registerSockets = require('./sockets');

(async () => {
  await connectDB();

  const app = express();
  app.use(express.static(path.join(__dirname, '../public')));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 20000,
    pingInterval: 10000
  });

  registerSockets(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`🚀 Server on :${PORT}`));

  // Launch bot (webhook in prod, polling in dev)
  if (process.env.WEBHOOK_DOMAIN) {
    await bot.launch({
      webhook: { domain: process.env.WEBHOOK_DOMAIN, path: '/tg-webhook', port: PORT }
    });
  } else {
    await bot.launch();
  }
  console.log('🤖 Bot launched');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
})();
