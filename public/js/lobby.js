import { ME, GAME_ID, tg } from './tg.js';

export const socket = io();
let gameType = null;

socket.on('connect', () => {
  socket.emit('lobby:join', { gameId: GAME_ID, user: ME });
});

socket.on('error:msg', (m) => { document.getElementById('status').innerText = m; });

socket.on('lobby:update', ({ players, type, canStart }) => {
  gameType = type;
  const ul = document.getElementById('players');
  ul.innerHTML = players.map(p => `<li>${escapeHtml(p.name)} (${p.color})</li>`).join('');
  const startBtn = document.getElementById('startBtn');
  if (canStart && players.length === 2) {
    document.getElementById('status').innerText = 'ᴡᴀɪᴛɪɴɢ ꜰᴏʀ ᴍᴇᴍʙᴇʀꜱ…';
    startBtn.style.display = 'block';
  } else {
    document.getElementById('status').innerText = `${players.length} ᴊᴏɪɴᴇᴅ`;
  }
});

document.getElementById('startBtn').onclick = () =>
  socket.emit('lobby:start', { gameId: GAME_ID });

// Start / resume → load correct engine UI
async function launch(state) {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('board').style.display = 'block';
  if (state.type === 'ludo') (await import('./ludo.js')).initLudo(socket, state, ME);
  else (await import('./chess-ui.js')).initChess(socket, state, ME);
}
socket.on('game:start', launch);
socket.on('game:resume', launch);

/* ---- END GAME ---- */
socket.on('game:over', ({ winnerName, draw }) => {
  const modal = document.getElementById('endModal');
  document.getElementById('endTitle').innerText =
    draw ? '🤝 ᴅʀᴀᴡ!' : `🏆 ${winnerName} ᴡɪɴꜱ!`;
  modal.style.display = 'flex';
});

document.getElementById('rematchBtn').onclick = () => {
  socket.emit('rematch:request', { gameId: GAME_ID, fromName: ME.displayName });
  tg.showAlert('ʀᴇQᴜᴇꜱᴛ ꜱᴇɴᴛ ᴛᴏ ᴏᴛʜᴇʀ ᴘʟᴀʏᴇʀꜱ…');
};
document.getElementById('endBtn').onclick = () => tg.close(); // auto-leave Mini App

socket.on('rematch:incoming', ({ fromName }) => {
  tg.showConfirm(`${fromName} ᴡᴀɴᴛꜱ ᴀ ʀᴇᴍᴀᴛᴄʜ. ᴀᴄᴄᴇᴘᴛ?`, (ok) => {
    if (ok) socket.emit('rematch:accept', { gameId: GAME_ID });
    else tg.close();
  });
});

function escapeHtml(s){return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
