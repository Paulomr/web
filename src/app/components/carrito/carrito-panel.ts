import { Component, inject } from '@angular/core';
import { Carrito, formatoCOP, precioNumero } from '../../carrito';
import { Producto } from '../../productos';

@Component({
  selector: 'app-carrito-panel',
  imports: [],
  templateUrl: './carrito-panel.html',
  styleUrl: './carrito-panel.css',
})
export class CarritoPanel {
  readonly carrito = inject(Carrito);

  precioLinea(p: Producto | undefined, cantidad: number): string {
    const n = precioNumero(p);
    return n > 0 ? formatoCOP(n * cantidad) : 'CONSULTAR';
  }

  totalTexto(): string {
    return formatoCOP(this.carrito.total());
  }

  enviar(): void {
    if (!this.carrito.puedeEnviar()) return;
    window.open(this.carrito.linkPedido(), '_blank', 'noopener');
  }

  onInput(campo: 'nombre' | 'telefono' | 'direccion' | 'notas', ev: Event): void {
    this.carrito.actualizarDatos({ [campo]: (ev.target as HTMLInputElement).value });
  }
}
