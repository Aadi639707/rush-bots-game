const crypto = require('crypto');

const PATH_LEN = 52;       // main loop
const HOME_STRETCH = 6;    // 6 squares to home
const START_OFFSET = { red: 0, green: 13, yellow: 26, blue: 39 };

function initState(colors) {
  const tokens = {};
  colors.forEach(c => { tokens[c] = [-1, -1, -1, -1]; }); // -1 = in base
  return { tokens, lastRoll: null };
}

// Cryptographically fair dice — server only (anti-cheat)
function rollDice() { return (crypto.randomInt(6) + 1); }

// Which tokens can legally move given a dice value
function movableTokens(state, color, dice) {
  const arr = state.tokens[color];
  const movable = [];
  arr.forEach((pos, i) => {
    if (pos === -1 && dice === 6) movable.push(i);          // exit base on 6
    else if (pos >= 0 && pos + dice <= PATH_LEN + HOME_STRETCH) movable.push(i);
  });
  return movable;
}

// Apply move, handle captures, return events for audio
function moveToken(state, color, tokenIndex, dice) {
  const arr = state.tokens[color];
  let pos = arr[tokenIndex];
  const events = [];

  if (pos === -1 && dice === 6) { arr[tokenIndex] = 0; events.push('move'); }
  else { arr[tokenIndex] = pos + dice; events.push('move'); }

  const newPos = arr[tokenIndex];

  // Home reached
  if (newPos === PATH_LEN + HOME_STRETCH) events.push('home');

  // Capture check (only on main loop, not home stretch, not safe squares)
  if (newPos < PATH_LEN) {
    const absPos = (START_OFFSET[color] + newPos) % PATH_LEN;
    const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
    if (!SAFE.has(absPos)) {
      for (const oc of Object.keys(state.tokens)) {
        if (oc === color) continue;
        state.tokens[oc].forEach((op, oi) => {
          if (op >= 0 && op < PATH_LEN) {
            const oAbs = (START_OFFSET[oc] + op) % PATH_LEN;
            if (oAbs === absPos) { state.tokens[oc][oi] = -1; events.push('kill'); }
          }
        });
      }
    }
  }

  const won = arr.every(p => p === PATH_LEN + HOME_STRETCH);
  if (won) events.push('win');

  return { events, won, extraTurn: dice === 6 || events.includes('kill') || events.includes('home') };
}

function autoMove(state, color, dice) {
  const movable = movableTokens(state, color, dice);
  if (!movable.length) return null;
  return movable[Math.floor(Math.random() * movable.length)];
}

module.exports = { initState, rollDice, movableTokens, moveToken, autoMove, PATH_LEN, HOME_STRETCH };
