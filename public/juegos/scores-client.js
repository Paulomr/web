/* Puente de estrellas de Crunchy Munch para los minijuegos.
 *
 * Al terminar una ronda, el juego reporta 0..3 estrellas:
 *   CrunchyScores.submit('head-soccer', puntos, estrellas);
 *
 * La identidad es el @instagram de la cuenta (se lee del mismo dominio, sin
 * pedir nada). Sin cuenta con Instagram no se rankea. Todo falla en silencio:
 * el juego nunca se rompe.
 */
(function () {
  const API = '/api/scores';
  const CUENTA_KEY = 'crunchy-cuenta-v1';

  function getIg() {
    try {
      const c = JSON.parse(localStorage.getItem(CUENTA_KEY) || 'null');
      return c && c.instagram ? String(c.instagram) : '';
    } catch (_) {
      return '';
    }
  }

  async function submit(gameId, puntos, estrellas) {
    const instagram = getIg();
    const est = Math.max(0, Math.min(3, Math.round(Number(estrellas) || 0)));
    // Avisa a la página padre (minijuegos) para refrescar ranking/perfil.
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'crunchy-score', gameId: gameId, estrellas: est }, '*');
      }
    } catch (_) { /* ignore */ }
    if (est <= 0) return false; // 0 estrellas = reintento: no entra al ranking
    if (!instagram) return false; // sin cuenta con IG no se rankea
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameId,
          instagram: instagram,
          estrellas: est,
          puntos: Math.max(0, Math.round(Number(puntos) || 0)),
        }),
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  async function top(gameId, limit) {
    try {
      const res = await fetch(API + '?gameId=' + encodeURIComponent(gameId) + '&top=' + (limit || 10));
      if (!res.ok) return { rows: [], total: 0 };
      return await res.json();
    } catch (_) {
      return { rows: [], total: 0 };
    }
  }

  window.CrunchyScores = { submit: submit, top: top, getIg: getIg };
})();
