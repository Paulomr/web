import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { CATEGORIAS, Categoria, Producto, esMilkshake, urlFoto } from '../../productos';
import { Carrito } from '../../carrito';
import { DetalleProducto } from '../../detalle-producto';
import { ProductosService } from '../../productos.service';

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
  readonly detalle = inject(DetalleProducto);
  private readonly productosSvc = inject(ProductosService);
  readonly urlFoto = urlFoto;

  /** Catálogo segmentado por categoría, en orden de presentación.
      Reacciona al menú del servicio (local al inicio; base de datos si llega). */
  readonly secciones = computed<Seccion[]>(() =>
    CATEGORIAS.map((c) => ({
      id: c.id,
      label: c.label,
      productos: this.productosSvc.productos().filter((p) => p.categoria === c.id),
    })),
  );

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
    // Un milkshake necesita elegir sabor: abre la tarjeta en vez de agregar directo.
    if (esMilkshake(p)) {
      this.detalle.abrir(p);
      return;
    }
    this.carrito.agregar(p.id);
  }

  /** Abre la tarjeta ampliada del producto. */
  abrir(p: Producto): void {
    this.detalle.abrir(p);
  }
}
