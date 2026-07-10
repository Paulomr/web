import { Component, effect, inject, signal } from '@angular/core';
import { Carrito } from '../../carrito';

// Aviso flotante en el centro de la pantalla ("AÑADIDO AL CARRITO").
// Escucha la señal de notificación del carrito y se muestra ~1.6 s.
@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  private readonly carrito = inject(Carrito);

  readonly visible = signal(false);
  readonly texto = signal('');
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const aviso = this.carrito.notificacion();
      if (!aviso) return;
      this.texto.set(aviso.texto);
      this.visible.set(true);
      clearTimeout(this.temporizador);
      this.temporizador = setTimeout(() => this.visible.set(false), 1600);
    });
  }
}
