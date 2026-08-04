import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CuentaService } from '../../cuenta.service';

// Hero de la portada: el video de la caja, contado con el scroll.
//
// La sección mide varias pantallas de alto y dentro lleva un bloque `sticky`
// que se queda pegado ocupando la ventana. Lo que el visitante avanza en esa
// sección se traduce a un instante del video (0 → 8 s): dentro de la caja,
// Bearnie asomándose, la caja saliendo volando, el destello y el cielo.
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

  /** Pantalla más alta que ancha: usa el recorte vertical (9:16), que además
      pesa la tercera parte y encuadra a Bearnie mucho mejor en el teléfono. */
  private readonly vertical = window.matchMedia('(max-aspect-ratio: 1/1)').matches;

  /** Quien pide menos movimiento no recibe un video que se mueve al scroll:
      se le deja el fotograma final (el cielo) con el saludo ya visible. */
  readonly reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  readonly fuente = this.vertical ? 'video/hero-caja-alto.mp4' : 'video/hero-caja-ancho.mp4';
  readonly poster = this.vertical ? 'video/hero-caja-alto.webp' : 'video/hero-caja-ancho.webp';

  /** Ritmo del video que se cargó. Son dos tomas distintas y cada una cuenta a
      su tiempo, así que los textos no pueden entrar en los mismos puntos:
      el vertical dura 6,7 s y los ositos se quedan asomados más rato; el ancho
      dura 8 s, los ositos se asoman enseguida (p 0.03) y se hunden fuera de
      cuadro hacia p 0.38, y el destello llega mucho más tarde (blanco pleno en
      p 0.64, cielo limpio desde p 0.74). Valores en fracción del recorrido (0–1). */
  private readonly ritmo = this.vertical
    ? { pistaFin: 0.13, susurroIni: 0.13, susurroFin: 0.5, veloIni: 0.6, finalIni: 0.63 }
    : { pistaFin: 0.1, susurroIni: 0.11, susurroFin: 0.37, veloIni: 0.6, finalIni: 0.66 };

  /** El bloque final (saludo) ya es visible: solo entonces se puede tocar. */
  readonly finalActivo = signal(false);

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
      ([e]) => (e.isIntersecting ? this.encender() : this.apagar()),
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
