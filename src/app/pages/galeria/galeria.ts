import { Component, ElementRef, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FOTOS } from '../../fotos';
import { ConfiguracionService } from '../../configuracion.service';
import { urlFoto } from '../../productos';

@Component({
  selector: 'app-galeria',
  imports: [],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria implements OnDestroy {
  private readonly cfg = inject(ConfiguracionService);
  readonly urlFoto = urlFoto;

  /** Fotos de la galería: las del panel si hay, o las de marca por defecto. */
  readonly fotos = computed(() => {
    const g = this.cfg.galeria();
    return g.length ? g : FOTOS;
  });

  /** Foto ampliada en el visor (null = solo la cuadrícula). */
  readonly ampliada = signal<string | null>(null);

  private observador?: IntersectionObserver;

  constructor(private readonly host: ElementRef<HTMLElement>) {
    // Reobserva cuando cambia la lista (la config llega async): así las fotos
    // nuevas también reciben su animación de entrada y nunca quedan ocultas.
    effect(() => {
      this.fotos();
      setTimeout(() => this.observarPics(), 40);
    });
  }

  private observarPics(): void {
    this.observador ??= new IntersectionObserver(
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
    this.host.nativeElement
      .querySelectorAll('.pic:not(.visible)')
      .forEach((el) => this.observador?.observe(el));
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
  // una captura siempre es posible; por eso cada foto lleva la marca de agua.
  bloquear(ev: Event): void {
    ev.preventDefault();
  }
}
