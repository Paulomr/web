import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { animate, inView } from 'motion';
import { CuentaService } from '../../cuenta.service';
import { PostulacionesService } from '../../postulaciones.service';
import { NuevaPostulacion, PASOS, revisarPostulacion } from '../../postulaciones';

// Página /postula: la convocatoria para montar un carrito de Crunchy Munch
// dentro del local de otra gente.
//
// Van tres bloques, en este orden:
//   a) el recorrido — el video del carrito de calle avanza con el scroll y va
//      soltando los cinco recuadros de PASOS;
//   b) el formulario de postulación (NO pide cuenta);
//   c) la lista de aprobados con sus votos (votar SÍ pide cuenta).
//
// La ruta se carga diferida a propósito: arrastra un MP4 de 5 MB que no tiene
// por qué pesar en la portada.
//
// La técnica del recorrido es la misma del hero de la portada: sección alta con
// un bloque `sticky` dentro, un bucle de `requestAnimationFrame` que traduce el
// avance del scroll a `video.currentTime` con suavizado, y el progreso (0–1)
// publicado como variable CSS `--p` para que los recuadros entren y salgan con
// `clamp()` sin pasar por la detección de cambios.

/** Los campos del formulario, en el orden en que se preguntan. */
const CAMPOS = ['negocio', 'instagram', 'otraRed', 'ciudad', 'direccion'] as const;
type Campo = (typeof CAMPOS)[number];

/**
 * Una postulación que el contrato da por buena. Sirve de fondo para probar los
 * campos de uno en uno: así se sabe CUÁL campo falla sin repetir aquí las
 * reglas de `revisarPostulacion()`, que es el único sitio donde viven.
 */
const RELLENO: NuevaPostulacion = {
  negocio: 'Negocio',
  instagram: '@negocio',
  otraRed: '',
  ciudad: 'Ciudad',
  direccion: 'Calle 10 #5-20',
};

@Component({
  selector: 'app-postula',
  imports: [FormsModule],
  templateUrl: './postula.html',
  styleUrl: './postula.css',
})
export class Postula {
  readonly cuenta = inject(CuentaService);
  readonly postulaciones = inject(PostulacionesService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly pegado = viewChild.required<ElementRef<HTMLElement>>('pegado');
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly recuadros = viewChildren<ElementRef<HTMLElement>>('recuadro');
  private readonly cajaForm = viewChild<ElementRef<HTMLElement>>('cajaForm');
  private readonly cajaLista = viewChild<ElementRef<HTMLElement>>('cajaLista');
  private readonly campoPin = viewChild<ElementRef<HTMLInputElement>>('campoPin');

  /** Los recuadros del recorrido y sus tramos: vienen del contrato tal cual. */
  readonly pasos = PASOS;

  readonly fuente = 'video/carrito-calle.mp4';
  readonly poster = 'video/carrito-calle.webp';

  /** Quien pide menos movimiento no recibe un video que se mueve con el scroll:
      se queda el póster como fotograma fijo y los cinco recuadros en columna. */
  readonly reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Formulario de postulación ----
  readonly negocio = signal('');
  readonly instagram = signal('');
  readonly otraRed = signal('');
  readonly ciudad = signal('');
  readonly direccion = signal('');
  readonly enviando = signal(false);
  readonly error = signal('');
  /** Campo señalado por el aviso (para pintarlo y para `aria-invalid`). */
  readonly campoMal = signal<Campo | ''>('');
  readonly exito = signal(false);

  // ---- Votación ----
  /** id del negocio cuyo cajón de código está abierto, o '' si ninguno. */
  readonly votando = signal('');
  readonly pin = signal('');
  readonly errorVoto = signal('');
  readonly votoEnCurso = signal(false);

  /** Progreso del scroll (0–1) y su versión suavizada, que es la que manda. */
  private objetivo = 0;
  private suave = 0;
  private raf = 0;
  private corriendo = false;

  constructor() {
    // Si el endpoint todavía no existe o falla, el servicio deja la lista
    // vacía y marca `cargado`: la página enseña el aviso de "aún no hay
    // negocios" y sigue funcionando.
    void this.postulaciones.cargar();

    afterNextRender(() => {
      this.arrancar();
      this.entradas();
    });

    // Al abrir el cajón del código, el foco salta al campo: quien vota con
    // teclado no tiene que ir a buscarlo.
    effect(() => {
      if (!this.votando()) return;
      setTimeout(() => this.campoPin()?.nativeElement.focus(), 0);
    });
  }

  // =========================================================================
  // a) El recorrido
  // =========================================================================

  private arrancar(): void {
    const v = this.video().nativeElement;
    // El atributo `muted` del HTML no fija la propiedad cuando Angular crea el
    // elemento: hay que ponerla a mano o el navegador no decodifica.
    v.muted = true;

    // Cada recuadro lleva su tramo del recorrido en dos variables CSS. El CSS
    // las compara con `--p` y decide la entrada y la salida; aquí no se toca
    // ninguna opacidad por cuadro.
    this.recuadros().forEach((r, i) => {
      const paso = this.pasos[i];
      if (!paso) return;
      r.nativeElement.style.setProperty('--desde', String(paso.desde));
      r.nativeElement.style.setProperty('--hasta', String(paso.hasta));
    });

    if (this.reducido) {
      // Con movimiento reducido el MP4 ni se descarga (el `preload` va en
      // 'none'): queda el póster, y los recuadros se leen todos en columna.
      this.pintar(0);
      return;
    }

    // iOS solo decodifica un video que alguna vez se haya reproducido: se
    // arranca y se pausa de inmediato (en silencio no necesita permiso).
    const desbloquear = () =>
      void v
        .play()
        .then(() => v.pause())
        .catch(() => {});
    v.addEventListener('loadeddata', desbloquear, { once: true });
    window.addEventListener('pointerdown', desbloquear, { once: true, passive: true });

    // El bucle solo gira mientras el recorrido está en pantalla.
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
    this.suave += dif * 0.16;
    if (Math.abs(dif) < 0.0005) this.suave = this.objetivo;

    this.pintar(this.suave);

    const v = this.video().nativeElement;
    const dur = v.duration;
    if (!dur || !Number.isFinite(dur)) return;

    const t = this.suave * (dur - 0.06);
    // Mientras el decodificador está buscando no se le encima otra petición:
    // el siguiente cuadro usará ya el valor más reciente. Pedirle un salto por
    // cuadro es justo lo que hace que el scrubbing se atasque.
    if (!v.seeking && Math.abs(v.currentTime - t) > 0.01) v.currentTime = t;
  };

  private pintar(p: number): void {
    (this.host.nativeElement as HTMLElement).style.setProperty('--p', p.toFixed(4));
  }

  /** Entrada del formulario y de la lista cuando se asoman. */
  private entradas(): void {
    if (this.reducido) return;
    const sueltas: (() => void)[] = [];
    for (const ref of [this.cajaForm(), this.cajaLista()]) {
      const el = ref?.nativeElement;
      if (!el) continue;
      sueltas.push(
        inView(
          el,
          () => {
            // Los fotogramas de `transform` se escriben COMPLETOS. Motion no
            // entiende 'none' como "sin transform": interpola hacia lo que
            // falta y la escala acaba en 0 (la sección desaparece sin dar
            // ningún error de compilación).
            animate(
              el,
              {
                opacity: [0, 1],
                transform: ['translateY(26px) scale(0.985)', 'translateY(0px) scale(1)'],
              },
              { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
            );
          },
          { amount: 0.12 },
        ),
      );
    }
    this.destroyRef.onDestroy(() => sueltas.forEach((s) => s()));
  }

  // =========================================================================
  // b) Postular
  // =========================================================================

  /** Lo que hay escrito ahora mismo, con la forma que pide el contrato. */
  private formulario(): NuevaPostulacion {
    return {
      negocio: this.negocio(),
      instagram: this.instagram(),
      otraRed: this.otraRed(),
      ciudad: this.ciudad(),
      direccion: this.direccion(),
    };
  }

  /**
   * Primer campo que el contrato rechaza, con su aviso. Se prueba campo a
   * campo sobre un relleno válido porque `revisarPostulacion()` devuelve un
   * solo texto y aquí hace falta saber junto a qué campo pegarlo.
   */
  private primerFallo(p: NuevaPostulacion): { campo: Campo | ''; aviso: string } {
    for (const campo of CAMPOS) {
      const aviso = revisarPostulacion({ ...RELLENO, [campo]: p[campo] });
      if (aviso) return { campo, aviso };
    }
    // Red de seguridad: si algún día el contrato mira dos campos a la vez, el
    // aviso general sigue saliendo aunque no se sepa dónde señalarlo.
    return { campo: '', aviso: revisarPostulacion(p) };
  }

  async enviar(): Promise<void> {
    if (this.enviando()) return;

    const p = this.formulario();
    const { campo, aviso } = this.primerFallo(p);
    if (aviso) {
      this.campoMal.set(campo);
      this.error.set(aviso);
      if (campo) {
        const el = this.host.nativeElement.querySelector('[name="' + campo + '"]');
        (el as HTMLElement | null)?.focus();
      }
      return;
    }

    this.campoMal.set('');
    this.error.set('');
    this.enviando.set(true);
    try {
      const r = await this.postulaciones.postular(p);
      if (!r.ok) {
        this.error.set(r.error || 'No se pudo enviar. Intenta de nuevo.');
        return;
      }
      this.exito.set(true);
      this.negocio.set('');
      this.instagram.set('');
      this.otraRed.set('');
      this.ciudad.set('');
      this.direccion.set('');
    } finally {
      this.enviando.set(false);
    }
  }

  /** Vuelve al formulario en blanco para postular otro local. */
  otroNegocio(): void {
    this.exito.set(false);
    this.error.set('');
    this.campoMal.set('');
  }

  // =========================================================================
  // c) Votar
  // =========================================================================

  /** Perfil del negocio, para poder mirarlo antes de votar. */
  enlaceIg(instagram: string): string {
    return 'https://instagram.com/' + instagram.replace(/^@+/, '');
  }

  /** Abre el cajón del código; sin cuenta, manda primero a crearla. */
  pedirVoto(id: string): void {
    if (!this.cuenta.registrado()) {
      this.cuenta.abrir('registro');
      return;
    }
    this.errorVoto.set('');
    this.pin.set('');
    this.votando.set(this.votando() === id ? '' : id);
  }

  cancelarVoto(): void {
    this.votando.set('');
    this.pin.set('');
    this.errorVoto.set('');
  }

  async confirmarVoto(id: string): Promise<void> {
    if (this.votoEnCurso()) return;
    if (!/^\d{4}$/.test(this.pin())) {
      this.errorVoto.set('Escribe tu código de 4 dígitos.');
      return;
    }

    this.votoEnCurso.set(true);
    this.errorVoto.set('');
    try {
      const r = await this.postulaciones.votar(id, this.pin());
      if (!r.ok) {
        this.errorVoto.set(r.error || 'No se pudo registrar tu voto.');
        return;
      }
      this.votando.set('');
      this.pin.set('');
    } finally {
      this.votoEnCurso.set(false);
    }
  }
}
