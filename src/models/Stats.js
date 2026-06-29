const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  groupId:      { type: Number, required: true, index: true },
  telegramId:   { type: Number, required: true, index: true },
  displayName:  { type: String, required: true },
  game:         { type: String, enum: ['ludo', 'chess'], required: true },
  wins:         { type: Number, default: 0 },
  matches:      { type: Number, default: 0 },
  // Daily buckets for time-filtered leaderboards (Today/Week/Month)
  history: [{
    date:   { type: Date, default: Date.now, index: true },
    result: { type: String, enum: ['win', 'loss', 'draw'] }
  }]
}, { timestamps: true });

statsSchema.index({ groupId: 1, telegramId: 1, game: 1 }, { unique: true });

module.exports = mongoose.model('Stats', statsSchema);
