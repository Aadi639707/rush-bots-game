// Preload pools so sounds never overlap incorrectly
const LUDO = {
  dice: 'assets/sounds/ludo/dice.mp3',
  move: 'assets/sounds/ludo/move.mp3',
  kill: 'assets/sounds/ludo/kill.mp3',
  home: 'assets/sounds/ludo/home.mp3',
  win:  'assets/sounds/ludo/win.mp3'
};
const CHESS = {
  move:      'assets/sounds/chess/move.mp3',
  capture:   'assets/sounds/chess/capture.mp3',
  check:     'assets/sounds/chess/check.mp3',
  checkmate: 'assets/sounds/chess/checkmate.mp3'
};

const cache = {};
function load(src) {
  if (!cache[src]) { cache[src] = new Audio(src); cache[src].preload = 'auto'; }
  return cache[src];
}

// Play a SET of events sequentially-aware (kill > move priority so they don't mix muddily)
export function playLudo(events) {
  const priority = ['win', 'home', 'kill', 'move', 'dice'];
  const pick = priority.find(p => events.includes(p));
  if (pick) { const a = load(LUDO[pick]); a.currentTime = 0; a.play().catch(()=>{}); }
}
export function playChess(events) {
  const priority = ['checkmate', 'check', 'capture', 'move'];
  const pick = priority.find(p => events.includes(p));
  if (pick) { const a = load(CHESS[pick]); a.currentTime = 0; a.play().catch(()=>{}); }
}
export function playDice() { const a = load(LUDO.dice); a.currentTime = 0; a.play().catch(()=>{}); }
