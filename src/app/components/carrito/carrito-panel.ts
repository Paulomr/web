import { Component, HostListener, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Carrito, ItemCarrito, formatoCOP, precioNumero } from '../../carrito';
import { CuentaService } from '../../cuenta.service';
import { DetalleProducto } from '../../detalle-producto';
import { Producto, esMilkshake, urlFoto } from '../../productos';
import { ProductosService } from '../../productos.service';
import {
  BIENVENIDA_PCT,
  CONDICIONES_BIENVENIDA,
  CONDICIONES_METAS,
  Meta,
  promosActivas,
  quedaPromos,
} from '../../promos';

/** Hasta cuánto falta para una meta se ofrecen productos que la cierran. */
const SUGERIR_HASTA = 30000;

// El carrito como el interior de la caja de Halloween: el pedido "cae" en el
// cartón lila. Además de la lista y el formulario de siempre, lleva las
// promociones de la edición (promos.ts): la barra "Dulce o truco" con sus dos
// metas, la elección del regalo, sugerencias cuando falta poco y el 10 % de
// bienvenida visto en pesos sobre este mismo pedido.
@Component({
  selector: 'app-carrito-panel',
  imports: [RouterLink],
  templateUrl: './carrito-panel.html',
  styleUrl: './carrito-panel.css',
})
export class CarritoPanel {
  readonly carrito = inject(Carrito);
  readonly cuenta = inject(CuentaService);
  private readonly detalle = inject(DetalleProducto);
  private readonly productosSvc = inject(ProductosService);
  readonly urlFoto = urlFoto;
  readonly pct = BIENVENIDA_PCT;
  readonly condicionesMetas = CONDICIONES_METAS;
  readonly condicionesBienvenida = CONDICIONES_BIENVENIDA;
  readonly min = Math.min;

  readonly bienvenidaVigente = promosActivas;

  /** La barra llega hasta la última meta: ahí está el 100 %. */
  readonly topeBarra = computed(() => this.carrito.metas().at(-1)?.monto ?? 1);

  /** Avance de la barra, 0–100. */
  readonly avance = computed(() => Math.min(100, (this.carrito.total() / this.topeBarra()) * 100));

  /** Lo que costaría este pedido con el 10 % (para quien aún no tiene cuenta). */
  readonly conBienvenida = computed(() =>
    Math.max(0, this.carrito.total() - Math.round((this.carrito.total() * BIENVENIDA_PCT) / 100)),
  );

  /**
   * Cuánto le queda a la edición, dicho en grande solo cuando importa. Es la
   * fecha real de cierre (31 de octubre): nada de relojes que se reinician.
   */
  readonly cuentaRegresiva = computed(() => {
    // Se relee al abrir el carrito: el computed depende de `abierto`.
    if (!this.carrito.abierto()) return '';
    const ms = quedaPromos();
    if (ms <= 0) return '';
    const horas = Math.floor(ms / 3_600_000);
    if (horas < 24) return horas <= 1 ? 'Última hora de Halloween' : `Últimas ${horas} horas de Halloween`;
    const dias = Math.ceil(ms / 86_400_000);
    return dias === 1 ? 'Halloween termina mañana' : `Quedan ${dias} días de Halloween`;
  });

  /**
   * Productos que cierran la diferencia con la próxima meta: primero los que
   * la cubren de un solo toque (del más barato al más caro), y si ninguno
   * alcanza, los más caros. Solo con foto y con precio, y nunca un regalo.
   */
  readonly sugerencias = computed<Producto[]>(() => {
    const meta = this.carrito.siguienteMeta();
    const falta = this.carrito.faltaMeta();
    if (!meta || falta <= 0 || falta > SUGERIR_HASTA || this.carrito.items().length === 0) return [];
    const regalos = new Set(this.carrito.metas().flatMap((m) => m.opciones));
    const candidatos = this.productosSvc
      .productos()
      .filter((p) => p.fotos.length > 0 && precioNumero(p) > 0 && !regalos.has(p.id));
    const alcanzan = candidatos
      .filter((p) => precioNumero(p) >= falta)
      .sort((a, b) => precioNumero(a) - precioNumero(b));
    const resto = candidatos
      .filter((p) => precioNumero(p) < falta)
      .sort((a, b) => precioNumero(b) - precioNumero(a));
    return [...alcanzan, ...resto].slice(0, 3);
  });

  /** Dónde cae una meta en la barra, 0–100. */
  posicion(m: Meta): number {
    return (m.monto / this.topeBarra()) * 100;
  }

  cop(n: number): string {
    return formatoCOP(n);
  }

  precioDe(p: Producto): string {
    return formatoCOP(precioNumero(p));
  }

  precioLinea(item: ItemCarrito): string {
    const n = this.carrito.precioUnit(item);
    return n > 0 ? formatoCOP(n * item.cantidad) : 'Consultar';
  }

  /** Clave única de la línea (distingue milkshakes por sabor). */
  lineaId(item: ItemCarrito): string {
    return item.sabor ? `${item.id}::${item.sabor}` : item.id;
  }

  /** Un milkshake de sabor a elegir abre su tarjeta; lo demás entra directo. */
  agregarSugerido(p: Producto): void {
    if (esMilkshake(p)) {
      this.detalle.abrir(p);
      return;
    }
    this.carrito.agregar(p.id);
  }

  /** Suelta el regalo elegido: la meta vuelve a mostrar sus opciones. */
  cambiarRegalo(m: Meta): void {
    this.carrito.regalos.update((r) => {
      const copia = { ...r };
      delete copia[m.id];
      return copia;
    });
  }

  enviar(): void {
    if (!this.carrito.puedeEnviar()) return;
    window.open(this.carrito.linkPedido(), '_blank', 'noopener');
    // Registra el pedido en la base (historial del panel) y gasta la bienvenida.
    this.carrito.confirmarEnvio();
  }

  onInput(campo: 'nombre' | 'telefono' | 'direccion' | 'referencia' | 'notas', ev: Event): void {
    this.carrito.actualizarDatos({ [campo]: (ev.target as HTMLInputElement).value });
  }

  /** Abre el modal de sesión para poder completar el pedido. */
  pedirSesion(): void {
    this.cuenta.abrir('login');
  }

  crearCuenta(): void {
    this.cuenta.abrir('registro');
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.carrito.abierto.set(false);
  }
}
