import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CuentaService } from './cuenta.service';

// Analítica ligera: por cada navegación, avisa al servidor (/api/estadisticas)
// para alimentar el tráfico del panel. Usa un id anónimo por navegador
// (sessionId) que NO identifica a la persona; solo cuenta visitantes únicos.
// Si el backend no está o falla, no pasa nada: la web sigue igual.
const KEY_SID = 'cm-sid';

@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private readonly router = inject(Router);
  private readonly cuenta = inject(CuentaService);
  private readonly sid = this.cargarSid();

  /** Arranca el seguimiento de navegación (se llama una vez al iniciar la app). */
  iniciar(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.registrar(e.urlAfterRedirects || e.url));
  }

  private registrar(path: string): void {
    // No registramos el propio panel de administración.
    if (path.startsWith('/admin')) return;
    try {
      void fetch('/api/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          sessionId: this.sid,
          path: path.split('?')[0].slice(0, 120),
          registrado: this.cuenta.registrado(),
        }),
      });
    } catch {
      /* sin conexión: se ignora */
    }
  }

  private cargarSid(): string {
    try {
      let s = localStorage.getItem(KEY_SID);
      if (!s) {
        s = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(KEY_SID, s);
      }
      return s;
    } catch {
      return 's_anon';
    }
  }
}
