import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { DetalleProducto } from '../../detalle-producto';
import { Carrito } from '../../carrito';
import { urlFoto } from '../../productos';

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
  readonly urlFoto = urlFoto;

  /** Índice de la foto visible en la galería. */
  readonly indice = signal(0);

  constructor() {
    // Al abrir/cambiar de producto: reinicia la galería y bloquea el scroll
    // del fondo mientras la tarjeta está abierta.
    effect(() => {
      const abierto = this.detalle.producto() !== null;
      this.indice.set(0);
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

  agregar(): void {
    const p = this.detalle.producto();
    if (p) this.carrito.agregar(p.id);
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.detalle.cerrar();
  }
}
