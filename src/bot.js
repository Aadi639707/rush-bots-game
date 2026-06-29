require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Game = require('./models/Game');
const Stats = require('./models/Stats');
const User = require('./models/User');
const { buildLeaderboard } = require('./utils/leaderboard');

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEBAPP_URL = process.env.WEBAPP_URL; // e.g. https://yourdomain.com

/* ----------------------- /start (EXACT layout & fonts) ----------------------- */
const START_TEXT =
`ᴅᴇᴠᴇʟᴏᴘᴇʀ:- @rushdeveloper
ᴄʜᴀɴɴᴇʟ:- https://t.me/rushbots

ᴛᴇʟᴇɢʀᴀᴍ
ʀᴜꜱʜ ʙᴏᴛꜱ
ɪ ᴅᴏɴ’ᴛ ᴄʜᴀꜱᴇ ᴀᴛᴛᴇɴᴛɪᴏɴ, ɪ ʙᴜɪʟᴅ ᴘᴏᴡᴇʀ. ᴍʏ ʙᴏᴛꜱ ꜱᴇᴛ ᴛʜᴇ ꜱᴛᴀɴᴅᴀʀᴅ. ꜱᴇᴇ ᴍʏ ᴡᴏʀᴋ ᴀᴛ @rushbots

ᴘᴏᴡᴇʀᴇᴅ ʙʏ @rushdeveloper`;

bot.start(async (ctx) => {
  await ctx.reply(START_TEXT, {
    disable_web_page_preview: true,
    ...Markup.inlineKeyboard([
      [Markup.button.url('ADD ME IN YOUR GROUP +',
        `https://t.me/${ctx.botInfo.username}?startgroup=true`)],
      [Markup.button.callback('HELP & COMMANDS', 'help')],
      [Markup.button.url('DEVELOPER ↗', 'https://t.me/rushdeveloper'),
       Markup.button.url('CHANNEL ↗', 'https://t.me/rushbots')]
    ])
  });
});

bot.action('help', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`ᴄᴏᴍᴍᴀɴᴅꜱ:
/new_ludo - ꜱᴛᴀʀᴛ ᴀ ʟᴜᴅᴏ ɢᴀᴍᴇ
/new_chess - ꜱᴛᴀʀᴛ ᴀ ᴄʜᴇꜱꜱ ɢᴀᴍᴇ
/leaderboard - ᴛᴏᴘ ᴘʟᴀʏᴇʀꜱ
/mystats - ʏᴏᴜʀ ꜱᴛᴀᴛꜱ`);
});

/* ----------------------- Game creation (concurrent-safe) ----------------------- */
async function createGame(ctx, type) {
  if (ctx.chat.type === 'private') {
    return ctx.reply('ᴀᴅᴅ ᴍᴇ ᴛᴏ ᴀ ɢʀᴏᴜᴘ ᴛᴏ ᴘʟᴀʏ.');
  }
  const gameId = uuidv4();
  await Game.create({ gameId, groupId: ctx.chat.id, type, status: 'lobby', players: [] });

  // t.me startapp deep-link opens the Mini App with the gameId param
  const link = `https://t.me/${ctx.botInfo.username}/play?startapp=${gameId}`;
  const label = type === 'ludo' ? '🎲 ʟᴜᴅᴏ' : '♟️ ᴄʜᴇꜱꜱ';

  await ctx.reply(
    `${label} ɢᴀᴍᴇ ᴄʀᴇᴀᴛᴇᴅ!\nᴛᴀᴘ ᴊᴏɪɴ ᴛᴏ ᴇɴᴛᴇʀ ᴛʜᴇ ʟᴏʙʙʏ.`,
    Markup.inlineKeyboard([[ Markup.button.url('🎮 ᴊᴏɪɴ ɢᴀᴍᴇ', link) ]])
  );
}

bot.command('new_ludo',  (ctx) => createGame(ctx, 'ludo'));
bot.command('new_chess', (ctx) => createGame(ctx, 'chess'));

/* ----------------------- /leaderboard ----------------------- */
bot.command('leaderboard', async (ctx) => {
  const text = await buildLeaderboard(ctx.chat.id, 'today');
  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[
      Markup.button.callback('Today', 'lb_today'),
      Markup.button.callback('Week',  'lb_week'),
      Markup.button.callback('Month', 'lb_month')
    ]])
  });
});

['today', 'week', 'month'].forEach(period => {
  bot.action(`lb_${period}`, async (ctx) => {
    await ctx.answerCbQuery();
    const text = await buildLeaderboard(ctx.chat.id, period);
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[
          Markup.button.callback('Today', 'lb_today'),
          Markup.button.callback('Week',  'lb_week'),
          Markup.button.callback('Month', 'lb_month')
        ]])
      });
    } catch (e) { /* ignore "message not modified" */ }
  });
});

/* ----------------------- /mystats ----------------------- */
bot.command('mystats', async (ctx) => {
  const rows = await Stats.find({ groupId: ctx.chat.id, telegramId: ctx.from.id });
  const wins = rows.reduce((a, r) => a + r.wins, 0);
  const matches = rows.reduce((a, r) => a + r.matches, 0);
  const rate = matches ? ((wins / matches) * 100).toFixed(1) : '0.0';
  await ctx.reply(
`📊 ʏᴏᴜʀ ꜱᴛᴀᴛꜱ
ᴡɪɴꜱ: ${wins}
ᴍᴀᴛᴄʜᴇꜱ: ${matches}
ᴡɪɴ ʀᴀᴛᴇ: ${rate}%`);
});

module.exports = bot;
