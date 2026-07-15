import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PRODUCTOS, Producto, WHATSAPP_SEDES } from './productos';
import { ProductosService } from './productos.service';
import { CuentaService } from './cuenta.service';

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
  /** Punto de referencia / sector / nombre del lugar (para domicilios). */
  referencia: string;
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

  /** Código del último pedido generado (para registrarlo al confirmar el envío). */
  private codigoActual = '';

  readonly datos = signal<DatosPedido>({
    entrega: 'domicilio',
    sede: 'san-antonio',
    pago: 'efectivo',
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
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

  /** Cupón de bienvenida 18% aplicable (cuenta con cupón disponible + hay total). */
  readonly cuponAplicado = computed(() => this.cuenta.cuponDisponible() && this.total() > 0);
  /** Descuento en pesos (18% del total con precio). */
  readonly descuento = computed(() => (this.cuponAplicado() ? Math.round(this.total() * 0.18) : 0));
  /** Total a pagar tras el cupón. */
  readonly totalFinal = computed(() => Math.max(0, this.total() - this.descuento()));

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
  private readonly cuenta = inject(CuentaService);

  producto(id: string): Producto | undefined {
    return this.productosSvc.porId(id);
  }

  agregar(id: string): void {
    const eraVacio = this.items().length === 0;
    this.items.update((lista) => {
      const existe = lista.find((i) => i.id === id);
      return existe
        ? lista.map((i) => (i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...lista, { id, cantidad: 1 }];
    });
    // Dispara el aviso flotante (nonce único para reactivarlo aunque el texto
    // se repita al agregar varias veces seguidas).
    this.notificacion.set({ nonce: Date.now(), texto: 'AÑADIDO AL CARRITO' });
    // Con la PRIMERA galleta del carrito, invita a crear cuenta (una sola vez).
    if (eraVacio && !this.cuenta.registrado()) this.cuenta.abrir();
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
    // Iniciar sesión es obligatorio para pedir (identifica al cliente y aplica el cupón).
    if (!this.cuenta.registrado()) return false;
    if (this.items().length === 0) return false;
    if (!d.nombre.trim() || !d.telefono.trim()) return false;
    if (d.entrega === 'domicilio' && !d.direccion.trim()) return false;
    return true;
  }

  /** Enlace de WhatsApp con el pedido formateado y decorado. */
  linkPedido(): string {
    const d = this.datos();
    const c = this.cuenta.cuenta();
    const reg = this.cuenta.registrado();
    // Un código nuevo por envío; se reutiliza al registrar el pedido en la base.
    const codigo = (this.codigoActual = this.nuevoCodigo());
    const barra = '━━━━━━━━━━━━━━━';
    const L: string[] = [];

    L.push('🍪🍪🍪 *CRUNCHY MUNCH* 🍪🍪🍪');
    L.push(`🧾 *PEDIDO*  ·  Código del pedido: *${codigo}*`);

    // ── Bloque 1: el pedido ──
    L.push(barra);
    L.push('🛒 *TU PEDIDO*');
    for (const i of this.items()) {
      const p = this.producto(i.id);
      if (!p) continue;
      const precio = precioNumero(p);
      const sub = precio > 0 ? `— ${formatoCOP(precio * i.cantidad)}` : '— (a consultar)';
      L.push(`• ${i.cantidad}×  ${p.nombre}  ${sub}`);
    }
    L.push('');
    if (this.cuponAplicado()) {
      L.push(`🧮 Subtotal: ${formatoCOP(this.total())}`);
      L.push(`🎁 Cupón bienvenida −18%: -${formatoCOP(this.descuento())}`);
      L.push(`💰 *TOTAL: ${formatoCOP(this.totalFinal())}*${this.hayConsultar() ? ' + ítems a consultar' : ''}`);
    } else {
      L.push(`💰 *TOTAL: ${formatoCOP(this.total())}*${this.hayConsultar() ? ' + ítems a consultar' : ''}`);
    }

    // ── Bloque 2: datos del cliente + fidelidad ──
    L.push(barra);
    L.push('👤 *TUS DATOS*');
    L.push(`• Nombre: ${d.nombre.trim()}`);
    L.push(`• 📱 Teléfono: ${d.telefono.trim()}`);
    if (reg && c?.instagram) L.push(`• 📸 Instagram: ${c.instagram}`);
    if (reg) L.push(`• ⭐ Estrellas: ${this.cuenta.puntos()}`);
    L.push(
      `• 🎟️ Cupón bienvenida: ${
        this.cuponAplicado() ? 'ACTIVO ✅ (−18% aplicado)' : reg ? 'ya usado' : 'sin cuenta'
      }`,
    );

    // ── Bloque 3: entrega y pago ──
    L.push(barra);
    L.push(`📍 Sede: ${SEDES[d.sede]}`);
    if (d.entrega === 'domicilio') {
      L.push('🚚 Entrega: A DOMICILIO');
      L.push(`🏠 Dirección: ${d.direccion.trim()}`);
      if (d.referencia.trim()) L.push(`📌 Referencia / sector: ${d.referencia.trim()}`);
    } else {
      L.push('🏬 Entrega: RECOGER EN TIENDA');
    }
    L.push(`💳 Pago: ${d.pago === 'efectivo' ? 'EFECTIVO' : 'TRANSFERENCIA'}`);
    if (d.notas.trim()) L.push(`📝 Notas: ${d.notas.trim()}`);
    L.push(barra);

    return `https://wa.me/${WHATSAPP_SEDES[d.sede]}?text=${encodeURIComponent(L.join('\n'))}`;
  }

  /** Código legible y único del pedido: CM-AAMMDD-XXXX. */
  private nuevoCodigo(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const fecha = `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
    const r = (Math.random().toString(36) + Math.random().toString(36))
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4)
      .padEnd(4, 'X');
    return `CM-${fecha}-${r}`;
  }

  /** Tras enviar el pedido: registra el pedido en la base y consume el cupón. */
  confirmarEnvio(): void {
    // Snapshot ANTES de consumir el cupón (para guardar el estado real del pedido).
    const aplicado = this.cuponAplicado();
    void this.registrarPedido(aplicado);
    if (aplicado) void this.cuenta.usarCupon();
  }

  /** Guarda el pedido en la base para el panel (buscar por código, historial). */
  private async registrarPedido(cuponAplicado: boolean): Promise<void> {
    const codigo = this.codigoActual;
    if (!codigo) return;
    const d = this.datos();
    const c = this.cuenta.cuenta();
    const items = this.items()
      .map((i) => {
        const p = this.producto(i.id);
        if (!p) return null;
        return {
          id: i.id,
          nombre: p.nombre,
          cantidad: i.cantidad,
          precioUnit: precioNumero(p),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const cuerpo = {
      codigo,
      instagram: c?.instagram ?? '',
      nombre: d.nombre.trim(),
      telefono: d.telefono.trim(),
      sede: d.sede,
      entrega: d.entrega,
      pago: d.pago,
      direccion: d.entrega === 'domicilio' ? d.direccion.trim() : '',
      referencia: d.entrega === 'domicilio' ? d.referencia.trim() : '',
      notas: d.notas.trim(),
      items,
      subtotal: this.total(),
      descuento: cuponAplicado ? this.descuento() : 0,
      total: cuponAplicado ? this.totalFinal() : this.total(),
      cupon: cuponAplicado,
      hayConsultar: this.hayConsultar(),
    };
    try {
      await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
    } catch {
      /* sin conexión: el pedido igual se envió por WhatsApp */
    }
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
