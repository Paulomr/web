import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CuentaService } from '../../cuenta.service';

// Hero de la portada: el video de Halloween, contado con el scroll.
//
// La sección mide varias pantallas de alto y dentro lleva un bloque `sticky`
// que se queda pegado ocupando la ventana. Lo que el visitante avanza en esa
// sección se traduce a un instante del video (0 → 5 s): desde el fondo de la
// caja de Halloween, Bearnie vestida de Drácula se asoma, abre la capa y los
// murciélagos estampados en la caja salen volando; la cámara sale con ellos
// a la noche, donde la luna es una galleta.
//
// El progreso (0–1) se publica como variable CSS `--p` sobre el componente, y
// las capas de texto se muestran/ocultan con `clamp()` en el CSS. Así el
// recorrido se pinta sin pasar por la detección de cambios de Angular.
@Component({
  selector: 'app-hero-video',
  imports: [],
  templateUrl: './hero-video.html',
  styleUrl: './hero-video.css',
})
export class HeroVideo {
  readonly cuenta = inject(CuentaService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly pegado = viewChild.required<ElementRef<HTMLElement>>('pegado');
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  /** Pantalla más alta que ancha: usa la toma vertical (9:16), que encuadra a
      Bearnie y la luna para el teléfono. */
  private readonly vertical = window.matchMedia('(max-aspect-ratio: 1/1)').matches;

  /** Quien pide menos movimiento no recibe un video que se mueve al scroll:
      se le deja el fotograma final (la luna) con el saludo ya visible. */
  readonly reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly fuente = this.vertical ? 'video/hero-halloween-alto.mp4' : 'video/hero-halloween-ancho.mp4';
  readonly poster = this.vertical ? 'video/hero-halloween-alto.webp' : 'video/hero-halloween-ancho.webp';

  /** Ritmo del video que se cargó, en fracción del recorrido (0–1). Son dos
      tomas distintas (Wan 3.0 Prime, 5 s cada una) y no van al mismo paso:
      en la ancha Bearnie abre la capa hacia el segundo 1,2 y sale de cuadro en
      el 2,9; en la vertical todo pasa medio segundo antes. El saludo entra
      cuando ella ya se fue y solo quedan la noche y la luna. */
  private readonly ritmo = this.vertical
    ? { pistaFin: 0.1, susurroIni: 0.1, susurroFin: 0.34, finalIni: 0.56 }
    : { pistaFin: 0.1, susurroIni: 0.1, susurroFin: 0.36, finalIni: 0.6 };

  /** El bloque final (saludo) ya es visible: solo entonces se puede tocar. */
  readonly finalActivo = signal(false);

  /**
   * El nombre partido en palabras y letras. Cada letra es una pieza suelta
   * porque flota por su cuenta (ver `.hv-l` en el CSS), y las palabras van
   * enteras para que un nombre largo se parta entre palabras y nunca a mitad.
   * `i` es la posición de la letra en todo el nombre: decide su giro, su
   * desfase al flotar y el orden en que aparece.
   */
  readonly letras = computed(() => {
    const nombre = this.cuenta.registrado() ? this.cuenta.primerNombre() : 'Crunchy Munch';
    let i = 0;
    return nombre
      .toUpperCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((palabra) => [...palabra].map((l) => ({ l, i: i++ })));
  });

  /** Cuántas letras tiene la palabra más larga: con eso el CSS calcula el
      tamaño para que ningún nombre se salga de la pantalla. */
  readonly largo = computed(() => Math.max(1, ...this.letras().map((p) => p.length)));

  /** Total de letras, para repartir la aparición de 0 a 1. */
  readonly total = computed(() => this.letras().reduce((n, p) => n + p.length, 0));

  /** Progreso del scroll (0–1) y su versión suavizada, que es la que manda. */
  private objetivo = 0;
  private suave = 0;
  private raf = 0;
  private corriendo = false;

  constructor() {
    afterNextRender(() => this.arrancar());
  }

  private arrancar(): void {
    const v = this.video().nativeElement;
    // El atributo `muted` del HTML no fija la propiedad cuando Angular crea el
    // elemento: hay que ponerla a mano o los navegadores no dejan decodificar.
    v.muted = true;

    // El ritmo del video se publica como variables CSS: el CSS decide con ellas
    // en qué punto del recorrido entra y sale cada capa de texto.
    const el = this.host.nativeElement as HTMLElement;
    for (const [clave, valor] of Object.entries(this.ritmo)) {
      el.style.setProperty(`--r-${clave.toLowerCase()}`, String(valor));
    }

    if (this.reducido) {
      this.pintar(1);
      this.finalActivo.set(true);
      v.addEventListener('loadeddata', () => (v.currentTime = Math.max(0, v.duration - 0.05)), {
        once: true,
      });
      return;
    }

    // iOS solo decodifica un video que alguna vez se haya reproducido: se
    // arranca y se pausa de inmediato (en silencio no necesita permiso).
    const desbloquear = () => void v.play().then(() => v.pause()).catch(() => {});
    v.addEventListener('loadeddata', desbloquear, { once: true });
    window.addEventListener('pointerdown', desbloquear, { once: true, passive: true });

    // El bucle solo gira mientras el hero está en pantalla.
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? this.encender() : this.salirDeCuadro()),
      { rootMargin: '15% 0px' },
    );
    io.observe(this.seccion().nativeElement);

    this.destroyRef.onDestroy(() => {
      io.disconnect();
      this.apagar();
    });
  }

  private encender(): void {
    if (this.corriendo) return;
    this.corriendo = true;
    // Al volver a entrar, arranca sincronizado (sin perseguir el valor viejo).
    this.medir();
    this.suave = this.objetivo;
    this.raf = requestAnimationFrame(this.bucle);
  }

  private apagar(): void {
    this.corriendo = false;
    cancelAnimationFrame(this.raf);
  }

  /**
   * El hero se fue de la pantalla: antes de parar el bucle, se pinta una vez
   * el avance real. Sin esto, un salto instantáneo (un ancla, o el navegador
   * restaurando la posición al recargar) deja congelado el último valor que
   * alcanzó a verse, y el saludo podía quedarse a medio aparecer.
   */
  private salirDeCuadro(): void {
    this.medir();
    this.suave = this.objetivo;
    this.pintar(this.objetivo);
    this.apagar();
  }

  /** Cuánto se ha recorrido de la sección: 0 al entrar, 1 al soltar el sticky. */
  private medir(): void {
    const r = this.seccion().nativeElement.getBoundingClientRect();
    // Se mide contra el alto real del bloque pegado (y no contra innerHeight):
    // en móvil la barra del navegador crece y encoge, y así no se descuadra.
    const recorrido = r.height - this.pegado().nativeElement.getBoundingClientRect().height;
    this.objetivo = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0;
  }

  private readonly bucle = (): void => {
    if (!this.corriendo) return;
    this.raf = requestAnimationFrame(this.bucle);

    this.medir();
    const dif = this.objetivo - this.suave;
    // Inercia: el video persigue al scroll con un pequeño retraso elástico.
    this.suave += dif * 0.18;
    if (Math.abs(dif) < 0.0005) this.suave = this.objetivo;

    this.pintar(this.suave);

    const v = this.video().nativeElement;
    const dur = v.duration;
    if (!dur || !Number.isFinite(dur)) return;

    const t = this.suave * (dur - 0.06);
    // Mientras el decodificador está buscando no se le encima otra petición:
    // el siguiente fotograma usará ya el valor más reciente. Pedirle un salto
    // por cuadro es justo lo que hace que el scrubbing se atasque.
    if (!v.seeking && Math.abs(v.currentTime - t) > 0.01) v.currentTime = t;
  };

  private pintar(p: number): void {
    (this.host.nativeElement as HTMLElement).style.setProperty('--p', p.toFixed(4));
    const activo = p > this.ritmo.finalIni;
    if (activo !== this.finalActivo()) this.finalActivo.set(activo);
  }
}
