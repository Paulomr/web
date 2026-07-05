/* =====================================================================
   Catalogo de juegos: anadir un juego nuevo = anadir un objeto aqui.
   local: URL de desarrollo (servida por preview_start / .claude/launch.json).
   live:  URL publica en Vercel. null = aun no desplegado ("PROXIMAMENTE").
   ===================================================================== */
export const GAMES = [
  {
    id: 'headSoccer',
    title: 'BEAR SOCCER',
    tagline: 'Crunchy Munch · cabecea, salta y mete gol',
    color: '#ff5b3a',
    local: 'http://localhost:5173/',
    live: 'https://bear-soccer.vercel.app/',
  },
  {
    id: 'catapulta',
    title: 'CATAPULTA',
    tagline: 'Crunchy Munch · Bernie recupera las galletas',
    color: '#cf30aa',
    local: 'http://localhost:8123/',
    live: 'https://catapulta-two.vercel.app/',
  },
  {
    id: 'trivia',
    title: 'RETO CRUNCHY',
    tagline: 'Trivia y ranking Crunchy Munch',
    color: '#3b6ea5',
    local: 'http://localhost:3000/',
    live: 'https://www.crunchy-munch.com/',
  },
  {
    id: 'pasteleria',
    title: 'LA PASTELERIA DE BERNIE',
    tagline: 'Crunchy Munch · hornea y sirve con Bernie',
    color: '#f2a7c0',
    local: 'http://localhost:8161/',
    live: null,
  },
  {
    id: 'pacman',
    title: 'PANICO LACTEO',
    tagline: 'Crunchy Munch · escapa de las leches y no te ablandes',
    color: '#e5679b',
    local: 'http://localhost:8171/',
    live: null,
  },
];
