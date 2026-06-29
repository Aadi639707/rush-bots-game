import { playChess } from './audio.js';
export function initChess(socket, state, me) {
  const myColor = state.players.find(p => p.id === me.id)?.color;
  // Render board from state.state.fen using chessboard.js / chessground.
  socket.on('chess:update', ({ fen, san, events }) => {
    renderBoard(fen);          // your render fn
    playChess(events);         // wood-slide / capture / check / checkmate
  });
  socket.on('turn:begin', ({ telegramId, ms }) => startTimerUI(ms, telegramId === me.id));
  // On drop: socket.emit('chess:move', { gameId: state.gameId, move: { from, to, promotion:'q' } });
  function renderBoard(){/* impl */} function startTimerUI(){/* impl */}
}
