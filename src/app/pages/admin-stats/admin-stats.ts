import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GAMES } from '../../games';
import { formatoCOP } from '../../carrito';

// Panel de estadísticas y manejo (/admin/estadisticas). Diseño propio, distinto
// al resto del panel: un "centro de control" oscuro con métricas en vivo.
// Reutiliza la misma clave de admin guardada por la pantalla de /admin.
const KEY_TOKEN = 'cm-admin-token';

type Rango = 'dia' | 'semana' | 'mes' | 'anio';

interface Barra {
  etiqueta: string;
  valor: number;
  alto: number; // 0..100 (%)
  sub?: string;
}

interface ItemPedido {
  nombre: string;
  cantidad: number;
  precioUnit: number;
}
interface Pedido {
  codigo: string;
  instagram: string;
  nombre: string;
  telefono: string;
  sede: string;
  entrega: string;
  pago: string;
  direccion: string;
  referencia: string;
  notas: string;
  items: ItemPedido[];
  subtotal: number;
  descuento: number;
  total: number;
  cupon: boolean;
  createdAt: string;
}
interface CuentaCliente {
  nombre: string;
  edad: string;
  instagram: string;
  direccion: string;
  puntos: number;
  sellos: number;
  tarjetas: number;
  cuponUsado: boolean;
  creada: string | null;
}
interface Lookup {
  pedido: Pedido;
  cuenta: CuentaCliente | null;
  historial: Pedido[];
  totalPedidos: number;
}

interface Stats {
  usuarios: { total: number; conInstagram: number };
  jugadores: { total: number };
  juegos: { gameId: string; jugadores: number; estrellas: number; partidas: number }[];
  ranking: { instagram: string; estrellas: number; juegos: number }[];
  trafico: {
    totalVisitas: number;
    enVivo: number;
    visitasHoy: number;
    visitantesHoy: number;
    porDia: { dia: string; n: number; sesiones: number }[];
    porSemana: { semana: string; n: number; sesiones: number }[];
    porMes: { mes: string; n: number; sesiones: number }[];
    porAnio: { anio: string; n: number; sesiones: number }[];
  };
  pedidos: {
    total: number;
    hoy: number;
    ingresos: number;
    ticketPromedio: number;
    porDia: { dia: string; n: number; ingresos: number }[];
  };
  generado: string;
}

@Component({
  selector: 'app-admin-stats',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.css',
})
export class AdminStats implements OnDestroy {
  readonly formatoCOP = formatoCOP;
  private readonly juegosMap = new Map(GAMES.map((g) => [g.id, g]));

  readonly token = signal<string | null>(this.leerToken());
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly stats = signal<Stats | null>(null);
  readonly rango = signal<Rango>('dia');
  readonly actualizado = signal<string>('');

  // Buscador por código de pedido
  readonly codigoInput = signal('');
  readonly buscando = signal(false);
  readonly lookupError = signal('');
  readonly resultado = signal<Lookup | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (this.token()) {
      void this.cargar();
      // Refresco "en vivo" cada 30 s (solo métricas, no el buscador).
      this.timer = setInterval(() => void this.cargar(true), 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  nombreJuego(id: string): string {
    return this.juegosMap.get(id)?.name ?? id;
  }
  iconoJuego(id: string): string {
    return this.juegosMap.get(id)?.icon ?? '🎮';
  }

  /** Estrellas máximas de un juego (para el % de progreso). */
  maxEstrellas(id: string): number {
    return this.juegosMap.get(id)?.maxEstrellas ?? 0;
  }

  /** Barras del gráfico de tráfico según el rango elegido. */
  readonly barras = computed<Barra[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const r = this.rango();
    const fuente =
      r === 'dia'
        ? s.trafico.porDia.slice(-30).map((d) => ({ k: d.dia, v: d.n, s: d.sesiones }))
        : r === 'semana'
          ? s.trafico.porSemana.slice(-12).map((d) => ({ k: d.semana, v: d.n, s: d.sesiones }))
          : r === 'mes'
            ? s.trafico.porMes.slice(-12).map((d) => ({ k: d.mes, v: d.n, s: d.sesiones }))
            : s.trafico.porAnio.map((d) => ({ k: d.anio, v: d.n, s: d.sesiones }));
    const max = Math.max(1, ...fuente.map((f) => f.v));
    return fuente.map((f) => ({
      etiqueta: this.etiqueta(f.k, r),
      valor: f.v,
      alto: Math.round((f.v / max) * 100),
      sub: `${f.s} visit.`,
    }));
  });

  /** Ingresos por día (últimos 14) para el mini-gráfico de ventas. */
  readonly barrasPedidos = computed<Barra[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const fuente = s.pedidos.porDia.slice(-14);
    const max = Math.max(1, ...fuente.map((d) => d.ingresos));
    return fuente.map((d) => ({
      etiqueta: this.etiqueta(d.dia, 'dia'),
      valor: d.ingresos,
      alto: Math.round((d.ingresos / max) * 100),
      sub: `${d.n} ped.`,
    }));
  });

  private etiqueta(clave: string, r: Rango): string {
    if (r === 'anio') return clave;
    if (r === 'semana') {
      // clave "2026-28" (año-semana ISO) -> "S28"
      const [, w] = clave.split('-');
      return w ? `S${Number(w)}` : clave;
    }
    if (r === 'mes') {
      const [, m] = clave.split('-');
      const meses = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      return meses[Number(m)] ?? clave;
    }
    const [, , d] = clave.split('-');
    return d ?? clave;
  }

  private cabeceras(extra?: Record<string, string>): Record<string, string> {
    return { 'x-admin-token': this.token() ?? '', ...extra };
  }

  async cargar(silencioso = false): Promise<void> {
    if (!silencioso) {
      this.cargando.set(true);
      this.error.set('');
    }
    let r: Response;
    try {
      r = await fetch('/api/estadisticas', { headers: this.cabeceras() });
    } catch {
      this.cargando.set(false);
      if (!silencioso) this.error.set('Sin conexión con el servidor.');
      return;
    }
    this.cargando.set(false);
    if (r.status === 401) {
      this.token.set(null);
      this.error.set('Tu sesión de administrador expiró. Vuelve a entrar desde el panel.');
      return;
    }
    if (!r.ok) {
      if (!silencioso) this.error.set('No se pudieron cargar las estadísticas.');
      return;
    }
    this.stats.set((await r.json()) as Stats);
    this.actualizado.set(
      new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()),
    );
  }

  async buscar(): Promise<void> {
    const codigo = this.codigoInput().trim().toUpperCase();
    this.lookupError.set('');
    this.resultado.set(null);
    if (!codigo) {
      this.lookupError.set('Escribe un código de pedido.');
      return;
    }
    this.buscando.set(true);
    let r: Response;
    try {
      r = await fetch(`/api/pedidos?codigo=${encodeURIComponent(codigo)}`, { headers: this.cabeceras() });
    } catch {
      this.buscando.set(false);
      this.lookupError.set('Sin conexión con el servidor.');
      return;
    }
    this.buscando.set(false);
    if (r.status === 401) {
      this.token.set(null);
      this.lookupError.set('Tu sesión de administrador expiró.');
      return;
    }
    if (r.status === 404) {
      this.lookupError.set('No hay ningún pedido con ese código.');
      return;
    }
    if (!r.ok) {
      this.lookupError.set('No se pudo buscar el pedido.');
      return;
    }
    this.resultado.set((await r.json()) as Lookup);
  }

  fecha(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private leerToken(): string | null {
    try {
      return localStorage.getItem(KEY_TOKEN);
    } catch {
      return null;
    }
  }
}
