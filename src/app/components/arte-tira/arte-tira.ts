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

/**
 * Piezas de la tira, elegidas a mano y en este orden: abre un banner ancho
 * (impacta), y luego se alternan formatos para que la fila no caiga en un
 * ritmo plano. No van las doce a propósito — ver RITMO más abajo.
 */
const EN_TIRA = [
  'banner-1.webp',
  'nngh.webp',
  'diner.webp',
  'kaboom.webp',
  'samurai-neon',
  'caja-cielo.webp',
  'slurrrp.webp',
];

/**
 * Cuánto scroll vertical cuesta recorrer la tira entera, como fracción de lo
 * que la tira mide de más.
 *
 * A 1:1 el carrusel se sentiría "natural" pero con estas piezas a media
 * pantalla sobran ~4000 px: serían 4,4 pantallas con el visitante clavado
 * ahí, y las doce piezas eran 8. Con 0.55 la fila avanza a ~1,8× el dedo y
 * el anclaje entero cabe en ~2,4 pantallas, que ya se siente cinematográfico
 * sin llegar a secuestrar la página.
 */
const RITMO = 0.55;

/**
 * Tope del anclaje, en pantallas. En un teléfono la fila sobra mucho más
 * respecto al ancho de la ventana, así que solo con RITMO el anclaje duraba
 * 2,7 pantallas en móvil contra 2,3 en escritorio. El tope iguala las dos y,
 * sobre todo, pone un techo a cuánto puede la tira retener la página.
 */
const TOPE_PANTALLAS = 2.2;

// Tira de arte de la portada: se ancla al llegar y la fila gira en horizontal
// mientras se baja. Cuando la fila termina, el anclaje suelta y la página
// sigue. Con prefers-reduced-motion no se ancla nada: pasa a ser un carrusel
// que se arrastra a dedo (ver CSS), porque si solo se apagara la animación el
// arte de la derecha quedaría inalcanzable.
@Component({
  selector: 'app-arte-tira',
  imports: [RouterLink],
  templateUrl: './arte-tira.html',
  styleUrl: './arte-tira.css',
})
export class ArteTira {
  private readonly destroyRef = inject(DestroyRef);
  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly marco = viewChild.required<ElementRef<HTMLElement>>('marco');
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');

  readonly reducido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Las piezas en video se muestran por su póster: la tira es decorativa y
      tres videos a la vez en la portada no compensan lo que cuestan. */
  readonly piezas = EN_TIRA.map((id) => {
    const a = ARTE.find((x) => x.archivo === id)!;
    return {
      src: `arte/${a.tipo === 'video' ? a.archivo + '.webp' : a.archivo}`,
      alt: a.alt,
      ancho: a.ancho,
      alto: a.alto,
    };
  });

  constructor() {
    afterNextRender(() => this.arrancar());
  }

  private arrancar(): void {
    if (this.reducido) return;

    const seccion = this.seccion().nativeElement;
    const marco = this.marco().nativeElement;
    const pista = this.pista().nativeElement;
    const barra = this.barra().nativeElement;
    let limpiar: VoidFunction | undefined;

    const montar = (): void => {
      limpiar?.();
      limpiar = undefined;

      // Lo que la fila mide de más. Las piezas llevan alto fijo y proporción
      // conocida (atributos width/height), así que esto ya es correcto antes
      // de que las imágenes terminen de cargar.
      const sobra = pista.scrollWidth - marco.clientWidth;

      if (sobra <= 0) {
        // Cabe entera: ni se ancla ni hace falta recorrido.
        seccion.style.height = '';
        pista.style.transform = 'translateX(0px)';
        barra.style.transform = 'scaleX(1)';
        return;
      }

      // El alto de la sección es la pantalla pegada más lo que dure el
      // recorrido. De ahí sale que el anclaje suelte justo cuando la fila
      // llega al final, ni antes ni después.
      const recorrido = Math.round(
        Math.min(sobra * RITMO, window.innerHeight * TOPE_PANTALLAS),
      );
      seccion.style.height = `calc(100svh + ${recorrido}px)`;

      limpiar = scroll(
        animate(
          pista,
          { transform: ['translateX(0px)', `translateX(${-sobra}px)`] },
          { ease: 'linear' },
        ),
        { target: seccion, offset: ['start start', 'end end'] },
      );

      const limpiarBarra = scroll(
        animate(barra, { transform: ['scaleX(0)', 'scaleX(1)'] }, { ease: 'linear' }),
        { target: seccion, offset: ['start start', 'end end'] },
      );

      const soltarPista = limpiar;
      limpiar = () => {
        soltarPista();
        limpiarBarra();
      };
    };

    montar();

    // El sobrante cambia al girar el teléfono o redimensionar la ventana.
    const ro = new ResizeObserver(() => montar());
    ro.observe(marco);

    this.destroyRef.onDestroy(() => {
      ro.disconnect();
      limpiar?.();
    });
  }
}
