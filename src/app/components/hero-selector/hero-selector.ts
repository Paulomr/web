import { Component, computed, inject, signal } from '@angular/core';
import { CuentaService } from '../../cuenta.service';

// Hero de la portada: selector "acordeón" de las más vendidas. Los paneles de
// foto se expanden al tocarlos (el activo crece, los demás se encogen). Adaptado
// a Angular (signals + CSS) del patrón "interactive image selector".
interface Slide {
  /** Foto en public/fotos/. */
  img: string;
  /** Nombre del producto (rótulo del panel). */
  nombre: string;
}

@Component({
  selector: 'app-hero-selector',
  imports: [],
  templateUrl: './hero-selector.html',
  styleUrl: './hero-selector.css',
})
export class HeroSelector {
  private readonly cuenta = inject(CuentaService);

  /** Saludo por nombre si hay sesión ("HOLA PAULO"); vacío si no. */
  readonly saludo = computed(() =>
    this.cuenta.registrado() ? `HOLA ${this.cuenta.primerNombre()}` : '',
  );

  /** Las 5 más vendidas: foto + nombre (sin logos, el rótulo es el nombre). */
  readonly slides: Slide[] = [
    { img: 'fotos/bearnie-0630.webp', nombre: 'MILKSHAKE' },
    { img: 'fotos/bearnie-0572.webp', nombre: 'NY CROOKIE' },
    { img: 'fotos/bearnie-0433.webp', nombre: "S'MORES" },
    { img: 'fotos/bearnie-0399.webp', nombre: 'MINICOOKIES' },
    { img: 'fotos/bearnie-0939.webp', nombre: 'MANGO MATCHA' },
  ];

  /** Índice del panel expandido. */
  readonly activa = signal(0);

  seleccionar(i: number): void {
    this.activa.set(i);
  }
}
