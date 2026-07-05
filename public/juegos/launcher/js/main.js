import { GAMES } from './games.js';

const grid = document.getElementById('grid');

GAMES.forEach(g => {
  const url = g.live || g.local;
  const card = document.createElement('a');
  card.className = 'card';
  card.href = url;
  card.target = '_blank';
  card.rel = 'noopener';
  card.style.setProperty('--accent', g.color);
  card.innerHTML = `
    <span class="badge ${g.live ? 'on' : 'off'}">${g.live ? 'EN VIVO' : 'LOCAL DEV'}</span>
    <h2>${g.title}</h2>
    <p>${g.tagline}</p>
    <span class="play">&#9654; JUGAR</span>
  `;
  grid.appendChild(card);
});
