/* Cliente de puntajes de Crunchy Munch para los minijuegos estáticos.
 *
 * Uso dentro de un juego (incluir con <script src="../scores-client.js"></script>):
 *   CrunchyScores.submit('pacman', 1250);        // guarda el puntaje al terminar
 *   CrunchyScores.top('pacman').then(rows => …); // top 10 [{player, points}]
 *
 * El nombre del jugador se pide una sola vez y se recuerda en localStorage.
 * Si el backend no está levantado, todo falla en silencio: el juego nunca se rompe.
 */
(function () {
  const API = 'http://localhost:3000/api/scores';
  const NAME_KEY = 'crunchy-player-name';

  function getPlayerName() {
    let name = null;
    try {
      name = localStorage.getItem(NAME_KEY);
    } catch (_) { /* almacenamiento bloqueado: seguimos sin persistir */ }
    if (!name) {
      name = (window.prompt('¿Tu nombre para el ranking?') || 'Anónimo').trim().slice(0, 24) || 'Anónimo';
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch (_) { /* idem */ }
    }
    return name;
  }

  async function submit(gameId, points, playerName) {
    try {
      const player = (playerName || getPlayerName()).slice(0, 24);
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, player, points }),
      });
      return res.ok;
    } catch (_) {
      return false; // backend apagado: no interrumpir el juego
    }
  }

  async function top(gameId, limit) {
    try {
      const res = await fetch(API + '/' + encodeURIComponent(gameId) + '/top?limit=' + (limit || 10));
      if (!res.ok) return [];
      return await res.json();
    } catch (_) {
      return [];
    }
  }

  window.CrunchyScores = { submit, top, getPlayerName };
})();
