/* Estado runtime de la partida + lógica del juego. Sin DOM: emite eventos que ui.js escucha. */

import { DIAS, HORA_PICO, CRUDA_MS, PASADA_MS } from './dias.js';
import { masaPorId, valorItem, GLASEADOS, tieneGlaseado, desbloqueadosHasta } from './recetas.js';
import { generarPedido, generarVariante } from './pedidos.js';

/* ---------- emisor de eventos ---------- */
const oyentes = {};
export function on(evt, cb) {
  (oyentes[evt] ??= []).push(cb);
}
function emit(evt, datos) {
  (oyentes[evt] || []).forEach((cb) => cb(datos));
}

/* ---------- estado ---------- */
export let P = null; // partida actual (no persistida)
let gid = 1;
let cid = 1;
let gate = null; // función de tutorial: (tipo, dato) => bool

export function setGate(fn) {
  gate = fn;
}
function permitido(tipo, dato) {
  return !gate || gate(tipo, dato) === true;
}

export function abandonar() {
  P = null;
}

export function setPausa(v) {
  if (!P || P.terminado) return;
  P.pausado = !!v;
  emit('pausa', P.pausado);
}

export function setCongelar(v) {
  if (P) P.congelado = !!v;
}

/* ---------- inicio de partida ---------- */
function partidaBase(cfg, modo) {
  return {
    modo,
    cfg,
    diaActual: modo === 'dia' ? cfg.dia : 0,
    tRestanteMs: modo === 'dia' ? cfg.duracionS * 1000 : 0,
    tJugadoMs: 0,
    monedas: 0,
    combo: 0,
    propinas: 0,
    galletasVendidas: 0,
    pedidosPerfectos: 0,
    pedidosAtendidos: 0,
    clientesPerdidos: 0,
    vidas: modo === 'pico' ? HORA_PICO.vidas : null,
    clientes: [],
    hornos: Array.from({ length: cfg.hornoPuestos }, () => null),
    repisa: [null, null, null],
    tabla: null,
    clientesCreados: 0,
    spawnTimerMs: 900,
    pausado: true,
    congelado: false,
    terminado: false,
    enPicoFinal: false,
    primerPedidoForzado: null,
  };
}

export function iniciarDia(n, { forzarPrimerPedido = null } = {}) {
  const cfg = DIAS[n - 1];
  ventanaBonusMs = 0;
  P = partidaBase(cfg, 'dia');
  P.primerPedidoForzado = forzarPrimerPedido;
  emit('partida:nueva', P);
}

export function iniciarHoraPico() {
  const cfg = {
    ...HORA_PICO,
    dia: 5,
    clientesSimultaneos: 3,
    ventanaPerfectaS: HORA_PICO.ventanaPerfectaS,
    hornoPuestos: HORA_PICO.hornoPuestos,
    desbloqueos: [],
  };
  ventanaBonusMs = 0;
  P = partidaBase(cfg, 'pico');
  emit('partida:nueva', P);
}

/* ---------- helpers de horneado ---------- */
let ventanaBonusMs = 0; // ampliación temporal de la ventana perfecta (tutorial)
export function setVentanaBonus(ms) {
  ventanaBonusMs = Math.max(0, ms || 0);
}
export function ventanaMs() {
  return P.cfg.ventanaPerfectaS * 1000 + ventanaBonusMs;
}
export function faseHorno(g) {
  const t = g.progresoHornoMs;
  if (t < CRUDA_MS) return 'cruda';
  if (t < CRUDA_MS + ventanaMs()) return 'perfecta';
  if (t < CRUDA_MS + ventanaMs() + PASADA_MS) return 'pasada';
  return 'quemada';
}
export function progresoAnillo(g) {
  return Math.min(1, g.progresoHornoMs / (CRUDA_MS + ventanaMs() + PASADA_MS));
}

/* ---------- helpers de ubicaciones ---------- */
export function galletaEn(origen) {
  if (!P) return null;
  if (origen === 'tabla') return P.tabla;
  if (origen.startsWith('repisa:')) return P.repisa[Number(origen.split(':')[1])] || null;
  if (origen.startsWith('horno:')) return P.hornos[Number(origen.split(':')[1])] || null;
  return null;
}
function quitarDe(origen) {
  const g = galletaEn(origen);
  if (!g) return null;
  if (origen === 'tabla') P.tabla = null;
  else if (origen.startsWith('repisa:')) P.repisa[Number(origen.split(':')[1])] = null;
  else if (origen.startsWith('horno:')) P.hornos[Number(origen.split(':')[1])] = null;
  return g;
}
function emitirOrigen(origen) {
  if (origen === 'tabla') emit('tabla');
  else if (origen.startsWith('repisa:')) emit('repisa');
  else if (origen.startsWith('horno:')) emit('horno');
}

/* ---------- spawn de clientes ---------- */
function intervaloSpawnMs() {
  if (P.modo === 'pico') {
    const s = Math.max(HORA_PICO.spawnMinS, HORA_PICO.spawnInicialS - P.pedidosAtendidos * HORA_PICO.spawnDecayS);
    return s * 1000;
  }
  if (P.cfg.picoFinal && P.tRestanteMs <= P.cfg.picoFinal.ultimosS * 1000) return P.cfg.picoFinal.spawnS * 1000;
  return P.cfg.spawnIntervaloS * 1000;
}

function pacienciaBaseMs() {
  if (P.modo === 'pico') {
    const s = Math.max(HORA_PICO.pacienciaMinS, HORA_PICO.pacienciaInicialS - P.pedidosAtendidos * HORA_PICO.pacienciaDecayS);
    return s * 1000;
  }
  return P.cfg.pacienciaBaseS * 1000;
}

function puedeSpawnear() {
  if (P.terminado) return false;
  const activos = P.clientes.filter((c) => c.estado === 'esperando').length;
  const ocupados = P.clientes.length; // incluye los que están saliendo (ocupan slot)
  const max = P.cfg.clientesSimultaneos;
  if (activos >= max || ocupados >= max) return false;
  if (P.modo === 'dia') {
    if (P.clientesCreados >= P.cfg.pedidosMax) return false;
    if (P.tRestanteMs <= 0) return false;
  }
  return true;
}

function spawnCliente() {
  const slotsOcupados = new Set(P.clientes.map((c) => c.slot));
  let slot = -1;
  for (let i = 0; i < P.cfg.clientesSimultaneos; i++) {
    if (!slotsOcupados.has(i)) { slot = i; break; }
  }
  if (slot < 0) return;

  const primero = P.clientesCreados === 0 && P.modo === 'dia';
  const probVip = P.modo === 'pico' ? HORA_PICO.probVip : P.cfg.probVip || 0;
  const esVip = !primero && Math.random() < probVip;

  const pedido = generarPedido({
    diaMax: P.modo === 'pico' ? 5 : P.cfg.dia,
    debutIds: P.modo === 'pico' ? [] : P.cfg.desbloqueos,
    itemsRango: P.cfg.itemsPorPedido,
    primero,
    forzado: primero ? P.primerPedidoForzado : null,
  });

  const base = pacienciaBaseMs();
  const pacMax = esVip ? base * 0.7 : base;
  const cliente = {
    id: cid++,
    tipo: esVip ? 'vip' : 'normal',
    variante: generarVariante(),
    pacienciaMaxMs: pacMax,
    pacienciaMs: pacMax,
    pedido,
    slot,
    estado: 'esperando',
    errorEntrega: false,
    todasPerfectas: true,
    salidaMs: 0,
  };
  P.clientes.push(cliente);
  P.clientesCreados++;
  emit('cliente:entra', cliente);
}

/* ---------- pérdida / salida de clientes ---------- */
function perderCliente(c) {
  c.estado = 'perdido';
  c.salidaMs = 800;
  P.clientesPerdidos++;
  P.combo = 0;
  emit('combo', P.combo);
  emit('cliente:pierde', c);
  emit('hud');
  if (P.modo === 'pico') {
    P.vidas--;
    emit('vidas', P.vidas);
    if (P.vidas <= 0) finalizar();
  }
}

/* ---------- tick principal (delta time; congelable) ---------- */
export function tick(dt) {
  if (!P || P.pausado || P.terminado) return;
  P.tJugadoMs += dt;

  /* timer del día */
  if (P.modo === 'dia' && !P.congelado) {
    const antes = P.tRestanteMs;
    P.tRestanteMs = Math.max(0, P.tRestanteMs - dt);
    if (P.cfg.picoFinal && !P.enPicoFinal && P.tRestanteMs <= P.cfg.picoFinal.ultimosS * 1000 && P.tRestanteMs > 0) {
      P.enPicoFinal = true;
      emit('pico:activo');
    }
    if (antes > 0 && P.tRestanteMs === 0) emit('hud');
  }

  /* spawn (también durante el tutorial: el primer cliente debe aparecer) */
  if (puedeSpawnear()) {
    P.spawnTimerMs -= dt;
    if (P.spawnTimerMs <= 0) {
      spawnCliente();
      P.spawnTimerMs = intervaloSpawnMs();
    }
  }

  /* paciencia */
  if (!P.congelado) {
    for (const c of P.clientes) {
      if (c.estado !== 'esperando') continue;
      c.pacienciaMs -= dt;
      if (c.pacienciaMs <= 0) {
        c.pacienciaMs = 0;
        perderCliente(c);
      }
    }
  }

  /* salidas (feliz / perdido) */
  for (const c of [...P.clientes]) {
    if (c.estado === 'feliz' || c.estado === 'perdido') {
      c.salidaMs -= dt;
      if (c.salidaMs <= 0) {
        P.clientes = P.clientes.filter((x) => x !== c);
        emit('cliente:fuera', c);
      }
    }
  }

  /* hornos */
  for (let i = 0; i < P.hornos.length; i++) {
    const g = P.hornos[i];
    if (!g) continue;
    const faseAntes = faseHorno(g);
    g.progresoHornoMs += dt;
    const faseAhora = faseHorno(g);
    if (faseAntes !== faseAhora) {
      emit('horno:fase', { idx: i, fase: faseAhora });
    }
  }

  /* fin del día */
  if (P.modo === 'dia' && !P.terminado) {
    const sinMasSpawns = P.tRestanteMs <= 0 || P.clientesCreados >= P.cfg.pedidosMax;
    if (sinMasSpawns && P.clientes.length === 0) finalizar();
  }
}

function finalizar() {
  if (P.terminado) return;
  P.terminado = true;
  const r = resumen();
  // Ranking global de Crunchy Munch: monedas + propinas del turno.
  // Silencioso si el backend está apagado; el juego nunca se rompe.
  if (typeof window !== 'undefined' && window.CrunchyScores) {
    window.CrunchyScores.submit('pasteleria', r.monedas + r.propinas);
  }
  emit('fin', r);
}

/* ---------- resumen y estrellas ---------- */
export function resumen() {
  const r = {
    modo: P.modo,
    dia: P.diaActual,
    monedas: Math.round(P.monedas),
    propinas: Math.round(P.propinas),
    galletasVendidas: P.galletasVendidas,
    pedidosPerfectos: P.pedidosPerfectos,
    pedidosAtendidos: P.pedidosAtendidos,
    clientesPerdidos: P.clientesPerdidos,
    objetivo: P.modo === 'dia' ? P.cfg.objetivo : null,
    estrellas: 0,
  };
  if (P.modo === 'dia') {
    const obj = P.cfg.objetivo;
    if (r.monedas >= obj) {
      if (r.clientesPerdidos === 0 && r.monedas >= Math.ceil(obj * 1.35)) r.estrellas = 3;
      else if (r.clientesPerdidos <= 1) r.estrellas = 2;
      else r.estrellas = 1;
    }
  }
  return r;
}

/* ═══════════════ ACCIONES DEL JUGADOR ═══════════════ */
function fx(tipo, msg = null, extra = {}) {
  emit('fx', { tipo, msg, ...extra });
}

export function accionMasa(masaId) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('masa', masaId)) return false;
  if (P.tabla) {
    fx('error', 'La tabla está ocupada');
    return false;
  }
  const masa = masaPorId(masaId);
  if (!masa) return false;
  P.tabla = {
    id: gid++,
    masa: masaId,
    toppings: [],
    deco: [],
    coccion: 'cruda',
    progresoHornoMs: 0,
    historial: [],
  };
  emit('tabla');
  fx('plop');
  emit('accion', { tipo: 'masa', dato: masaId });
  return true;
}

export function accionTopping(topId) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('topping', topId)) return false;
  const g = P.tabla;
  if (!g) { fx('error', 'Primero hornea una galleta'); return false; }
  if (g.coccion === 'cruda') { fx('error', 'Hornéala antes de decorar'); return false; }
  if (g.coccion === 'quemada') { fx('error', 'Está quemada: a la caneca'); return false; }
  /* Regla: la crema va SIEMPRE antes que los toppings (es la base). */
  if (!tieneGlaseado(g.deco)) { fx('error', 'La crema va primero: glasea antes del topping'); return false; }
  if (g.toppings.includes(topId)) { fx('error', 'Ya tiene ese topping'); return false; }
  g.toppings.push(topId);
  g.historial.push({ tipo: 'top', id: topId });
  emit('tabla');
  fx('chispa');
  emit('accion', { tipo: 'topping', dato: topId });
  return true;
}

export function accionDeco(decoId) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('deco', decoId)) return false;
  const g = P.tabla;
  if (!g) { fx('error', 'Primero pon una galleta en la tabla'); return false; }
  if (g.coccion === 'cruda') { fx('error', 'Hornéala antes de decorar'); return false; }
  if (g.coccion === 'quemada') { fx('error', 'Está quemada: a la caneca'); return false; }
  if (tieneGlaseado(g.deco)) { fx('error', 'Ya tiene crema'); return false; }
  g.deco.push(decoId);
  g.historial.push({ tipo: 'deco', id: decoId });
  emit('tabla');
  fx('glaseado');
  emit('accion', { tipo: 'deco', dato: decoId });
  return true;
}

export function accionDeshacer() {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('deshacer')) return false;
  const g = P.tabla;
  if (!g || g.historial.length === 0) { fx('error', 'Nada que deshacer'); return false; }
  const ultimo = g.historial[g.historial.length - 1];
  /* La crema es la base: no se puede quitar si aún tiene toppings encima. */
  if (ultimo.tipo === 'deco' && g.toppings.length) { fx('error', 'Quita primero los toppings'); return false; }
  g.historial.pop();
  if (ultimo.tipo === 'top') g.toppings = g.toppings.filter((t) => t !== ultimo.id);
  else g.deco = g.deco.filter((d) => d !== ultimo.id);
  emit('tabla');
  fx('pop');
  emit('accion', { tipo: 'deshacer' });
  return true;
}

export function accionHornear(idx, origen = 'tabla') {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('hornear', idx)) return false;
  const g = galletaEn(origen);
  if (!g) return false;
  if (g.coccion !== 'cruda') { fx('error', 'Esa galleta ya está horneada'); return false; }
  if (P.hornos[idx]) { fx('error', 'Ese puesto está ocupado'); return false; }
  quitarDe(origen);
  P.hornos[idx] = g;
  emitirOrigen(origen);
  emit('horno');
  fx('whoosh');
  emit('accion', { tipo: 'hornear', dato: idx });
  return true;
}

export function accionSacarHorno(idx) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('sacar', idx)) return false;
  const g = P.hornos[idx];
  if (!g) return false;
  const fase = faseHorno(g);
  /* decidir destino ANTES de mover */
  let destino = null;
  if (!P.tabla) destino = 'tabla';
  else {
    const libre = P.repisa.findIndex((s) => s === null);
    if (libre >= 0) destino = `repisa:${libre}`;
  }
  if (!destino) { fx('error', 'No hay espacio: libera la tabla o la repisa'); return false; }
  P.hornos[idx] = null;
  if (fase !== 'cruda') g.coccion = fase; // cruda conserva su progreso (perdón cozy)
  if (destino === 'tabla') P.tabla = g;
  else P.repisa[Number(destino.split(':')[1])] = g;
  emit('horno');
  emitirOrigen(destino);
  if (fase === 'quemada') fx('quemada', '¡Se quemó! Tírala a la caneca');
  else fx('pop');
  emit('accion', { tipo: 'sacar', dato: { idx, fase, destino } });
  return true;
}

export function accionMover(origen, destino) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('mover')) return false;
  const g = galletaEn(origen);
  if (!g) return false;
  if (destino === 'tabla') {
    if (P.tabla) return false;
    quitarDe(origen);
    P.tabla = g;
  } else if (destino.startsWith('repisa:')) {
    const i = Number(destino.split(':')[1]);
    if (P.repisa[i]) return false;
    quitarDe(origen);
    P.repisa[i] = g;
  } else return false;
  emitirOrigen(origen);
  emitirOrigen(destino);
  fx('pop');
  return true;
}

export function accionDescartar(origen) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('descartar')) return false;
  const g = quitarDe(origen);
  if (!g) return false;
  emitirOrigen(origen);
  fx('caneca');
  emit('accion', { tipo: 'descartar' });
  return true;
}

/* Igualdad exacta de sets */
function mismosSets(a, b) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export function accionEntregar(origen, clienteId) {
  if (!P || P.pausado || P.terminado) return false;
  if (!permitido('entregar', clienteId)) return false;
  const g = galletaEn(origen);
  const c = P.clientes.find((x) => x.id === Number(clienteId));
  if (!g || !c || c.estado !== 'esperando') return false;

  if (g.coccion === 'cruda') {
    fx('cruda', '¡Está cruda! Al horno primero');
    return false;
  }
  if (g.coccion === 'quemada') {
    c.pacienciaMs = Math.max(0, c.pacienciaMs - c.pacienciaMaxMs * 0.25);
    c.errorEntrega = true;
    P.combo = 0;
    emit('combo', P.combo);
    fx('rechazo', '¡Quemada! No la quiere', { clienteId: c.id });
    if (c.pacienciaMs <= 0) perderCliente(c);
    return false;
  }

  const item = c.pedido.items.find(
    (it) => !it.servido && it.masa === g.masa && mismosSets(it.toppings, g.toppings) && mismosSets(it.decoraciones, g.deco),
  );
  if (!item) {
    c.pacienciaMs = Math.max(0, c.pacienciaMs - c.pacienciaMaxMs * 0.1);
    c.errorEntrega = true;
    P.combo = 0;
    emit('combo', P.combo);
    fx('rechazo', 'No es lo que pidió', { clienteId: c.id });
    if (c.pacienciaMs <= 0) perderCliente(c);
    return false;
  }

  /* entrega válida */
  item.servido = true;
  const mult = g.coccion === 'pasada' ? 0.5 : 1;
  if (g.coccion !== 'perfecta') c.todasPerfectas = false;
  item.valorServido = valorItem(item) * mult;
  quitarDe(origen);
  emitirOrigen(origen);
  P.galletasVendidas++;
  emit('entrega:ok', { cliente: c, item });
  fx('whoosh');

  if (c.pedido.items.every((it) => it.servido)) cerrarPedido(c);
  return true;
}

function cerrarPedido(c) {
  P.pedidosAtendidos++;
  const perfecto = c.todasPerfectas && !c.errorEntrega;
  if (perfecto) {
    P.combo++;
    P.pedidosPerfectos++;
    emit('combo', P.combo);
  }
  const multCombo = P.combo >= 4 ? 3 : P.combo >= 2 ? 2 : 1;
  const pct = c.pacienciaMs / c.pacienciaMaxMs;
  const propinaPorGalleta = pct >= 0.66 ? 6 : pct >= 0.33 ? 3 : 0;
  let propinas = propinaPorGalleta * c.pedido.items.length * multCombo;
  let valor = c.pedido.items.reduce((s, it) => s + (it.valorServido || 0), 0);
  let total = valor + propinas;
  if (c.tipo === 'vip') { total *= 2; propinas *= 2; }
  total = Math.round(total);
  P.monedas += total;
  P.propinas += Math.round(propinas);
  c.estado = 'feliz';
  c.salidaMs = 900;
  emit('pago', { cliente: c, total, propinas: Math.round(propinas), multCombo });
  emit('hud');
}
