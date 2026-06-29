const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId:    { type: String, required: true, unique: true, index: true }, // UUID
  groupId:   { type: Number, required: true, index: true },
  type:      { type: String, enum: ['ludo', 'chess'], required: true },
  status:    { type: String, enum: ['lobby', 'active', 'finished'], default: 'lobby' },
  players: [{
    telegramId:  Number,
    displayName: String,
    color:       String,    // ludo: red/green/yellow/blue | chess: white/black
    connected:   { type: Boolean, default: true },
    socketId:    String
  }],
  state:     { type: mongoose.Schema.Types.Mixed, default: {} }, // engine state (FEN / token positions)
  turnIndex: { type: Number, default: 0 },
  winner:    { type: Number, default: null },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // auto-cleanup after 24h
});

module.exports = mongoose.model('Game', gameSchema);
