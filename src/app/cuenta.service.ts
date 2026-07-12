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
  /** Puntos Crunchy acumulados (fidelidad). */
  puntos: number;
}

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

  readonly registrado = computed(() => this.cuenta() !== null);

  /** Primer nombre en mayúsculas para el saludo del hero ("HOLA PAULO"). */
  readonly primerNombre = computed(() => {
    const n = this.cuenta()?.nombre.trim() ?? '';
    return n ? n.split(/\s+/)[0].toUpperCase() : '';
  });

  /** Puntos Crunchy actuales. */
  readonly puntos = computed(() => this.cuenta()?.puntos ?? 0);

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
  }

  abrir(): void {
    this.abierto.set(true);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  registrar(c: Omit<Cuenta, 'puntos'>): void {
    const previos = this.cuenta()?.puntos ?? 0;
    const limpio: Cuenta = {
      nombre: c.nombre.trim(),
      edad: c.edad.trim(),
      instagram: this.normalizarIg(c.instagram),
      direccion: c.direccion.trim(),
      acepta: !!c.acepta,
      // Bono de bienvenida solo para cuentas nuevas.
      puntos: previos > 0 ? previos : BONO_BIENVENIDA,
    };
    // No cerramos el modal: pasa a la vista de cuenta ("HOLA X"), que es la
    // confirmación visible de "cuenta creada". El usuario cierra con el botón.
    this.cuenta.set(limpio);
    void this.sincronizar(limpio);
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
      if (typeof obj.puntos !== 'number') obj.puntos = 0; // compat con versiones previas
      return obj;
    } catch {
      return null;
    }
  }
}
