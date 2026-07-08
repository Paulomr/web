import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { CATEGORIAS, PRODUCTOS, Categoria, Producto } from '../../productos';
import { Carrito } from '../../carrito';

interface Seccion {
  id: Categoria;
  label: string;
  productos: Producto[];
}

@Component({
  selector: 'app-catalogo',
  imports: [],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnDestroy {
  readonly carrito = inject(Carrito);

  /** Catálogo segmentado por categoría, en orden de presentación. */
  readonly secciones: Seccion[] = CATEGORIAS.map((c) => ({
    id: c.id,
    label: c.label,
    productos: PRODUCTOS.filter((p) => p.categoria === c.id),
  }));

  /** Panel del notch abierto/cerrado. */
  readonly notchAbierto = signal(false);

  /** Tic global del carrusel: rota las fotos de productos con varias. */
  readonly tick = signal(0);
  private readonly carrusel = setInterval(() => this.tick.update((t) => t + 1), 2800);

  ngOnDestroy(): void {
    clearInterval(this.carrusel);
  }

  @HostListener('document:keydown.escape')
  cerrarNotch(): void {
    this.notchAbierto.set(false);
  }

  /** El notch navega: desplaza suavemente hasta la sección elegida. */
  irA(id: Categoria): void {
    this.notchAbierto.set(false);
    document.getElementById('seccion-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Foto visible ahora para el producto (rota si tiene varias). */
  foto(p: Producto): string {
    return p.fotos[this.tick() % p.fotos.length];
  }

  /** Índice de la foto visible (para los puntos del carrusel). */
  fotoIndex(p: Producto): number {
    return this.tick() % p.fotos.length;
  }

  agregar(p: Producto): void {
    this.carrito.agregar(p.id);
  }
}
