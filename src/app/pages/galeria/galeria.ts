import { AfterViewInit, Component, ElementRef, OnDestroy, signal } from '@angular/core';
import { FOTOS } from '../../fotos';

@Component({
  selector: 'app-galeria',
  imports: [],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria implements AfterViewInit, OnDestroy {
  readonly fotos = FOTOS;

  /** Foto ampliada en el visor (null = solo la cuadrícula). */
  readonly ampliada = signal<string | null>(null);

  private observador?: IntersectionObserver;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  // Entrada dinámica: cada foto llega deslizándose desde un lado (alternado)
  // cuando entra al viewport. Con reduced-motion el CSS anula el efecto.
  ngAfterViewInit(): void {
    this.observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            this.observador?.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    this.host.nativeElement.querySelectorAll('.pic').forEach((el) => this.observador?.observe(el));
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  abrir(foto: string): void {
    this.ampliada.set(foto);
  }

  cerrar(): void {
    this.ampliada.set(null);
  }

  // Disuade la descarga directa (clic derecho / arrastrar). No es infalible:
  // una captura de pantalla siempre es posible; por eso cada foto lleva
  // además la marca de agua de la marca.
  bloquear(ev: Event): void {
    ev.preventDefault();
  }
}
