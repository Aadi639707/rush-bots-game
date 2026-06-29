const Stats = require('../models/Stats');

function periodStart(period) {
  const d = new Date();
  if (period === 'today') d.setHours(0, 0, 0, 0);
  else if (period === 'week') d.setDate(d.getDate() - 7);
  else if (period === 'month') d.setMonth(d.getMonth() - 1);
  return d;
}

async function buildLeaderboard(groupId, period) {
  const since = periodStart(period);
  const rows = await Stats.aggregate([
    { $match: { groupId } },
    { $unwind: '$history' },
    { $match: { 'history.date': { $gte: since }, 'history.result': 'win' } },
    { $group: { _id: { id: '$telegramId', name: '$displayName' }, wins: { $sum: 1 } } },
    { $sort: { wins: -1 } },
    { $limit: 10 }
  ]);

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const title = { today: 'ᴛᴏᴅᴀʏ', week: 'ᴛʜɪꜱ ᴡᴇᴇᴋ', month: 'ᴛʜɪꜱ ᴍᴏɴᴛʜ' }[period];
  let out = `🏆 <b>ᴛᴏᴘ 10 — ${title}</b>\n\n`;
  if (!rows.length) return out + 'ɴᴏ ɢᴀᴍᴇꜱ ʏᴇᴛ.';
  const medals = ['🥇','🥈','🥉'];
  rows.forEach((r, i) => {
    out += `${medals[i] || (i + 1) + '.'} ${esc(r._id.name)} — <b>${r.wins}</b> ᴡɪɴꜱ\n`;
  });
  return out;
}

module.exports = { buildLeaderboard };
