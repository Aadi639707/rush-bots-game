const { Chess } = require('chess.js');

function newGame() { return new Chess().fen(); }

// Validates and applies a move from authoritative FEN. Returns null if illegal.
function applyMove(fen, move) {
  const game = new Chess(fen);
  const result = game.move(move); // {from,to,promotion} — chess.js rejects illegal moves
  if (!result) return null;
  return {
    fen: game.fen(),
    san: result.san,
    captured: !!result.captured,
    check: game.inCheck(),
    checkmate: game.isCheckmate(),
    draw: game.isDraw(),
    turn: game.turn() // 'w' | 'b'
  };
}

function autoMove(fen) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

module.exports = { newGame, applyMove, autoMove };
