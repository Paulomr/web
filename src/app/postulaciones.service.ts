import { Injectable, computed, inject, signal } from '@angular/core';
import { CuentaService } from './cuenta.service';
import {
  NuevaPostulacion,
  Postulacion,
  TOP_VOTADOS,
  normalizarIg,
} from './postulaciones';

// Fuente única de las postulaciones para toda la web.
//
// La comparten el recuadro de votados del hero y la página /postula, así que
// la lista se pide UNA vez y las dos piezas leen la misma señal. Si el
// servidor no responde, se queda vacía y cada pieza decide si se esconde: una
// convocatoria sin datos no debe romper la portada.
@Injectable({ providedIn: 'root' })
export class PostulacionesService {
  private readonly cuenta = inject(CuentaService);

  /** Aprobadas, ya ordenadas por votos (lo ordena el servidor). */
  readonly lista = signal<Postulacion[]>([]);

  /** id de la postulación que votó esta cuenta, o '' si no ha votado. */
  readonly miVoto = signal('');

  /** true cuando ya se intentó cargar (para distinguir "vacío" de "cargando"). */
  readonly cargado = signal(false);

  /** Los que salen en la portada. */
  readonly top = computed(() => this.lista().slice(0, TOP_VOTADOS));

  /** Total de votos emitidos, para el pie del recuadro. */
  readonly totalVotos = computed(() => this.lista().reduce((s, p) => s + p.votos, 0));

  private pidiendo: Promise<void> | null = null;

  /**
   * Carga la lista una sola vez por sesión. Varias piezas la piden a la vez al
   * arrancar la portada; sin este candado saldrían dos o tres peticiones
   * iguales compitiendo por pintar lo mismo.
   */
  cargar(): Promise<void> {
    if (this.pidiendo) return this.pidiendo;
    this.pidiendo = this.pedir();
    return this.pidiendo;
  }

  /** Vuelve a pedir la lista de verdad (tras votar o postular). */
  refrescar(): Promise<void> {
    this.pidiendo = this.pedir();
    return this.pidiendo;
  }

  private async pedir(): Promise<void> {
    try {
      const ig = this.cuenta.cuenta()?.instagram ?? '';
      const url = '/api/postulaciones' + (ig ? '?ig=' + encodeURIComponent(ig) : '');
      const r = await fetch(url);
      if (!r.ok) return;
      const d = (await r.json()) as { postulaciones?: Postulacion[]; miVoto?: string };
      if (Array.isArray(d.postulaciones)) this.lista.set(d.postulaciones);
      this.miVoto.set(d.miVoto ?? '');
    } catch {
      /* sin conexión: la lista se queda como estaba y cada pieza se esconde */
    } finally {
      this.cargado.set(true);
    }
  }

  /**
   * Envía una postulación nueva. Queda en revisión: no aparece en la web
   * hasta que se aprueba desde /admin.
   */
  async postular(p: NuevaPostulacion): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, instagram: normalizarIg(p.instagram) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: d.error || 'No se pudo enviar. Intenta de nuevo.' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sin conexión. Revisa tus datos e intenta otra vez.' };
    }
  }

  /**
   * Vota por un negocio. Hace falta cuenta (@instagram + código de 4 dígitos):
   * es lo único que impide que una sola persona infle el conteo.
   * Votar otra vez mueve el voto, no lo suma.
   */
  async votar(id: string, pin: string): Promise<{ ok: boolean; error?: string }> {
    const c = this.cuenta.cuenta();
    if (!c?.instagram) return { ok: false, error: 'Inicia sesión para votar.' };
    try {
      const r = await fetch('/api/postulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'votar', id, instagram: c.instagram, pin }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: d.error || 'No se pudo registrar tu voto.' };
      await this.refrescar();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sin conexión. Intenta otra vez.' };
    }
  }
}
