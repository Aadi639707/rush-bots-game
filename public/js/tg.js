const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// EXACT Telegram name — keeps fancy fonts/emoji like "ॐ𝑺ᴀɴᴀᴛᴀɴɪꔪ冬𝙶𝚘𝙹𝚘冬"
const u = tg.initDataUnsafe.user || {};
const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || 'Player';

export const ME = {
  id: u.id,
  displayName: fullName,        // displayed AS-IS, no normalization
  username: u.username || null
};

// gameId comes from start_param (t.me/bot/play?startapp=<gameId>)
export const GAME_ID = tg.initDataUnsafe.start_param;
export { tg };
