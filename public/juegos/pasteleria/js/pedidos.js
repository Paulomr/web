/* Generador justo de pedidos y variantes de clientes doodle. */

import { MASAS, TOPPINGS, DECORACIONES, GLASEADOS, valorItem } from './recetas.js';

let siguienteId = 1;

const alAzar = (arr) => arr[Math.floor(Math.random() * arr.length)];
const enteroEntre = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function eleccionPonderada(items, debutIds) {
  const pesos = items.map((it) => (debutIds.includes(it.id) ? 3 : 1));
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= pesos[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function probCon(base, id, debutIds) {
  return debutIds.includes(id) ? Math.min(0.85, base + 0.35) : base;
}

/**
 * Genera un PEDIDO = { id, items:[{masa, toppings:[], decoraciones:[], servido:false}], valorBase }
 * opts: { diaMax, debutIds, itemsRango, primero, forzado }
 * Reglas justas: solo ingredientes desbloqueados; debut con peso x3; sprinkles solo con glaseado;
 * el primer pedido del día es 1 galleta sin decoración.
 */
export function generarPedido(opts) {
  const { diaMax, debutIds = [], itemsRango = [1, 1], primero = false, forzado = null } = opts;
  if (forzado) {
    const items = forzado.map((it) => ({ masa: it.masa, toppings: [...(it.toppings || [])], decoraciones: [...(it.decoraciones || [])], servido: false }));
    return { id: siguienteId++, items, valorBase: items.reduce((s, it) => s + valorItem(it), 0) };
  }
  const masas = MASAS.filter((m) => m.dia <= diaMax);
  const toppings = TOPPINGS.filter((t) => t.dia <= diaMax);
  const decos = DECORACIONES.filter((d) => d.dia <= diaMax);
  const glaseados = decos.filter((d) => GLASEADOS.includes(d.id));
  const sprinkles = decos.find((d) => d.id === 'sprinkles');

  const n = primero ? 1 : enteroEntre(itemsRango[0], itemsRango[1]);
  const items = [];
  for (let i = 0; i < n; i++) {
    const masa = eleccionPonderada(masas, debutIds).id;
    const tops = [];
    for (const t of toppings) {
      if (Math.random() < probCon(0.45, t.id, debutIds)) tops.push(t.id);
    }
    const dec = [];
    if (!primero && glaseados.length && Math.random() < probCon(0.55, glaseados[0].id, debutIds)) {
      dec.push(eleccionPonderada(glaseados, debutIds).id);
      if (sprinkles && Math.random() < probCon(0.4, 'sprinkles', debutIds)) dec.push('sprinkles');
    }
    items.push({ masa, toppings: tops, decoraciones: dec, servido: false });
  }
  return { id: siguienteId++, items, valorBase: items.reduce((s, it) => s + valorItem(it), 0) };
}

/* ---- Variantes visuales de clientes doodle ---- */

const CARAS = ['#fdf6ef', '#f2a7c0', '#d9c7ee', '#bfe3d0', '#f7e3a1'];
const ACCESORIOS = ['gorra', 'gafas', 'mono', 'gorro', 'ninguno'];

export function generarVariante() {
  return {
    colorCara: alAzar(CARAS),
    accesorio: alAzar(ACCESORIOS),
    semilla: Math.random(),
  };
}
