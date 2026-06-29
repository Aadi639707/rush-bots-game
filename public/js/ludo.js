import { playLudo, playDice } from './audio.js';
export function initLudo(socket, state, me) {
  const myColor = state.players.find(p => p.id === me.id)?.color;
  socket.on('ludo:dice', ({ color, dice, movable }) => {
    playDice(); showDice(dice);
    if (movable && color === myColor) highlightTokens(movable);
  });
  socket.on('ludo:update', ({ tokens, events }) => {
    renderTokens(tokens);
    playLudo(events); // dice/move/kill/home/win — never mixed (priority picker)
  });
  socket.on('turn:begin', ({ telegramId, ms }) => startTimerUI(ms, telegramId === me.id));
  // Roll: socket.emit('ludo:roll', { gameId: state.gameId });
  // Move: socket.emit('ludo:move', { gameId: state.gameId, tokenIndex });
  function showDice(){} function highlightTokens(){} function renderTokens(){} function startTimerUI(){}
}
