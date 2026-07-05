# Bear Soccer - Crunchy Munch

Juego tipo *head soccer* 1v1 contra la CPU. Phaser 3 + JavaScript vanilla (ES Modules), **sin NPM ni bundlers**.

## Correr

Necesita un servidor HTTP (los ES Modules y `assets/` no cargan con `file://`):

```bash
npx serve .
# o
python -m http.server 8000
```

Abrir `http://localhost:3000` (o el puerto que indique).

## Arquitectura

```
index.html              Markup de todas las pantallas (capas DOM sobre el canvas)
css/styles.css          Estilos + fuente Boldone embebida (base64)
js/
  main.js               Bootstrap: crea Phaser, conecta UI y audio
  config.js             TODA la configuracion (fisica, dificultad, Supabase, sheet mantequilla)
  assets.data.js        Sprites base64 de personajes (archivo generado, no editar a mano)
  core/
    events.js           Bus de eventos: puente juego <-> UI (desacoplados)
    input.js            InputManager: teclado + tactil unificados
    collisions.js       CollisionManager: tabla declarativa de colisiones
  textures/textures.js  Texturas generadas por codigo (balon, estadio, red, sombra)
  scenes/
    BootScene.js        Precarga de assets y generacion de texturas
    GameScene.js        Jugabilidad: fisica, IA, goles, sonido
  audio/
    sfx.js              Efectos 8-bit sintetizados (Web Audio, sin archivos)
    music.js            Musica MP3: loop, mute, ducking en gol
  ui/
    dom.js              Helpers show/hide/setText/esc
    menus.js            Navegacion, seleccion de personaje, pausa, fin de partido
    maze.js             Fondo animado del menu (Canvas 2D)
    leaderboard.js      Ranking: Supabase o localStorage
assets/                 Musica y sprites externos
```

**Reglas de dependencia:** las escenas nunca tocan el DOM de menus (avisan por `core/events.js`); la UI nunca importa escenas (controla el juego via `game.scene`). `config.js` no importa nada.

## Personaje mantequilla

Coloca el sprite sheet de salto en `assets/mantequilla_sheet.png` y ajusta `fw/fh/frames` en `js/config.js` (constante `BUTTER`). Si el archivo no existe, el juego funciona igual sin ese personaje.

## Ranking online (Supabase)

Pega URL y anon key en `js/config.js`. SQL a correr una vez:

```sql
create table if not exists head_soccer_scores (
  id bigint generated always as identity primary key,
  player_name text not null check (char_length(player_name) <= 14),
  wins int4 not null default 0 check (wins between 0 and 1),
  created_at timestamptz default now()
);
alter table head_soccer_scores enable row level security;
create policy "insert_only" on head_soccer_scores
  for insert to anon with check (wins = 1 and char_length(player_name) <= 14);
create or replace view head_soccer_ranking as
  select player_name, sum(wins)::int as wins
  from head_soccer_scores group by player_name order by wins desc limit 10;
grant select on head_soccer_ranking to anon;
```

Sin credenciales, el ranking se guarda en `localStorage`.
