const Game = require('../models/Game');
const redis = require('../config/redis');
const { startGame } = require('./gameHandlers');

const LUDO_COLORS = ['red', 'green', 'yellow', 'blue'];

module.exports = (io, socket) => {
  // Player joins the lobby for a gameId
  socket.on('lobby:join', async ({ gameId, user }) => {
    const game = await Game.findOne({ gameId });
    if (!game) return socket.emit('error:msg', 'ɢᴀᴍᴇ ɴᴏᴛ ꜰᴏᴜɴᴅ');

    socket.join(gameId);
    socket.data.gameId = gameId;
    socket.data.telegramId = user.id;

    // Reconnection: if game active & player already in it → resume
    if (game.status === 'active') {
      const p = game.players.find(pl => pl.telegramId === user.id);
      if (p) {
        p.connected = true; p.socketId = socket.id;
        await game.save();
        return socket.emit('game:resume', sanitize(game));
      }
      return socket.emit('error:msg', 'ɢᴀᴍᴇ ᴀʟʀᴇᴀᴅʏ ꜱᴛᴀʀᴛᴇᴅ');
    }

    // Already in lobby? update socket
    const existing = game.players.find(pl => pl.telegramId === user.id);
    if (existing) {
      existing.socketId = socket.id; existing.connected = true;
    } else {
      if (game.players.length >= 4) return socket.emit('error:msg', 'ʟᴏʙʙʏ ꜰᴜʟʟ');
      const max = game.type === 'chess' ? 2 : 4;
      if (game.players.length >= max) return socket.emit('error:msg', 'ʟᴏʙʙʏ ꜰᴜʟʟ');
      const color = game.type === 'ludo'
        ? LUDO_COLORS[game.players.length]
        : (game.players.length === 0 ? 'white' : 'black');
      game.players.push({
        telegramId: user.id, displayName: user.displayName,
        color, connected: true, socketId: socket.id
      });
    }
    await game.save();

    io.to(gameId).emit('lobby:update', {
      players: game.players.map(p => ({ name: p.displayName, color: p.color })),
      type: game.type,
      canStart: game.players.length >= 2
    });

    // Auto-start at 3-4 (ludo) or exactly 2 (chess)
    const autoStart = game.type === 'chess'
      ? game.players.length === 2
      : game.players.length >= 3;
    if (autoStart) await tryStart(io, gameId);
  });

  // Manual start (when 2 players & host taps Start Game)
  socket.on('lobby:start', async ({ gameId }) => {
    await tryStart(io, gameId);
  });
};

// Atomic start — Redis lock prevents two simultaneous starts
async function tryStart(io, gameId) {
  const lock = await redis.set(`lock:start:${gameId}`, '1', { NX: true, EX: 10 });
  if (!lock) return; // someone else is starting it
  try {
    const game = await Game.findOne({ gameId });
    if (!game || game.status !== 'lobby' || game.players.length < 2) return;
    await startGame(io, game);
  } finally {
    await redis.del(`lock:start:${gameId}`);
  }
}

function sanitize(game) {
  return {
    gameId: game.gameId, type: game.type, status: game.status,
    players: game.players.map(p => ({ name: p.displayName, color: p.color, id: p.telegramId })),
    state: game.state, turnIndex: game.turnIndex
  };
}

module.exports.sanitize = sanitize;
