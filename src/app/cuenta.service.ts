import { Injectable, computed, effect, signal } from '@angular/core';

// Cuenta del cliente (sesión ligera). Por ahora vive SOLO en este dispositivo
// (localStorage): no se envía a ningún servidor todavía. Cuando exista el
// backend de fidelidad/premios (tras el pase de seguridad), aquí se sincroniza.
export interface Cuenta {
  nombre: string;
  edad: string;
  identificacion: string;
  direccion: string;
}

const KEY = 'crunchy-cuenta-v1';

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

  registrar(c: Cuenta): void {
    this.cuenta.set({
      nombre: c.nombre.trim(),
      edad: c.edad.trim(),
      identificacion: c.identificacion.trim(),
      direccion: c.direccion.trim(),
    });
    this.abierto.set(false);
  }

  salir(): void {
    this.cuenta.set(null);
    this.abierto.set(false);
  }

  private cargar(): Cuenta | null {
    try {
      const c = localStorage.getItem(KEY);
      return c ? (JSON.parse(c) as Cuenta) : null;
    } catch {
      return null;
    }
  }
}
