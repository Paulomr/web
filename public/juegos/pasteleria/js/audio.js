/* SFX procedurales con WebAudio. El contexto se crea SOLO tras el primer gesto del usuario. */

import { datos, setMute as persistirMute } from './guardado.js';

let ctx = null;
let master = null;

/* Música de fondo (mp3). Se reproduce solo tras el primer gesto y respeta el mute. */
const bgm = typeof document !== 'undefined' ? document.getElementById('bgm') : null;
if (bgm) bgm.volume = 0.35;

function sonarMusica() {
  if (!bgm || datos.mute) return;
  const p = bgm.play();
  if (p && p.catch) p.catch(() => {});
}

/* Pausa la música con la pestaña oculta y la retoma al volver (si no está muteada). */
if (bgm) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) bgm.pause();
    else sonarMusica();
  });
}

export function desbloquear() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = datos.mute ? 0 : 0.42;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  sonarMusica();
}

export function estaMute() {
  return datos.mute;
}

export function alternarMute() {
  persistirMute(!datos.mute);
  if (master) master.gain.value = datos.mute ? 0 : 0.42;
  if (bgm) {
    if (datos.mute) bgm.pause();
    else sonarMusica();
  }
  return datos.mute;
}

function tono({ tipo = 'sine', f0 = 440, f1 = null, dur = 0.12, vol = 0.5, delay = 0, curva = 'exp' }) {
  if (!ctx || datos.mute) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 != null) {
    if (curva === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(f1, t0 + dur);
  }
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function ruido({ dur = 0.25, f0 = 2400, f1 = 300, vol = 0.3, delay = 0 }) {
  if (!ctx || datos.mute) return;
  const t0 = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = 1.2;
  filtro.frequency.setValueAtTime(f0, t0);
  filtro.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filtro).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  /* pop suave al tap */
  pop() { tono({ tipo: 'triangle', f0: 380, f1: 260, dur: 0.07, vol: 0.35 }); },
  /* plop grave al caer la masa */
  plop() { tono({ tipo: 'sine', f0: 220, f1: 110, dur: 0.14, vol: 0.5 }); },
  /* chispitas al incrustar toppings */
  chispa() { tono({ tipo: 'triangle', f0: 620, f1: 480, dur: 0.05, vol: 0.22 }); },
  /* ding al entrar en la ventana perfecta */
  ding() {
    tono({ tipo: 'sine', f0: 880, dur: 0.4, vol: 0.35 });
    tono({ tipo: 'sine', f0: 1760, dur: 0.28, vol: 0.12 });
  },
  /* cash de dos notas al cobrar */
  cash() {
    tono({ tipo: 'triangle', f0: 660, dur: 0.09, vol: 0.4 });
    tono({ tipo: 'triangle', f0: 990, dur: 0.16, vol: 0.4, delay: 0.08 });
  },
  /* whoosh de entrega */
  whoosh() { ruido({ dur: 0.22, f0: 2600, f1: 320, vol: 0.22 }); },
  /* buzz corto en error */
  buzz() { tono({ tipo: 'square', f0: 150, f1: 120, dur: 0.14, vol: 0.16 }); },
  /* trombón triste al perder cliente */
  triste() { tono({ tipo: 'sawtooth', f0: 220, f1: 160, dur: 0.35, vol: 0.2, curva: 'lin' }); },
  /* glaseado derramándose */
  glaseado() { ruido({ dur: 0.2, f0: 900, f1: 400, vol: 0.14 }); },
  /* humo / quemada */
  quemada() { tono({ tipo: 'sawtooth', f0: 180, f1: 60, dur: 0.4, vol: 0.14, curva: 'lin' }); },
  /* fanfarria de 4 notas para las estrellas */
  fanfarria() {
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((f, i) => {
      tono({ tipo: 'triangle', f0: f, dur: 0.22, vol: 0.3, delay: i * 0.14 });
      tono({ tipo: 'sine', f0: f / 2, dur: 0.22, vol: 0.14, delay: i * 0.14 });
    });
  },
  /* nota individual de estrella */
  estrella(i = 0) { tono({ tipo: 'triangle', f0: 660 + i * 160, dur: 0.25, vol: 0.32 }); },
  /* tick del countdown */
  tick() { tono({ tipo: 'sine', f0: 520, dur: 0.09, vol: 0.3 }); },
  go() { tono({ tipo: 'sine', f0: 780, f1: 920, dur: 0.28, vol: 0.35 }); },
};
