import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CuentaService } from '../../cuenta.service';

// Modal global de sesión: registrar (con código de 4 dígitos) o iniciar sesión
// (@instagram + código). Se abre al agregar la primera galleta, desde el botón
// "Entrar" del notch, o desde el chip de cuenta. Vive una sola vez (app.html).
@Component({
  selector: 'app-registro-modal',
  imports: [FormsModule, RouterLink],
  templateUrl: './registro-modal.html',
  styleUrl: './registro-modal.css',
})
export class RegistroModal {
  readonly cuenta = inject(CuentaService);

  readonly modo = signal<'registro' | 'login' | 'recuperar'>('registro');

  // Registro
  readonly nombre = signal('');
  readonly edad = signal('');
  readonly instagram = signal('');
  readonly direccion = signal('');
  readonly pin = signal('');
  readonly acepta = signal(false);

  // Login
  readonly loginIg = signal('');
  readonly loginPin = signal('');

  // Recuperar código (pregunta de seguridad: @instagram + nombre completo)
  readonly recIg = signal('');
  readonly recNombre = signal('');
  readonly recPin = signal('');
  readonly recOk = signal(false);

  readonly error = signal('');
  readonly cargando = signal(false);

  constructor() {
    effect(() => {
      const abierto = this.cuenta.abierto();
      document.body.style.overflow = abierto ? 'hidden' : '';
      if (abierto) {
        this.modo.set(this.cuenta.modoSolicitado());
        this.error.set('');
      }
    });
  }

  cambiarModo(m: 'registro' | 'login' | 'recuperar'): void {
    this.modo.set(m);
    this.error.set('');
    this.recOk.set(false);
  }

  async registrar(): Promise<void> {
    if (this.cargando()) return;
    const nombre = this.nombre().trim();
    if (nombre.length < 2) {
      this.error.set('Escribe tu nombre.');
      return;
    }
    if (!this.instagram().trim()) {
      this.error.set('Pon tu Instagram: es tu usuario para volver a entrar.');
      return;
    }
    if (!/^\d{4}$/.test(this.pin().trim())) {
      this.error.set('Crea un código de 4 dígitos (tu contraseña).');
      return;
    }
    if (!this.acepta()) {
      this.error.set('Marca la casilla para aceptar el tratamiento de tus datos.');
      return;
    }
    this.error.set('');
    this.cargando.set(true);
    const r = await this.cuenta.registrar(
      {
        nombre,
        edad: String(this.edad() ?? '').trim(),
        instagram: this.instagram().trim(),
        direccion: String(this.direccion() ?? '').trim(),
        acepta: true,
      },
      this.pin().trim(),
    );
    this.cargando.set(false);
    if (!r.ok) {
      this.error.set(r.error ?? 'No se pudo crear la cuenta.');
      return;
    }
    this.limpiar();
  }

  async iniciarSesion(): Promise<void> {
    if (this.cargando()) return;
    if (!this.loginIg().trim()) {
      this.error.set('Pon tu Instagram.');
      return;
    }
    if (!/^\d{4}$/.test(this.loginPin().trim())) {
      this.error.set('Tu código es de 4 dígitos.');
      return;
    }
    this.error.set('');
    this.cargando.set(true);
    const r = await this.cuenta.iniciarSesion(this.loginIg().trim(), this.loginPin().trim());
    this.cargando.set(false);
    if (!r.ok) {
      this.error.set(r.error ?? 'No se pudo iniciar sesión.');
      return;
    }
    this.limpiar();
  }

  async recuperar(): Promise<void> {
    if (this.cargando()) return;
    if (!this.recIg().trim()) {
      this.error.set('Pon tu Instagram.');
      return;
    }
    if (this.recNombre().trim().length < 2) {
      this.error.set('Escribe tu nombre completo (como lo registraste).');
      return;
    }
    if (!/^\d{4}$/.test(this.recPin().trim())) {
      this.error.set('Crea un código nuevo de 4 dígitos.');
      return;
    }
    this.error.set('');
    this.cargando.set(true);
    const r = await this.cuenta.recuperar(this.recIg().trim(), this.recNombre().trim(), this.recPin().trim());
    this.cargando.set(false);
    if (!r.ok) {
      this.error.set(r.error ?? 'No se pudo recuperar la cuenta.');
      return;
    }
    // Verificación correcta: sesión iniciada con el código nuevo.
    this.recOk.set(true);
    this.limpiar();
  }

  private limpiar(): void {
    this.nombre.set('');
    this.edad.set('');
    this.instagram.set('');
    this.direccion.set('');
    this.pin.set('');
    this.acepta.set(false);
    this.loginIg.set('');
    this.loginPin.set('');
    this.recIg.set('');
    this.recNombre.set('');
    this.recPin.set('');
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.cuenta.cerrar();
  }
}
