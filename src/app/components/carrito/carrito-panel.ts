import { Component, inject } from '@angular/core';
import { Carrito, formatoCOP, precioNumero } from '../../carrito';
import { CuentaService } from '../../cuenta.service';
import { Producto, urlFoto } from '../../productos';

@Component({
  selector: 'app-carrito-panel',
  imports: [],
  templateUrl: './carrito-panel.html',
  styleUrl: './carrito-panel.css',
})
export class CarritoPanel {
  readonly carrito = inject(Carrito);
  readonly cuenta = inject(CuentaService);
  readonly urlFoto = urlFoto;

  precioLinea(p: Producto | undefined, cantidad: number): string {
    const n = precioNumero(p);
    return n > 0 ? formatoCOP(n * cantidad) : 'CONSULTAR';
  }

  totalTexto(): string {
    return formatoCOP(this.carrito.totalFinal());
  }

  descuentoTexto(): string {
    return formatoCOP(this.carrito.descuento());
  }

  enviar(): void {
    if (!this.carrito.puedeEnviar()) return;
    window.open(this.carrito.linkPedido(), '_blank', 'noopener');
    // Consume el cupón de bienvenida (si estaba aplicado): una vez por cuenta.
    this.carrito.confirmarEnvio();
  }

  onInput(campo: 'nombre' | 'telefono' | 'direccion' | 'referencia' | 'notas', ev: Event): void {
    this.carrito.actualizarDatos({ [campo]: (ev.target as HTMLInputElement).value });
  }

  /** Abre el modal de sesión para poder completar el pedido. */
  pedirSesion(): void {
    this.cuenta.abrir('login');
  }
}
