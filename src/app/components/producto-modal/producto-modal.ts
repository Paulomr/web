import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { DetalleProducto } from '../../detalle-producto';
import { Carrito, formatoCOP, precioNumero } from '../../carrito';
import { Producto, esMilkshake, extraSabor, urlFoto } from '../../productos';
import { ProductosService } from '../../productos.service';

// Tarjeta ampliada de un producto: fondo difuminado + galería de fotos,
// descripción completa, precio y botón para agregar al carrito.
// Es global (vive una sola vez en la app) y la abren el catálogo y la portada.
@Component({
  selector: 'app-producto-modal',
  imports: [],
  templateUrl: './producto-modal.html',
  styleUrl: './producto-modal.css',
})
export class ProductoModal {
  readonly detalle = inject(DetalleProducto);
  readonly carrito = inject(Carrito);
  private readonly productosSvc = inject(ProductosService);
  readonly urlFoto = urlFoto;
  readonly esMilkshake = esMilkshake;

  /** Índice de la foto visible en la galería. */
  readonly indice = signal(0);

  /** Sabor de milkshake elegido (obligatorio para agregar un milkshake). */
  readonly saborSel = signal<string | null>(null);

  /** Sabores de milkshake = las New York Cookies del menú vigente, con su recargo. */
  readonly sabores = computed(() =>
    this.productosSvc
      .productos()
      .filter((p) => p.categoria === 'cookies')
      .map((p) => ({ nombre: p.nombre, extra: extraSabor(p.nombre) })),
  );

  constructor() {
    // Al abrir/cambiar de producto: reinicia la galería y el sabor, y bloquea el
    // scroll del fondo mientras la tarjeta está abierta.
    effect(() => {
      const abierto = this.detalle.producto() !== null;
      this.indice.set(0);
      this.saborSel.set(null);
      document.body.style.overflow = abierto ? 'hidden' : '';
    });
  }

  fotos(): string[] {
    return this.detalle.producto()?.fotos ?? [];
  }

  siguiente(): void {
    const n = this.fotos().length;
    if (n > 1) this.indice.update((i) => (i + 1) % n);
  }

  anterior(): void {
    const n = this.fotos().length;
    if (n > 1) this.indice.update((i) => (i - 1 + n) % n);
  }

  irA(i: number): void {
    this.indice.set(i);
  }

  /** Precio a mostrar: para milkshake suma el recargo del sabor elegido. */
  precioMostrar(p: Producto): string {
    if (!esMilkshake(p)) return p.precio || 'CONSULTAR';
    const base = precioNumero(p);
    const extra = this.saborSel() ? extraSabor(this.saborSel()!) : 0;
    return formatoCOP(base + extra);
  }

  /** ¿Falta elegir sabor? (bloquea el botón de un milkshake sin sabor). */
  faltaSabor(p: Producto): boolean {
    return esMilkshake(p) && !this.saborSel();
  }

  agregar(): void {
    const p = this.detalle.producto();
    if (!p || this.faltaSabor(p)) return;
    this.carrito.agregar(p.id, this.saborSel() ?? undefined);
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.detalle.cerrar();
  }
}
