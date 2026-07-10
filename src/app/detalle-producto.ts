import { Injectable, signal } from '@angular/core';
import { Producto } from './productos';

// Estado global del "detalle de producto": cuál producto está abierto en la
// tarjeta ampliada (modal). Lo comparten el catálogo y la portada, así que
// tocar un producto desde cualquier lado abre la misma tarjeta.
@Injectable({ providedIn: 'root' })
export class DetalleProducto {
  /** Producto abierto en la tarjeta ampliada; null = cerrada. */
  readonly producto = signal<Producto | null>(null);

  abrir(p: Producto): void {
    this.producto.set(p);
  }

  cerrar(): void {
    this.producto.set(null);
  }
}
