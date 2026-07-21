import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';

// Hero de la portada: selector "acordeón" de las más vendidas. Los paneles de
// foto se expanden al tocarlos (el activo crece, los demás se encogen). Adaptado
// a Angular (signals + CSS) del patrón "interactive image selector".
//
// El borde de cada panel brilla siguiendo el cursor (efecto "spotlight" tipo
// GlowCard, adaptado a Angular): la posición del puntero se guarda como
// variables CSS (--x/--y/--xp) que heredan los paneles.
interface Slide {
  /** Foto en public/fotos/. */
  img: string;
  /** Nombre del producto (rótulo del panel). */
  nombre: string;
  /** Encuadre de la foto (background-position). Por defecto 'center'. */
  pos?: string;
}

@Component({
  selector: 'app-hero-selector',
  imports: [],
  templateUrl: './hero-selector.html',
  styleUrl: './hero-selector.css',
})
export class HeroSelector {
  /** Las más vendidas: foto + nombre (sin logos, el rótulo es el nombre). */
  readonly slides: Slide[] = [
    { img: 'fotos/bearnie-0630.webp', nombre: 'MILKSHAKE' },
    { img: 'fotos/bearnie-0572.webp', nombre: 'NY CROOKIE' },
    { img: 'fotos/bearnie-0433.webp', nombre: 'MINICOOKIES' },
    { img: 'fotos/bearnie-0399.webp', nombre: "S'MORES", pos: 'center 30%' },
    { img: 'fotos/bearnie-0939.webp', nombre: 'MANGO MATCHA', pos: 'center 75%' },
    { img: 'fotos/bearnie-0228.webp', nombre: 'KINDER' },
    { img: 'fotos/bearnie-0121.webp', nombre: 'RED VELVET' },
  ];

  /** Índice del panel expandido. */
  readonly activa = signal(0);

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    // Valor inicial en el centro de la pantalla (para que el brillo no arranque
    // pegado a una esquina, y para móviles sin cursor).
    this.fijarSpot(window.innerWidth / 2, window.innerHeight / 2);
  }

  seleccionar(i: number): void {
    this.activa.set(i);
  }

  /** Rastrea el cursor: guarda su posición como variables CSS para el brillo. */
  @HostListener('document:pointermove', ['$event'])
  onPuntero(e: PointerEvent): void {
    this.fijarSpot(e.clientX, e.clientY);
  }

  private fijarSpot(x: number, y: number): void {
    const el = this.host.nativeElement as HTMLElement;
    el.style.setProperty('--x', x.toFixed(1));
    el.style.setProperty('--y', y.toFixed(1));
    el.style.setProperty('--xp', (x / window.innerWidth).toFixed(3));
  }
}
