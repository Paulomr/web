import { Component, inject } from '@angular/core';
import { Carrito, ItemCarrito, formatoCOP } from '../../carrito';
import { CuentaService } from '../../cuenta.service';
import { urlFoto } from '../../productos';

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

  precioLinea(item: ItemCarrito): string {
    const n = this.carrito.precioUnit(item);
    return n > 0 ? formatoCOP(n * item.cantidad) : 'CONSULTAR';
  }

  /** Clave única de la línea (distingue milkshakes por sabor) para el *ngFor. */
  lineaId(item: ItemCarrito): string {
    return item.sabor ? `${item.id}::${item.sabor}` : item.id;
  }

  totalTexto(): string {
    return formatoCOP(this.carrito.total());
  }

  enviar(): void {
    if (!this.carrito.puedeEnviar()) return;
    window.open(this.carrito.linkPedido(), '_blank', 'noopener');
    // Registra el pedido en la base (historial del panel).
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
