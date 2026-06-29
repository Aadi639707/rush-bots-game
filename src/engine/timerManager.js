const timers = new Map(); // gameId -> { timeout, deadline }
const TURN_MS = 30000;

function startTurn(gameId, onTimeout) {
  clearTurn(gameId); // ALWAYS clear before setting (prevents double auto-move)
  const timeout = setTimeout(() => {
    timers.delete(gameId);
    onTimeout();
  }, TURN_MS);
  timers.set(gameId, { timeout, deadline: Date.now() + TURN_MS });
}

function clearTurn(gameId) {
  const t = timers.get(gameId);
  if (t) { clearTimeout(t.timeout); timers.delete(gameId); }
}

function remaining(gameId) {
  const t = timers.get(gameId);
  return t ? Math.max(0, t.deadline - Date.now()) : 0;
}

module.exports = { startTurn, clearTurn, remaining, TURN_MS };
