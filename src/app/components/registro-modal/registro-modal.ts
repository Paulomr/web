import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuentaService } from '../../cuenta.service';

// Modal global de sesión. Se abre al agregar la primera galleta al carrito
// (registro) o desde el chip de cuenta del notch (ver datos / cerrar sesión).
// Vive una sola vez en la app (montado en app.html).
@Component({
  selector: 'app-registro-modal',
  imports: [FormsModule],
  templateUrl: './registro-modal.html',
  styleUrl: './registro-modal.css',
})
export class RegistroModal {
  readonly cuenta = inject(CuentaService);

  readonly nombre = signal('');
  readonly edad = signal('');
  readonly instagram = signal('');
  readonly direccion = signal('');
  readonly acepta = signal(false);
  readonly error = signal('');

  constructor() {
    // Bloquea el scroll del fondo mientras el modal está abierto.
    effect(() => {
      document.body.style.overflow = this.cuenta.abierto() ? 'hidden' : '';
    });
  }

  registrar(): void {
    const nombre = this.nombre().trim();
    if (nombre.length < 2) {
      this.error.set('Escribe tu nombre para continuar.');
      return;
    }
    if (!this.acepta()) {
      this.error.set('Marca la casilla para aceptar el tratamiento de tus datos.');
      return;
    }
    this.error.set('');
    this.cuenta.registrar({
      nombre,
      // EDAD viene de un input number: puede llegar como número. Lo pasamos a
      // texto de forma segura (evita "trim is not a function").
      edad: String(this.edad() ?? '').trim(),
      instagram: String(this.instagram() ?? '').trim(),
      direccion: String(this.direccion() ?? '').trim(),
      acepta: true,
    });
    this.nombre.set('');
    this.edad.set('');
    this.instagram.set('');
    this.direccion.set('');
    this.acepta.set(false);
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.cuenta.cerrar();
  }
}
