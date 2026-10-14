import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { animate } from 'motion';
import { ProductosService } from '../../productos.service';
import {
  ANCLA_LANZAMIENTO,
  LANZAMIENTO_RESPALDO,
  MINI_LANZAMIENTO,
  buscarLanzamiento,
} from '../../lanzamiento';

/** Recuerda el cierre por producto: si mañana sale otra galleta, vuelve a salir. */
const CLAVE = 'cm-cartel-lanzamiento';

// Cartel de aviso de la portada: la cápsula horizontal que baja del notch al
// entrar y anuncia la galleta nueva.
//
// Se retira solo. No es un banner que se queda estorbando: entra a los 900 ms,
// espera, y en cuanto el visitante llega a la sección del lanzamiento se va,
// porque ya cumplió. La ✕ sí es definitiva y se guarda.
//
// Vive en la portada y no en `app.html` a propósito: es el saludo de la home,
// no un rótulo que deba seguir al visitante por el catálogo o los minijuegos.
@Component({
  selector: 'app-cartel-nuevo',
  imports: [],
  templateUrl: './cartel-nuevo.html',
  styleUrl: './cartel-nuevo.css',
})
export class CartelNuevo {
  private readonly productosSvc = inject(ProductosService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly caja = viewChild<ElementRef<HTMLElement>>('caja');

  readonly mini = MINI_LANZAMIENTO;

  readonly reducido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** En el DOM o no. Arranca fuera: el cartel no compite con la carga. */
  readonly montado = signal(false);

  readonly nombre = computed(
    () => buscarLanzamiento(this.productosSvc.productos())?.nombre || LANZAMIENTO_RESPALDO.nombre,
  );

  private temporizador = 0;
  private entrado = false;

  constructor() {
    afterNextRender(() => {
      if (this.cerradoAntes()) return;
      this.temporizador = window.setTimeout(() => this.montado.set(true), 900);
      this.vigilarLlegada();
    });

    // La entrada se lanza cuando el elemento existe de verdad, no al pedirlo:
    // con `@if` el nodo no está hasta que Angular vuelve a pintar.
    effect(() => {
      const caja = this.caja()?.nativeElement;
      if (!caja || this.entrado) return;
      this.entrado = true;
      if (this.reducido) return;
      animate(
        caja,
        { opacity: [0, 1], transform: ['translateY(-28px) scale(0.94)', 'translateY(0px) scale(1)'] },
        { duration: 0.62, ease: [0.22, 1.16, 0.36, 1] },
      );
    });

    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  /** Bajar hasta la sección del lanzamiento. */
  ir(): void {
    document.getElementById(ANCLA_LANZAMIENTO)?.scrollIntoView({
      behavior: this.reducido ? 'auto' : 'smooth',
      block: 'center',
    });
  }

  /** La ✕: se va y no vuelve para este producto. */
  cerrar(): void {
    this.recordarCierre();
    void this.salir();
  }

  /**
   * Cuando la sección del lanzamiento entra en pantalla, el cartel sobra: el
   * visitante ya está donde el cartel quería llevarlo. Se retira sin guardar
   * nada, así que en la próxima visita vuelve a anunciarse.
   */
  private vigilarLlegada(): void {
    const destino = document.getElementById(ANCLA_LANZAMIENTO);
    if (!destino) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        clearTimeout(this.temporizador);
        if (this.montado()) void this.salir();
        else this.montado.set(false);
      },
      { threshold: 0.15 },
    );
    io.observe(destino);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  /** Salida: más corta que la entrada, que es como se siente responsivo. */
  private async salir(): Promise<void> {
    const caja = this.caja()?.nativeElement;
    if (caja && !this.reducido) {
      await animate(
        caja,
        { opacity: [1, 0], transform: ['translateY(0px) scale(1)', 'translateY(-22px) scale(0.94)'] },
        { duration: 0.34, ease: 'easeIn' },
      ).finished.catch(() => {});
    }
    this.montado.set(false);
  }

  private cerradoAntes(): boolean {
    try {
      return localStorage.getItem(CLAVE) === ANCLA_LANZAMIENTO;
    } catch {
      // Navegación privada o cookies bloqueadas: se muestra, que es lo sano.
      return false;
    }
  }

  private recordarCierre(): void {
    try {
      localStorage.setItem(CLAVE, ANCLA_LANZAMIENTO);
    } catch {
      /* si no se puede guardar, el cartel simplemente volverá a salir */
    }
  }
}
