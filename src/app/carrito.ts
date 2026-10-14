import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PRODUCTOS, Producto, WHATSAPP_SEDES, extraSabor } from './productos';
import { ProductosService } from './productos.service';
import { conTemporada } from './temporada';
import { BIENVENIDA_PCT, METAS, Meta, promosActivas } from './promos';
import { CuentaService } from './cuenta.service';
import { PixelService } from './pixel.service';

// Carrito de pedidos: estado global con signals, persistido en localStorage.
// El "checkout" no cobra: arma el pedido completo y lo envía por WhatsApp,
// que es el canal real de ventas del negocio.
//
// Edición Halloween: el carrito lleva además las promociones de promos.ts.
// El 10 % de bienvenida (si a la cuenta le toca) y dos metas que, al pasar
// su monto en productos, dejan ELEGIR un regalo del menú. El regalo elegido
// se recuerda aunque el pedido baje de la meta: si vuelve a pasarla, vuelve.

export interface ItemCarrito {
  id: string;
  cantidad: number;
  /** Sabor elegido (solo milkshakes): uno de los sabores de las New York Cookies. */
  sabor?: string;
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
const KEY_REGALOS = 'crunchy-regalos-v1';

/** Un regalo que sí va en el pedido: su meta está cumplida y el producto existe. */
export interface RegaloVigente {
  meta: Meta;
  producto: Producto;
}

const SEDES: Record<Sede, string> = {
  'san-antonio': 'SEDE SAN ANTONIO (SAN ANTONIO DE PEREIRA, RIONEGRO)',
  marinilla: 'SEDE MARINILLA',
};

@Injectable({ providedIn: 'root' })
export class Carrito {
  readonly items = signal<ItemCarrito[]>(this.cargar());

  /** Regalo elegido por meta (id del producto). Puede estar elegido y no vigente. */
  readonly regalos = signal<Partial<Record<Meta['id'], string>>>(this.cargarRegalos());
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
    this.items().reduce((s, i) => s + this.precioUnit(i) * i.cantidad, 0),
  );

  // ---------- Promociones (promos.ts) ----------

  /** Las metas de la edición, mientras duren. */
  readonly metas = computed<Meta[]>(() => (promosActivas() ? METAS : []));

  /** Metas cumplidas con lo que hay en el carrito. */
  readonly metasCumplidas = computed(() => this.metas().filter((m) => this.total() >= m.monto));

  /** La próxima meta por cumplir, o null si ya están todas (o no hay). */
  readonly siguienteMeta = computed(() => this.metas().find((m) => this.total() < m.monto) ?? null);

  /** Pesos que faltan para la próxima meta. */
  readonly faltaMeta = computed(() => {
    const m = this.siguienteMeta();
    return m ? m.monto - this.total() : 0;
  });

  /** Los regalos que van en el pedido: meta cumplida + elegido + en el menú. */
  readonly regalosVigentes = computed<RegaloVigente[]>(() =>
    this.metasCumplidas()
      .map((meta) => {
        const id = this.regalos()[meta.id];
        const producto = id && meta.opciones.includes(id) ? this.producto(id) : undefined;
        return producto ? { meta, producto } : null;
      })
      .filter((x): x is RegaloVigente => x !== null),
  );

  /** Metas cumplidas a las que todavía les falta elegir regalo. */
  readonly regalosPorElegir = computed(() =>
    this.metasCumplidas().filter((m) => !this.regalosVigentes().some((r) => r.meta.id === m.id)),
  );

  /** Las opciones de regalo de una meta que de verdad están en el menú. */
  opcionesDe(meta: Meta): Producto[] {
    return meta.opciones.map((id) => this.producto(id)).filter((p): p is Producto => !!p);
  }

  elegirRegalo(meta: Meta, id: string): void {
    this.regalos.update((r) => ({ ...r, [meta.id]: id }));
  }

  /** ¿Aplica el 10 % de bienvenida en este pedido? */
  readonly bienvenidaAplica = computed(() => this.cuenta.bienvenidaDisponible() && this.total() > 0);

  /** Descuento en pesos, sobre los productos con precio. */
  readonly descuento = computed(() =>
    this.bienvenidaAplica() ? Math.round((this.total() * BIENVENIDA_PCT) / 100) : 0,
  );

  /** Lo que se paga: productos menos el descuento (los regalos van en $0). */
  readonly totalFinal = computed(() => Math.max(0, this.total() - this.descuento()));

  /** ¿Hay ítems sin precio definido (se cotizan por WhatsApp)? */
  readonly hayConsultar = computed(() =>
    this.items().some((i) => this.precioUnit(i) === 0),
  );

  /** Precio unitario de una línea: base del producto + recargo del sabor (milkshakes). */
  precioUnit(item: ItemCarrito): number {
    const base = precioNumero(this.producto(item.id));
    return base + (item.sabor ? extraSabor(item.sabor) : 0);
  }

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.items()));
      } catch {
        /* almacenamiento bloqueado: el carrito vive solo en memoria */
      }
    });
    effect(() => {
      try {
        localStorage.setItem(KEY_REGALOS, JSON.stringify(this.regalos()));
      } catch {
        /* sin almacenamiento: el regalo elegido vive solo en memoria */
      }
    });
  }

  private readonly productosSvc = inject(ProductosService);
  private readonly cuenta = inject(CuentaService);
  private readonly pixel = inject(PixelService);

  producto(id: string): Producto | undefined {
    return this.productosSvc.porId(id);
  }

  agregar(id: string, sabor?: string): void {
    const eraVacio = this.items().length === 0;
    const cumplidasAntes = this.metasCumplidas().length;
    this.items.update((lista) => {
      const existe = lista.find((i) => this.esLinea(i, id, sabor));
      return existe
        ? lista.map((i) => (this.esLinea(i, id, sabor) ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...lista, sabor ? { id, cantidad: 1, sabor } : { id, cantidad: 1 }];
    });
    // Dispara el aviso flotante (nonce único para reactivarlo aunque el texto
    // se repita al agregar varias veces seguidas).
    // Si con este producto se cruzó una meta, el aviso lo dice: es el momento
    // en que el cliente se entera de que se ganó algo.
    const nueva = this.metasCumplidas()[cumplidasAntes];
    this.notificacion.set({
      nonce: Date.now(),
      texto: nueva ? `¡GANASTE ${nueva.premio.toUpperCase()} DE REGALO!` : 'AÑADIDO AL CARRITO',
    });
    // Con la PRIMERA galleta del carrito, invita a crear cuenta (una sola vez).
    if (eraVacio && !this.cuenta.registrado()) this.cuenta.abrir();
    const p = this.producto(id);
    if (p) this.pixel.agregarAlCarrito(id, p.nombre, this.precioUnit({ id, cantidad: 1, sabor }));
  }

  restar(id: string, sabor?: string): void {
    this.items.update((lista) =>
      lista
        .map((i) => (this.esLinea(i, id, sabor) ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    );
  }

  quitar(id: string, sabor?: string): void {
    this.items.update((lista) => lista.filter((i) => !this.esLinea(i, id, sabor)));
  }

  /** ¿La línea corresponde a este producto y sabor? (distingue milkshakes por sabor). */
  private esLinea(i: ItemCarrito, id: string, sabor?: string): boolean {
    return i.id === id && (i.sabor ?? '') === (sabor ?? '');
  }

  vaciar(): void {
    this.items.set([]);
    this.regalos.set({});
  }

  actualizarDatos(parte: Partial<DatosPedido>): void {
    this.datos.update((d) => ({ ...d, ...parte }));
  }

  /** ¿El formulario está completo para enviar? */
  puedeEnviar(): boolean {
    const d = this.datos();
    // Iniciar sesión es obligatorio para pedir (identifica al cliente).
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
    L.push(`📋 *PEDIDO*  ·  Código del pedido: *${codigo}*`);

    // ── Bloque 1: el pedido ──
    L.push(barra);
    L.push('📦 *TU PEDIDO*');
    for (const i of this.items()) {
      const p = this.producto(i.id);
      if (!p) continue;
      const precio = this.precioUnit(i);
      const nombre = i.sabor ? `${p.nombre} (${i.sabor})` : p.nombre;
      const sub = precio > 0 ? `— ${formatoCOP(precio * i.cantidad)}` : '— (a consultar)';
      L.push(`• ${i.cantidad}×  ${nombre}  ${sub}`);
    }
    for (const r of this.regalosVigentes()) {
      L.push(`• 1×  ${r.producto.nombre}  — 🎁 REGALO meta ${r.meta.nombre} (${formatoCOP(r.meta.monto)})`);
    }
    // Ganado pero sin elegir: igual se anuncia, para que la tienda pregunte
    // cuál quiere en vez de que el regalo se pierda en silencio.
    for (const m of this.regalosPorElegir()) {
      L.push(`• 1×  ${m.premio[0].toUpperCase()}${m.premio.slice(1)} (sin elegir)  — 🎁 REGALO meta ${m.nombre} (${formatoCOP(m.monto)})`);
    }
    L.push('');
    const consultar = this.hayConsultar() ? ' + ítems a consultar' : '';
    if (this.descuento() > 0) {
      L.push(`💵 Subtotal: ${formatoCOP(this.total())}`);
      L.push(`🎃 Bienvenida −${BIENVENIDA_PCT}% (primer pedido): -${formatoCOP(this.descuento())}`);
    }
    L.push(`💰 *TOTAL: ${formatoCOP(this.totalFinal())}*${consultar}`);

    // ── Bloque 2: datos del cliente + fidelidad ──
    L.push(barra);
    L.push('👤 *TUS DATOS*');
    L.push(`• Nombre: ${d.nombre.trim()}`);
    L.push(`• 📱 Teléfono: ${d.telefono.trim()}`);
    if (reg && c?.instagram) L.push(`• 📷 Instagram: ${c.instagram}`);
    if (reg) L.push(`• ⭐ Estrellas: ${this.cuenta.puntos()}`);

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

  /** Tras enviar el pedido: lo registra en la base y gasta la bienvenida. */
  confirmarEnvio(): void {
    // La foto del pedido se toma ANTES de gastar la bienvenida: lo que se
    // guarda tiene que ser lo que el cliente vio y envió.
    const conBienvenida = this.bienvenidaAplica();
    this.pixel.pedidoEnviado(
      this.items().map((i) => i.id),
      this.totalFinal(),
    );
    void this.registrarPedido(conBienvenida);
    if (conBienvenida) void this.cuenta.usarBienvenida();
  }

  /** Guarda el pedido en la base para el panel (buscar por código, historial). */
  private async registrarPedido(conBienvenida: boolean): Promise<void> {
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
          nombre: i.sabor ? `${p.nombre} (${i.sabor})` : p.nombre,
          cantidad: i.cantidad,
          precioUnit: this.precioUnit(i),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    // Los regalos van como líneas de $0, con la meta en el nombre: en el panel
    // se ve qué se regaló y por qué.
    for (const r of this.regalosVigentes()) {
      items.push({
        id: r.producto.id,
        nombre: `REGALO ${r.meta.nombre.toUpperCase()}: ${r.producto.nombre}`,
        cantidad: 1,
        precioUnit: 0,
      });
    }
    for (const m of this.regalosPorElegir()) {
      items.push({
        id: `regalo-${m.id}`,
        nombre: `REGALO ${m.nombre.toUpperCase()}: ${m.premio} (sin elegir)`,
        cantidad: 1,
        precioUnit: 0,
      });
    }
    const descuento = conBienvenida ? Math.round((this.total() * BIENVENIDA_PCT) / 100) : 0;
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
      descuento,
      total: Math.max(0, this.total() - descuento),
      cupon: conBienvenida,
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

  private cargarRegalos(): Partial<Record<Meta['id'], string>> {
    try {
      const r = JSON.parse(localStorage.getItem(KEY_REGALOS) || '{}');
      return r && typeof r === 'object' ? r : {};
    } catch {
      return {};
    }
  }

  private cargar(): ItemCarrito[] {
    try {
      const crudo = localStorage.getItem(KEY);
      if (!crudo) return [];
      const lista = JSON.parse(crudo) as ItemCarrito[];
      // Solo ítems que sigan existiendo en el catálogo.
      const menu = conTemporada(PRODUCTOS);
      return lista.filter((i) => menu.some((p) => p.id === i.id) && i.cantidad > 0);
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
