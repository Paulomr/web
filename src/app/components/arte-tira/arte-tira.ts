import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { animate, scroll } from 'motion';
import { ARTE } from '../../arte';

// Tira de arte de la portada: una fila de piezas que se desplaza en horizontal
// mientras la sección cruza la pantalla.
//
// A propósito NO lleva altura artificial (nada de 200vh con un bloque pegado):
// el recorrido sale de lo que la propia sección tarda en pasar por el viewport,
// así el efecto no cuesta ni una pantalla extra de scroll. Va justo debajo de
// las sedes, que se acortaron por lo mismo.
@Component({
  selector: 'app-arte-tira',
  imports: [RouterLink],
  templateUrl: './arte-tira.html',
  styleUrl: './arte-tira.css',
})
export class ArteTira {
  private readonly destroyRef = inject(DestroyRef);
  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');

  /** Con menos movimiento la tira no se anima: se recorre a dedo (ver CSS). */
  readonly reducido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Las piezas en video se muestran por su póster: la tira es decorativa y
      tres videos a la vez en la portada no compensan lo que cuestan. */
  readonly piezas = ARTE.map((a) => ({
    src: `arte/${a.tipo === 'video' ? a.archivo + '.webp' : a.archivo}`,
    alt: a.alt,
    ancho: a.ancho,
    alto: a.alto,
  }));

  constructor() {
    afterNextRender(() => this.arrancar());
  }

  private arrancar(): void {
    if (this.reducido) return;

    const pista = this.pista().nativeElement;
    const seccion = this.seccion().nativeElement;
    let limpiar: VoidFunction | undefined;

    const montar = (): void => {
      limpiar?.();

      // Lo que sobra de la pista por fuera de su marco. Las piezas llevan alto
      // fijo y proporción conocida (atributos width/height), así que esto ya es
      // correcto antes de que las imágenes terminen de cargar.
      const sobra = pista.scrollWidth - pista.clientWidth;
      if (sobra <= 0) {
        pista.style.transform = '';
        return;
      }

      limpiar = scroll(
        animate(pista, { transform: ['translateX(0px)', `translateX(${-sobra}px)`] }, { ease: 'linear' }),
        { target: seccion, offset: ['start end', 'end start'] },
      );
    };

    montar();

    // El ancho que sobra cambia al girar el teléfono o redimensionar.
    const ro = new ResizeObserver(() => montar());
    ro.observe(pista);

    this.destroyRef.onDestroy(() => {
      ro.disconnect();
      limpiar?.();
    });
  }
}
