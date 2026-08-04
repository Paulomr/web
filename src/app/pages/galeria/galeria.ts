import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { animate, inView, scroll } from 'motion';
import { FOTOS } from '../../fotos';
import { ARTE, type Arte } from '../../arte';
import { ConfiguracionService } from '../../configuracion.service';
import { urlFoto } from '../../productos';

/** Una casilla del mosaico: o una foto de la sesión, o una pieza de arte. */
export type Pieza =
  | { clase: 'foto'; src: string }
  | { clase: 'arte'; arte: Arte };

/**
 * Reparte el arte entre las fotos a intervalos regulares en vez de dejarlo
 * todo junto: con 80 fotos y 12 piezas cae una cada ~7 casillas, así el arte
 * aparece durante todo el recorrido y no en un bloque al principio.
 */
function mezclar(fotos: string[], arte: Arte[]): Pieza[] {
  if (!arte.length) return fotos.map((src) => ({ clase: 'foto', src }));

  const paso = Math.max(2, Math.floor((fotos.length + arte.length) / arte.length));
  const piezas: Pieza[] = [];
  let porColocar = 0;

  fotos.forEach((src, i) => {
    // El arte nunca abre el mosaico: las primeras casillas son fotos reales,
    // que es lo que el visitante espera al entrar a "galería".
    if (i > 0 && i % paso === 0 && porColocar < arte.length) {
      piezas.push({ clase: 'arte', arte: arte[porColocar++] });
    }
    piezas.push({ clase: 'foto', src });
  });

  // Lo que no cupo por intervalos se añade al final para no perder ninguna pieza.
  while (porColocar < arte.length) piezas.push({ clase: 'arte', arte: arte[porColocar++] });
  return piezas;
}

@Component({
  selector: 'app-galeria',
  imports: [],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria {
  private readonly cfg = inject(ConfiguracionService);
  // inject(ElementRef<HTMLElement>) no transporta el genérico y deja
  // nativeElement como `any`: hay que pasarlo en el propio inject.
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly urlFoto = urlFoto;

  /** Quien pide menos movimiento ve el mosaico quieto y ya montado. */
  private readonly reducido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Fotos de la galería: las del panel si hay, o las de marca por defecto. */
  private readonly fotos = computed(() => {
    const g = this.cfg.galeria();
    return g.length ? g : FOTOS;
  });

  /** El mosaico completo: fotos y arte intercalados. */
  readonly piezas = computed(() => mezclar(this.fotos(), ARTE));

  /** Pieza abierta en el visor (null = solo el mosaico). */
  readonly ampliada = signal<Pieza | null>(null);

  /** Limpiezas de las animaciones ya montadas, para no duplicarlas. */
  private readonly montadas = new WeakSet<Element>();
  private readonly limpiezas: VoidFunction[] = [];

  constructor() {
    afterNextRender(() => this.animar());

    // La configuración llega async: cuando cambia la lista, las casillas nuevas
    // también reciben su animación (el WeakSet evita repetir las ya montadas).
    effect(() => {
      this.piezas();
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => this.animar());
    });

    this.destroyRef.onDestroy(() => {
      for (const fin of this.limpiezas) fin();
      this.limpiezas.length = 0;
    });
  }

  private animar(): void {
    const casillas = this.host.nativeElement.querySelectorAll<HTMLElement>('.pic');

    casillas.forEach((casilla, i) => {
      if (this.montadas.has(casilla)) return;
      this.montadas.add(casilla);

      if (this.reducido) {
        casilla.style.opacity = '1';
        return;
      }

      // Entrada: solo opacidad y transform (nunca alto/ancho, que reflowean).
      // El escalonado va por columna, no por índice global: con ~90 casillas
      // un stagger acumulado dejaría las últimas esperando varios segundos.
      const fin = inView(
        casilla,
        () => {
          // El fotograma final se escribe entero. Con 'none' motion no lo lee
          // como "sin transform": interpola hacia los valores que faltan y la
          // escala acaba en 0, dejando la casilla en 0×0 y la galería vacía.
          animate(
            casilla,
            {
              opacity: [0, 1],
              transform: ['translateY(26px) scale(0.97)', 'translateY(0px) scale(1)'],
            },
            { duration: 0.5, delay: (i % 4) * 0.05, ease: [0.22, 1, 0.36, 1] },
          );
        },
        { amount: 0.15 },
      );
      this.limpiezas.push(fin);

      if (!casilla.classList.contains('pic-arte')) return;

      // Parallax solo en el arte: el medio se desplaza dentro de su marco
      // mientras la casilla pasa por pantalla. Va sobre el <img>/<video>
      // interior y no sobre la casilla, para no pisar la animación de entrada.
      const medio = casilla.querySelector<HTMLElement>('.pic-medio');
      if (medio) {
        this.limpiezas.push(
          scroll(
            animate(medio, { transform: ['translateY(-6%)', 'translateY(6%)'] }, { ease: 'linear' }),
            { target: casilla, offset: ['start end', 'end start'] },
          ),
        );
      }

      // El arte en video solo corre mientras se ve: fuera de pantalla se pausa
      // y se rebobina, que si no son tres videos gastando batería a la vez.
      if (medio instanceof HTMLVideoElement) {
        this.limpiezas.push(
          inView(
            casilla,
            () => {
              void medio.play().catch(() => {});
              return () => medio.pause();
            },
            { amount: 0.25 },
          ),
        );
      }
    });
  }

  /** Ruta del medio de una pieza, ya sea foto de la sesión o arte local. */
  src(p: Pieza): string {
    return p.clase === 'foto' ? this.urlFoto(p.src) : `arte/${p.arte.archivo}`;
  }

  alt(p: Pieza): string {
    return p.clase === 'foto' ? 'Foto Crunchy Munch' : p.arte.alt;
  }

  abrir(p: Pieza): void {
    this.ampliada.set(p);
  }

  cerrar(): void {
    this.ampliada.set(null);
  }

  // Disuade la descarga directa (clic derecho / arrastrar). No es infalible:
  // una captura siempre es posible; por eso cada pieza lleva la marca de agua.
  bloquear(ev: Event): void {
    ev.preventDefault();
  }
}
