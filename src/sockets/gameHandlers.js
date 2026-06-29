const Game = require('../models/Game');
const Stats = require('../models/Stats');
const ludo = require('../engine/ludoEngine');
const chess = require('../engine/chessEngine');
const timer = require('../engine/timerManager');

/* ---------- START GAME ---------- */
async function startGame(io, game) {
  if (game.type === 'ludo') {
    game.state = ludo.initState(game.players.map(p => p.color));
  } else {
    game.state = { fen: chess.newGame() };
  }
  game.status = 'active';
  game.turnIndex = 0;
  await game.save();

  io.to(game.gameId).emit('game:start', publicState(game));
  beginTurn(io, game.gameId);
}

/* ---------- TURN MANAGEMENT ---------- */
async function beginTurn(io, gameId) {
  const game = await Game.findOne({ gameId });
  if (!game || game.status !== 'active') return;
  const current = game.players[game.turnIndex];

  io.to(gameId).emit('turn:begin', {
    turnIndex: game.turnIndex,
    color: current.color,
    telegramId: current.telegramId,
    ms: timer.TURN_MS
  });

  timer.startTurn(gameId, () => handleAutoMove(io, gameId));
}

async function handleAutoMove(io, gameId) {
  const game = await Game.findOne({ gameId });
  if (!game || game.status !== 'active') return;
  const current = game.players[game.turnIndex];

  if (game.type === 'ludo') {
    const dice = ludo.rollDice();
    io.to(gameId).emit('ludo:dice', { color: current.color, dice, auto: true });
    const tk = ludo.autoMove(game.state, current.color, dice);
    if (tk === null) return advanceTurn(io, game); // no move possible
    const res = ludo.moveToken(game.state, current.color, tk, dice);
    await persistLudo(io, game, current, tk, dice, res);
  } else {
    const mv = chess.autoMove(game.state.fen);
    if (!mv) return endGame(io, game, null, 'draw');
    const res = chess.applyMove(game.state.fen, mv);
    await persistChess(io, game, current, res);
  }
}

/* ---------- LUDO HANDLERS ---------- */
function attach(io, socket) {
  socket.on('ludo:roll', async ({ gameId }) => {
    const game = await Game.findOne({ gameId });
    if (!validTurn(game, socket)) return;
    if (game.state.lastRoll != null) return; // already rolled, must move
    const dice = ludo.rollDice(); // SERVER rolls — anti-cheat
    game.state.lastRoll = dice;
    await game.save();
    const current = game.players[game.turnIndex];
    const movable = ludo.movableTokens(game.state, current.color, dice);
    io.to(gameId).emit('ludo:dice', { color: current.color, dice, movable, auto: false });
    if (!movable.length) { game.state.lastRoll = null; await game.save(); advanceTurn(io, game); }
  });

  socket.on('ludo:move', async ({ gameId, tokenIndex }) => {
    const game = await Game.findOne({ gameId });
    if (!validTurn(game, socket)) return;
    const dice = game.state.lastRoll;
    if (dice == null) return; // must roll first
    const current = game.players[game.turnIndex];
    const movable = ludo.movableTokens(game.state, current.color, dice);
    if (!movable.includes(tokenIndex)) return socket.emit('error:msg', 'ɪɴᴠᴀʟɪᴅ ᴍᴏᴠᴇ');
    const res = ludo.moveToken(game.state, current.color, tokenIndex, dice);
    await persistLudo(io, game, current, tokenIndex, dice, res);
  });

  /* ---------- CHESS HANDLER ---------- */
  socket.on('chess:move', async ({ gameId, move }) => {
    const game = await Game.findOne({ gameId });
    if (!validTurn(game, socket)) return;
    // Server-side authoritative validation via chess.js
    const res = chess.applyMove(game.state.fen, move);
    if (!res) return socket.emit('error:msg', 'ɪʟʟᴇɢᴀʟ ᴍᴏᴠᴇ');
    const current = game.players[game.turnIndex];
    await persistChess(io, game, current, res);
  });

  /* ---------- RECONNECT ---------- */
  socket.on('disconnect', async () => {
    const gameId = socket.data.gameId;
    if (!gameId) return;
    const game = await Game.findOne({ gameId });
    if (!game) return;
    const p = game.players.find(pl => pl.socketId === socket.id);
    if (p) { p.connected = false; await game.save(); }
    // 60s grace period — do NOT destroy state (fixes ghost-disconnect bug)
    io.to(gameId).emit('player:disconnected', { telegramId: p?.telegramId });
  });

  /* ---------- REMATCH ---------- */
  socket.on('rematch:request', ({ gameId, fromName }) =>
    socket.to(gameId).emit('rematch:incoming', { fromName }));

  socket.on('rematch:accept', async ({ gameId }) => {
    const game = await Game.findOne({ gameId });
    if (!game) return;
    game.status = 'lobby'; game.winner = null; game.state = {}; game.turnIndex = 0;
    await game.save();
    await startGame(io, game);
  });
}

/* ---------- PERSISTENCE + EVENT EMISSION ---------- */
async function persistLudo(io, game, current, tokenIndex, dice, res) {
  game.state.lastRoll = null;
  game.markModified('state');
  io.to(game.gameId).emit('ludo:update', {
    color: current.color, tokenIndex, dice,
    tokens: game.state.tokens, events: res.events
  });
  if (res.won) { await game.save(); return endGame(io, game, current.telegramId, 'win'); }
  if (!res.extraTurn) return advanceTurn(io, game);
  await game.save();
  beginTurn(io, game.gameId); // extra turn — same player
}

async function persistChess(io, game, current, res) {
  game.state.fen = res.fen;
  game.markModified('state');
  const events = [];
  if (res.checkmate) events.push('checkmate');
  else if (res.check) events.push('check');
  else if (res.captured) events.push('capture');
  else events.push('move');

  io.to(game.gameId).emit('chess:update', { fen: res.fen, san: res.san, events });

  if (res.checkmate) { await game.save(); return endGame(io, game, current.telegramId, 'win'); }
  if (res.draw) { await game.save(); return endGame(io, game, null, 'draw'); }
  await advanceTurn(io, game);
}

async function advanceTurn(io, game) {
  game.state.lastRoll = null;
  game.turnIndex = (game.turnIndex + 1) % game.players.length;
  game.markModified('state');
  await game.save();
  beginTurn(io, game.gameId);
}

/* ---------- END GAME + LEADERBOARD WRITE ---------- */
async function endGame(io, game, winnerId, type) {
  timer.clearTurn(game.gameId);
  game.status = 'finished';
  game.winner = winnerId;
  await game.save();

  // Update stats immediately (fixes "winner not saved" requirement)
  await Promise.all(game.players.map(p => {
    const isWin = p.telegramId === winnerId;
    return Stats.findOneAndUpdate(
      { groupId: game.groupId, telegramId: p.telegramId, game: game.type },
      {
        $set: { displayName: p.displayName },
        $inc: { matches: 1, wins: isWin ? 1 : 0 },
        $push: { history: { date: new Date(), result: isWin ? 'win' : (type === 'draw' ? 'draw' : 'loss') } }
      },
      { upsert: true, new: true }
    );
  }));

  const winner = game.players.find(p => p.telegramId === winnerId);
  io.to(game.gameId).emit('game:over', {
    winnerName: winner ? winner.displayName : null,
    draw: type === 'draw'
  });
}

/* ---------- HELPERS ---------- */
function validTurn(game, socket) {
  if (!game || game.status !== 'active') return false;
  const current = game.players[game.turnIndex];
  if (current.telegramId !== socket.data.telegramId) return false;
  return true;
}

function publicState(game) {
  return {
    gameId: game.gameId, type: game.type, state: game.state,
    turnIndex: game.turnIndex,
    players: game.players.map(p => ({ name: p.displayName, color: p.color, id: p.telegramId }))
  };
}

module.exports = (io, socket) => attach(io, socket);
module.exports.startGame = startGame;
