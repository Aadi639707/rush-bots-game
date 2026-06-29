const matchmaking = require('./matchmaking');
const gameHandlers = require('./gameHandlers');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    matchmaking(io, socket);
    gameHandlers(io, socket);
  });
};
