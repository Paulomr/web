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
    const limpio: Cuenta = {
      nombre: c.nombre.trim(),
      edad: c.edad.trim(),
      instagram: this.normalizarIg(c.instagram),
      direccion: c.direccion.trim(),
      acepta: !!c.acepta,
    };
    // No cerramos el modal: pasa a la vista de cuenta ("HOLA X"), que es la
    // confirmación visible de "cuenta creada". El usuario cierra con el botón.
    this.cuenta.set(limpio);
    // Sincroniza con la base en segundo plano (best-effort).
    void this.sincronizar(limpio);
  }

  salir(): void {
    this.cuenta.set(null);
    this.abierto.set(false);
  }

  /** Normaliza el usuario de Instagram: sin @ repetidos ni espacios, en minúsculas. */
  private normalizarIg(s: string): string {
    const v = (s || '').trim().replace(/^@+/, '').replace(/\s+/g, '');
    return v ? '@' + v.toLowerCase() : '';
  }

  /** Guarda la cuenta en la base de datos. Silencioso si el backend está apagado. */
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
      return c ? (JSON.parse(c) as Cuenta) : null;
    } catch {
      return null;
    }
  }
}
