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

export interface SedeHorario {
  dias: string;
  horas: string;
}
export interface SedeEspecial {
  fecha: string;
  nota: string;
}
export interface SedeCfg {
  id: string;
  nombre: string;
  horarios: SedeHorario[];
  especiales: SedeEspecial[];
}

// Horarios por defecto de cada sede (respaldo si la base no responde).
export const DEFAULT_SEDES: SedeCfg[] = [
  {
    id: 'san-antonio',
    nombre: 'SEDE SAN ANTONIO',
    horarios: [{ dias: 'Lunes a domingo y festivos', horas: '12:00 m – 8:00 pm' }],
    especiales: [],
  },
  {
    id: 'marinilla',
    nombre: 'SEDE MARINILLA',
    horarios: [
      { dias: 'Lunes', horas: '12:00 m – 6:30 pm' },
      { dias: 'Martes a sábado', horas: '12:00 m – 7:00 pm' },
      { dias: 'Domingos y festivos', horas: '12:00 m – 6:30 pm' },
    ],
    especiales: [],
  },
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
  readonly sedes = signal<SedeCfg[]>(DEFAULT_SEDES);

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      const r = await fetch('/api/config');
      if (!r.ok) return;
      const c = (await r.json()) as {
        textos?: Record<string, string>;
        juegos?: Record<string, boolean>;
        sedes?: SedeCfg[];
      };
      if (c && typeof c === 'object') {
        if (c.textos) this.textos.set({ ...DEFAULT_TEXTOS, ...c.textos });
        if (c.juegos) this.juegos.set(c.juegos);
        if (Array.isArray(c.sedes) && c.sedes.length) {
          // Toma lo guardado por sede; si falta una, usa su valor por defecto.
          this.sedes.set(
            DEFAULT_SEDES.map((d) => {
              const s = c.sedes!.find((x) => x?.id === d.id);
              return s
                ? {
                    id: d.id,
                    nombre: d.nombre,
                    horarios: s.horarios?.length ? s.horarios : d.horarios,
                    especiales: s.especiales ?? [],
                  }
                : d;
            }),
          );
        }
      }
    } catch {
      /* sin conexión: se quedan los valores por defecto */
    }
  }

  /** Datos (horarios + especiales) de una sede por id. */
  sede(id: string): SedeCfg {
    return this.sedes().find((s) => s.id === id) ?? DEFAULT_SEDES.find((s) => s.id === id)!;
  }

  texto(clave: string): string {
    return this.textos()[clave] ?? DEFAULT_TEXTOS[clave] ?? '';
  }

  /** Un minijuego se muestra salvo que esté explícitamente en false. */
  juegoActivo(id: string): boolean {
    return this.juegos()[id] !== false;
  }
}
