import { Injectable, signal } from '@angular/core';

// Textos editables del sitio (títulos/subtítulos). La clave es interna; el
// label es lo que ve Paulo en el panel.
export const CAMPOS_TEXTO: { clave: string; label: string }[] = [
  { clave: 'heroTitulo', label: 'Hero — título grande' },
  { clave: 'heroLinea1', label: 'Hero — línea 1' },
  { clave: 'heroLinea2', label: 'Hero — línea 2' },
  { clave: 'menuTitulo', label: 'Título “Nuestro menú”' },
  { clave: 'sedesTitulo', label: 'Título “Sedes”' },
  { clave: 'mundoTitulo', label: 'Título “El mundo Crunchy Munch”' },
  { clave: 'mundoTexto', label: 'Texto bajo “El mundo…”' },
];

// Valores por defecto: si la base no responde, la web se ve igual que hoy.
export const DEFAULT_TEXTOS: Record<string, string> = {
  heroTitulo: 'CRUNCHY MUNCH',
  heroLinea1: 'NEW YORK STYLE COOKIES',
  heroLinea2: 'SAN ANTONIO · MARINILLA',
  menuTitulo: 'NUESTRO MENÚ',
  sedesTitulo: 'SEDES',
  mundoTitulo: 'EL MUNDO CRUNCHY MUNCH',
  mundoTexto:
    'Nuestras tiendas rosas, mucha crema, perritos invitados y una anfitriona inolvidable: Bearnie, la osa de la marca.',
};

// Configuración editable del sitio: textos y qué minijuegos se muestran.
// Arranca con los valores por defecto; en segundo plano trae los de la base.
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  readonly textos = signal<Record<string, string>>({ ...DEFAULT_TEXTOS });
  readonly juegos = signal<Record<string, boolean>>({});

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      const r = await fetch('/api/config');
      if (!r.ok) return;
      const c = (await r.json()) as { textos?: Record<string, string>; juegos?: Record<string, boolean> };
      if (c && typeof c === 'object') {
        if (c.textos) this.textos.set({ ...DEFAULT_TEXTOS, ...c.textos });
        if (c.juegos) this.juegos.set(c.juegos);
      }
    } catch {
      /* sin conexión: se quedan los valores por defecto */
    }
  }

  texto(clave: string): string {
    return this.textos()[clave] ?? DEFAULT_TEXTOS[clave] ?? '';
  }

  /** Un minijuego se muestra salvo que esté explícitamente en false. */
  juegoActivo(id: string): boolean {
    return this.juegos()[id] !== false;
  }
}
