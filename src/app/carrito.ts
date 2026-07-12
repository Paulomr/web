import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PRODUCTOS, Producto, WHATSAPP_SEDES } from './productos';
import { ProductosService } from './productos.service';

// Carrito de pedidos: estado global con signals, persistido en localStorage.
// El "checkout" no cobra: arma el pedido completo y lo envía por WhatsApp,
// que es el canal real de ventas del negocio.

export interface ItemCarrito {
  id: string;
  cantidad: number;
}

export type Entrega = 'domicilio' | 'recoger';
export type Pago = 'efectivo' | 'transferencia';
export type Sede = 'san-antonio' | 'marinilla';

export interface DatosPedido {
  entrega: Entrega;
  sede: Sede;
  pago: Pago;
  nombre: string;
  telefono: string;
  direccion: string;
  notas: string;
}

const KEY = 'crunchy-carrito-v1';

const SEDES: Record<Sede, string> = {
  'san-antonio': 'SEDE SAN ANTONIO (SAN ANTONIO DE PEREIRA, RIONEGRO)',
  marinilla: 'SEDE MARINILLA',
};

@Injectable({ providedIn: 'root' })
export class Carrito {
  readonly items = signal<ItemCarrito[]>(this.cargar());
  readonly abierto = signal(false);

  /** Último aviso "añadido al carrito" (lo escucha el toast global). */
  readonly notificacion = signal<{ nonce: number; texto: string } | null>(null);

  readonly datos = signal<DatosPedido>({
    entrega: 'domicilio',
    sede: 'san-antonio',
    pago: 'efectivo',
    nombre: '',
    telefono: '',
    direccion: '',
    notas: '',
  });

  /** Cantidad total de unidades (para el contador del botón flotante). */
  readonly unidades = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));

  /** Total en pesos de los productos con precio; los sin precio van aparte. */
  readonly total = computed(() =>
    this.items().reduce((s, i) => s + precioNumero(this.producto(i.id)) * i.cantidad, 0),
  );

  /** ¿Hay ítems sin precio definido (se cotizan por WhatsApp)? */
  readonly hayConsultar = computed(() =>
    this.items().some((i) => precioNumero(this.producto(i.id)) === 0),
  );

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.items()));
      } catch {
        /* almacenamiento bloqueado: el carrito vive solo en memoria */
      }
    });
  }

  private readonly productosSvc = inject(ProductosService);

  producto(id: string): Producto | undefined {
    return this.productosSvc.porId(id);
  }

  agregar(id: string): void {
    this.items.update((lista) => {
      const existe = lista.find((i) => i.id === id);
      return existe
        ? lista.map((i) => (i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...lista, { id, cantidad: 1 }];
    });
    // Dispara el aviso flotante (nonce único para reactivarlo aunque el texto
    // se repita al agregar varias veces seguidas).
    this.notificacion.set({ nonce: Date.now(), texto: 'AÑADIDO AL CARRITO' });
  }

  restar(id: string): void {
    this.items.update((lista) =>
      lista
        .map((i) => (i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    );
  }

  quitar(id: string): void {
    this.items.update((lista) => lista.filter((i) => i.id !== id));
  }

  vaciar(): void {
    this.items.set([]);
  }

  actualizarDatos(parte: Partial<DatosPedido>): void {
    this.datos.update((d) => ({ ...d, ...parte }));
  }

  /** ¿El formulario está completo para enviar? */
  puedeEnviar(): boolean {
    const d = this.datos();
    if (this.items().length === 0) return false;
    if (!d.nombre.trim() || !d.telefono.trim()) return false;
    if (d.entrega === 'domicilio' && !d.direccion.trim()) return false;
    return true;
  }

  /** Enlace de WhatsApp con el pedido completo formateado. */
  linkPedido(): string {
    const d = this.datos();
    const lineas: string[] = ['*NUEVO PEDIDO — CRUNCHY MUNCH*', ''];

    for (const i of this.items()) {
      const p = this.producto(i.id);
      if (!p) continue;
      const precio = precioNumero(p);
      const sub = precio > 0 ? ` — ${formatoCOP(precio * i.cantidad)}` : ' — (CONSULTAR)';
      lineas.push(`• ${i.cantidad} x ${p.nombre}${sub}`);
    }

    lineas.push('');
    lineas.push(`TOTAL: ${formatoCOP(this.total())}${this.hayConsultar() ? ' + ÍTEMS POR CONSULTAR' : ''}`);
    lineas.push('');
    lineas.push(`SEDE: ${SEDES[d.sede]}`);
    if (d.entrega === 'domicilio') {
      lineas.push('ENTREGA: A DOMICILIO');
      lineas.push(`DIRECCIÓN: ${d.direccion.trim()}`);
    } else {
      lineas.push('ENTREGA: RECOGER EN TIENDA');
    }
    lineas.push(`PAGO: ${d.pago === 'efectivo' ? 'EFECTIVO' : 'TRANSFERENCIA'}`);
    lineas.push('');
    lineas.push(`NOMBRE: ${d.nombre.trim()}`);
    lineas.push(`TELÉFONO: ${d.telefono.trim()}`);
    if (d.notas.trim()) lineas.push(`NOTAS: ${d.notas.trim()}`);

    return `https://wa.me/${WHATSAPP_SEDES[d.sede]}?text=${encodeURIComponent(lineas.join('\n'))}`;
  }

  private cargar(): ItemCarrito[] {
    try {
      const crudo = localStorage.getItem(KEY);
      if (!crudo) return [];
      const lista = JSON.parse(crudo) as ItemCarrito[];
      // Solo ítems que sigan existiendo en el catálogo.
      return lista.filter((i) => PRODUCTOS.some((p) => p.id === i.id) && i.cantidad > 0);
    } catch {
      return [];
    }
  }
}

export function precioNumero(p: Producto | undefined): number {
  if (!p?.precio) return 0;
  const digitos = p.precio.replace(/[^\d]/g, '');
  return digitos ? parseInt(digitos, 10) : 0;
}

export function formatoCOP(valor: number): string {
  return '$ ' + valor.toLocaleString('es-CO');
}
