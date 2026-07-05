/* Audio: música mp3 de fondo (tras gesto) + SFX 100% procedurales WebAudio.
   Port del patrón de pasteleria/js/audio.js. */

import { datos, setMute as persistirMute } from './storage.js';

let ctx = null;
let master = null;

const bgm = typeof document !== 'undefined' ? document.getElementById('bgm') : null;
if (bgm) bgm.volume = 0.35;

function sonarMusica() {
  if (!bgm || datos.mute) return;
  const p = bgm.play();
  if (p && p.catch) p.catch(() => {});
}

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

export function pausarMusica() {
  if (bgm) bgm.pause();
}
export function reanudarMusica() {
  sonarMusica();
}
export function volumenMusica(v) {
  if (bgm) bgm.volume = Math.max(0, Math.min(1, v));
}
// glaseado activo: sube volumen y (si se puede) leve rate.
export function glaseadoMusica(activo) {
  if (!bgm) return;
  bgm.volume = activo ? 0.45 : 0.35;
  try { bgm.playbackRate = activo ? 1.05 : 1.0; } catch { /* no soportado */ }
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

let migaAlt = 0;
export const sfx = {
  // comer miga: blip corto, pitch sube con la racha (mult 1..3).
  miga(mult = 1) {
    migaAlt ^= 1;
    const base = migaAlt ? 400 : 300;
    const f = base + (mult - 1) * 140;
    tono({ tipo: 'triangle', f0: f, f1: f * 0.7, dur: 0.06, vol: 0.26 });
  },
  // subir de racha: anillo brillante.
  rachaUp(mult) {
    const notas = mult >= 3 ? [660, 880, 1175] : [523, 784];
    notas.forEach((f, i) => tono({ tipo: 'triangle', f0: f, dur: 0.12, vol: 0.28, delay: i * 0.06 }));
  },
  // salpicada: splash grave.
  salpicada() {
    ruido({ dur: 0.28, f0: 900, f1: 160, vol: 0.34 });
    tono({ tipo: 'sine', f0: 240, f1: 90, dur: 0.25, vol: 0.22, curva: 'lin' });
  },
  // charco: chapoteo corto.
  charco() {
    ruido({ dur: 0.18, f0: 1400, f1: 400, vol: 0.2 });
    tono({ tipo: 'sine', f0: 320, f1: 200, dur: 0.14, vol: 0.14 });
  },
  // horno re-tostando: crepitar (ruido filtrado suave).
  horno() {
    ruido({ dur: 0.2, f0: 2600, f1: 1200, vol: 0.14 });
  },
  // quemadura: sizzle + thud.
  quemadura() {
    ruido({ dur: 0.35, f0: 3200, f1: 500, vol: 0.28 });
    tono({ tipo: 'sawtooth', f0: 180, f1: 60, dur: 0.3, vol: 0.24, curva: 'lin' });
  },
  // power / glaseado: fanfarria corta ascendente.
  power() {
    [392, 523, 659, 880, 1047].forEach((f, i) =>
      tono({ tipo: 'triangle', f0: f, dur: 0.12, vol: 0.3, delay: i * 0.05 }));
  },
  // morder leche: pop + splash, sube por eslabon (0..3).
  morder(eslabon = 0) {
    const base = 300 + eslabon * 120;
    tono({ tipo: 'square', f0: base, f1: base * 2.2, dur: 0.16, vol: 0.24, curva: 'exp' });
    ruido({ dur: 0.18, f0: 1200, f1: 300, vol: 0.16 });
  },
  // estornudo comico de Kumis: ¡ACHUS!
  estornudo() {
    tono({ tipo: 'sawtooth', f0: 300, f1: 520, dur: 0.1, vol: 0.2, curva: 'exp' }); // el "a-"
    tono({ tipo: 'square', f0: 700, f1: 180, dur: 0.28, vol: 0.26, curva: 'exp', delay: 0.12 }); // "-chuS"
    ruido({ dur: 0.22, f0: 2200, f1: 500, vol: 0.16, delay: 0.12 });
  },
  // muerte (galleta ablandada): descenso blando.
  muerte() {
    tono({ tipo: 'sine', f0: 520, f1: 90, dur: 0.8, vol: 0.24, curva: 'lin' });
    tono({ tipo: 'triangle', f0: 330, f1: 70, dur: 0.8, vol: 0.14, curva: 'lin', delay: 0.05 });
    ruido({ dur: 0.5, f0: 700, f1: 120, vol: 0.14, delay: 0.1 });
  },
  // ronda: jingle 3 notas al empezar/reanudar.
  ronda() {
    [523, 659, 784].forEach((f, i) =>
      tono({ tipo: 'triangle', f0: f, dur: 0.16, vol: 0.3, delay: i * 0.14 }));
  },
  vidaExtra() {
    [784, 988, 1175, 1568].forEach((f, i) =>
      tono({ tipo: 'triangle', f0: f, dur: 0.18, vol: 0.28, delay: i * 0.09 }));
  },
  nivel() {
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((f, i) => {
      tono({ tipo: 'triangle', f0: f, dur: 0.22, vol: 0.3, delay: i * 0.14 });
      tono({ tipo: 'sine', f0: f / 2, dur: 0.22, vol: 0.14, delay: i * 0.14 });
    });
  },
  antojo() {
    tono({ tipo: 'sine', f0: 880, dur: 0.35, vol: 0.32 });
    tono({ tipo: 'sine', f0: 1320, dur: 0.24, vol: 0.14, delay: 0.04 });
  },
  // countdown: 3 blips + 1 agudo (CRUNCH!).
  tick() { tono({ tipo: 'sine', f0: 520, dur: 0.09, vol: 0.28 }); },
  go() {
    tono({ tipo: 'square', f0: 780, f1: 1040, dur: 0.28, vol: 0.32 });
    ruido({ dur: 0.16, f0: 3000, f1: 800, vol: 0.16 });
  },
};
