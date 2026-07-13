import { Injectable, computed, effect, signal } from '@angular/core';

// Cuenta del cliente (sesión ligera). Se guarda en el dispositivo (localStorage)
// y, si el backend está disponible, también se sincroniza con la base de datos
// (/api/cuentas) para premios/fidelidad. Si el backend falla, la sesión sigue
// funcionando localmente: la web nunca se rompe.
export interface Cuenta {
  nombre: string;
  edad: string;
  instagram: string;
  direccion: string;
  /** El usuario aceptó el tratamiento de datos (obligatorio para registrarse). */
  acepta: boolean;
  /** Trofeos de juegos (gamificación, aparte de la fidelidad). */
  puntos: number;
  /** Tarjeta de fidelidad: sellos actuales y tarjetas completadas. */
  sellos: number;
  tarjetas: number;
  /** Fecha (YYYY-MM-DD) del último sello (1 por día). */
  ultimoSello: string;
  /** Premio de estrellas (todos los juegos al 100%) ya reclamado. */
  premioEstrellas: boolean;
}

/** Estrellas para el premio maestro: todos los niveles al 100% (30+30+15+3+3). */
export const META_ESTRELLAS = 81;
/** COP que vale cada tarjeta de sellos completa. */
export const VALOR_TARJETA = 60000;

/** Premios del Crunchy Club por puntos (de menor a mayor). */
export interface Premio {
  pts: number;
  nombre: string;
  icono: string;
}
export const PREMIOS: Premio[] = [
  { pts: 150, nombre: 'Topping gratis', icono: '🍫' },
  { pts: 350, nombre: 'MiniCookie gratis', icono: '🍪' },
  { pts: 700, nombre: 'Milkshake gratis', icono: '🥤' },
  { pts: 1200, nombre: 'Combo Crunchy', icono: '🎁' },
];

const KEY = 'crunchy-cuenta-v1';
const KEY_JUGADOS = 'crunchy-jugados-v1';
const BONO_BIENVENIDA = 50;
const PUNTOS_POR_JUEGO = 10;

@Injectable({ providedIn: 'root' })
export class CuentaService {
  /** Cuenta activa, o null si no hay sesión. */
  readonly cuenta = signal<Cuenta | null>(this.cargar());

  /** Modal de registro/sesión visible. */
  readonly abierto = signal(false);

  /** Modo con el que se pidió abrir el modal ('registro' | 'login'). */
  readonly modoSolicitado = signal<'registro' | 'login'>('registro');

  readonly registrado = computed(() => this.cuenta() !== null);

  /** Primer nombre en mayúsculas para el saludo del hero ("HOLA PAULO"). */
  readonly primerNombre = computed(() => {
    const n = this.cuenta()?.nombre.trim() ?? '';
    return n ? n.split(/\s+/)[0].toUpperCase() : '';
  });

  /** Trofeos de juegos. */
  readonly puntos = computed(() => this.cuenta()?.puntos ?? 0);

  /** Fidelidad: sellos actuales, tarjetas completadas y meta (sellos por tarjeta). */
  readonly sellos = computed(() => this.cuenta()?.sellos ?? 0);
  readonly tarjetas = computed(() => this.cuenta()?.tarjetas ?? 0);
  readonly metaSellos = signal(10);
  /** Compra mínima (COP) para ganar un sello (configurable desde /admin). */
  readonly umbralCompra = signal(25000);

  /** Premio maestro de estrellas. */
  readonly metaEstrellas = META_ESTRELLAS;
  readonly premioEstrellasReclamado = computed(() => !!this.cuenta()?.premioEstrellas);

  /** Próximo premio por alcanzar (o el mayor si ya los tiene todos). */
  readonly siguientePremio = computed<Premio>(() => {
    const p = this.puntos();
    return PREMIOS.find((pr) => pr.pts > p) ?? PREMIOS[PREMIOS.length - 1];
  });

  /** Progreso (0–100) desde el premio anterior hacia el siguiente. */
  readonly progresoPremio = computed(() => {
    const p = this.puntos();
    const sig = this.siguientePremio();
    const previos = [...PREMIOS].reverse().find((pr) => pr.pts <= p)?.pts ?? 0;
    const rango = sig.pts - previos;
    if (rango <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round(((p - previos) / rango) * 100)));
  });

  /** Puntos que faltan para el siguiente premio. */
  readonly faltanPuntos = computed(() => Math.max(0, this.siguientePremio().pts - this.puntos()));

  constructor() {
    effect(() => {
      try {
        const c = this.cuenta();
        if (c) localStorage.setItem(KEY, JSON.stringify(c));
        else localStorage.removeItem(KEY);
      } catch {
        /* almacenamiento bloqueado: la sesión vive solo en memoria */
      }
    });
    // Al arrancar, sincroniza la fidelidad desde el servidor (si hay Instagram).
    void this.sincronizarFidelidad();
  }

  abrir(modo: 'registro' | 'login' = 'registro'): void {
    this.modoSolicitado.set(modo);
    this.abierto.set(true);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  /** Fija la sesión local a partir de una cuenta del servidor. */
  private setSesion(c: Partial<Cuenta> | null | undefined): void {
    if (!c) return;
    this.cuenta.set({
      nombre: (c.nombre ?? '').toString(),
      edad: (c.edad ?? '').toString(),
      instagram: (c.instagram ?? '').toString(),
      direccion: (c.direccion ?? '').toString(),
      acepta: !!c.acepta,
      puntos: Number(c.puntos) || 0,
      sellos: Number(c.sellos) || 0,
      tarjetas: Number(c.tarjetas) || 0,
      ultimoSello: (c.ultimoSello ?? '').toString(),
      premioEstrellas: !!c.premioEstrellas,
    });
  }

  /** Reclama un premio (crea un código de un solo uso que el vendedor confirma). */
  async reclamar(tipo: 'sellos' | 'estrellas'): Promise<{ ok: boolean; codigo?: string; descripcion?: string; error?: string }> {
    const c = this.cuenta();
    if (!c?.instagram) return { ok: false, error: 'Agrega tu Instagram para reclamar.' };
    try {
      const r = await fetch('/api/premios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagram: c.instagram, tipo }),
      });
      const d = (await r.json()) as { codigo?: string; descripcion?: string; error?: string };
      if (!r.ok) return { ok: false, error: d.error || 'No se pudo reclamar.' };
      await this.sincronizarFidelidad();
      return { ok: true, codigo: d.codigo, descripcion: d.descripcion };
    } catch {
      return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
    }
  }

  /** Crea la cuenta con código de 4 dígitos. No cierra el modal (muestra cuenta). */
  async registrar(
    c: { nombre: string; edad: string; instagram: string; direccion: string; acepta: boolean },
    pin: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const ig = this.normalizarIg(c.instagram);
    const cuerpo = {
      nombre: c.nombre.trim(),
      edad: String(c.edad ?? '').trim(),
      instagram: ig,
      direccion: String(c.direccion ?? '').trim(),
      acepta: !!c.acepta,
      pin,
    };
    try {
      const r = await fetch('/api/cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const d = (await r.json()) as { cuenta?: Partial<Cuenta>; error?: string };
      if (!r.ok) return { ok: false, error: d.error || 'No se pudo crear la cuenta.' };
      this.setSesion(d.cuenta);
      void this.sincronizarFidelidad();
      return { ok: true };
    } catch {
      // Sin conexión: crea sesión local para no bloquear (el código se guarda al reconectar).
      this.setSesion({ ...cuerpo, puntos: 0, sellos: 0, tarjetas: 0, ultimoSello: '' });
      return { ok: true };
    }
  }

  /** Inicia sesión con @instagram + código de 4 dígitos. */
  async iniciarSesion(instagram: string, pin: string): Promise<{ ok: boolean; error?: string }> {
    const ig = this.normalizarIg(instagram);
    try {
      const r = await fetch('/api/cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'login', instagram: ig, pin }),
      });
      const d = (await r.json()) as { cuenta?: Partial<Cuenta>; error?: string };
      if (!r.ok) return { ok: false, error: d.error || 'No se pudo iniciar sesión.' };
      this.setSesion(d.cuenta);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
    }
  }

  salir(): void {
    this.cuenta.set(null);
    this.abierto.set(false);
  }

  /** Suma puntos (o resta si es negativo) y sincroniza. */
  sumarPuntos(n: number): void {
    const c = this.cuenta();
    if (!c) return;
    const actualizada = { ...c, puntos: Math.max(0, (c.puntos ?? 0) + n) };
    this.cuenta.set(actualizada);
    void this.sincronizar(actualizada);
  }

  /**
   * Premio por jugar un minijuego: +10 puntos, UNA vez por juego por día
   * (evita farmear abriendo y cerrando). Devuelve los puntos otorgados (0 si ya
   * los ganó hoy o no hay sesión).
   */
  premioPorJugar(gameId: string): number {
    if (!this.registrado()) return 0;
    const hoy = new Date().toISOString().slice(0, 10);
    const marca = `${gameId}|${hoy}`;
    let set: string[] = [];
    try {
      set = JSON.parse(localStorage.getItem(KEY_JUGADOS) || '[]');
    } catch {
      set = [];
    }
    if (set.includes(marca)) return 0;
    set.push(marca);
    try {
      localStorage.setItem(KEY_JUGADOS, JSON.stringify(set.slice(-80)));
    } catch {
      /* ignore */
    }
    this.sumarPuntos(PUNTOS_POR_JUEGO);
    return PUNTOS_POR_JUEGO;
  }

  /** Agrega/actualiza el Instagram de la cuenta (necesario para la fidelidad). */
  agregarInstagram(ig: string): void {
    const c = this.cuenta();
    if (!c) return;
    const norm = this.normalizarIg(ig);
    if (!norm) return;
    const upd = { ...c, instagram: norm };
    this.cuenta.set(upd);
    void this.sincronizar(upd);
    void this.sincronizarFidelidad();
  }

  /** Trae el estado de fidelidad desde el servidor (autoritativo). */
  async sincronizarFidelidad(): Promise<void> {
    const c = this.cuenta();
    if (!c?.instagram) return;
    try {
      const r = await fetch(`/api/fidelidad?ig=${encodeURIComponent(c.instagram)}`);
      if (!r.ok) return;
      const d = (await r.json()) as {
        sellos?: number; tarjetas?: number; estrellas?: number; premioEstrellas?: boolean;
        meta?: number; umbral?: number;
      };
      if (typeof d.meta === 'number') this.metaSellos.set(d.meta);
      if (typeof d.umbral === 'number') this.umbralCompra.set(d.umbral);
      const actual = this.cuenta();
      if (actual) {
        this.cuenta.set({
          ...actual,
          sellos: d.sellos ?? actual.sellos,
          tarjetas: d.tarjetas ?? actual.tarjetas,
          puntos: d.estrellas ?? actual.puntos,
          premioEstrellas: d.premioEstrellas ?? actual.premioEstrellas,
        });
      }
    } catch {
      /* sin conexión: se quedan los valores locales */
    }
  }

  /** Canjea el código del día por 1 sello. Devuelve resultado para la UI. */
  async redimir(codigo: string): Promise<{ ok: boolean; mensaje: string; premio?: boolean }> {
    const c = this.cuenta();
    if (!c) return { ok: false, mensaje: 'Inicia sesión primero.' };
    if (!c.instagram) return { ok: false, mensaje: 'Agrega tu Instagram para activar tu tarjeta.' };
    const code = (codigo || '').trim().toUpperCase();
    if (!code) return { ok: false, mensaje: 'Escribe el código.' };
    try {
      const r = await fetch('/api/fidelidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagram: c.instagram, codigo: code }),
      });
      const d = (await r.json()) as { sellos?: number; tarjetas?: number; meta?: number; premio?: boolean; error?: string };
      if (typeof d.meta === 'number') this.metaSellos.set(d.meta);
      if (typeof d.sellos === 'number') {
        this.cuenta.set({ ...c, sellos: d.sellos, tarjetas: d.tarjetas ?? c.tarjetas });
      }
      if (!r.ok) return { ok: false, mensaje: d.error || 'No se pudo canjear.' };
      return { ok: true, mensaje: d.premio ? '¡Completaste la tarjeta! 🎉' : '¡+1 sello! 💗', premio: d.premio };
    } catch {
      return { ok: false, mensaje: 'Sin conexión. Intenta de nuevo.' };
    }
  }

  private normalizarIg(s: string): string {
    const v = (s || '').trim().replace(/^@+/, '').replace(/\s+/g, '');
    return v ? '@' + v.toLowerCase() : '';
  }

  private async sincronizar(c: Cuenta): Promise<void> {
    try {
      await fetch('/api/cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
    } catch {
      /* sin conexión: la cuenta ya quedó guardada en el dispositivo */
    }
  }

  private cargar(): Cuenta | null {
    try {
      const c = localStorage.getItem(KEY);
      if (!c) return null;
      const obj = JSON.parse(c) as Cuenta;
      // Compatibilidad con versiones previas.
      if (typeof obj.puntos !== 'number') obj.puntos = 0;
      if (typeof obj.sellos !== 'number') obj.sellos = 0;
      if (typeof obj.tarjetas !== 'number') obj.tarjetas = 0;
      if (typeof obj.ultimoSello !== 'string') obj.ultimoSello = '';
      if (typeof obj.premioEstrellas !== 'boolean') obj.premioEstrellas = false;
      return obj;
    } catch {
      return null;
    }
  }
}
