const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId:   { type: Number, required: true, unique: true, index: true },
  displayName:  { type: String, required: true }, // EXACT name incl. fancy fonts/emoji
  username:     { type: String, default: null },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
