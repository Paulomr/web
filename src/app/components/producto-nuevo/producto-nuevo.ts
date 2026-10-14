import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { animate, inView } from 'motion';
import { formatoCOP, precioNumero } from '../../carrito';
import { DetalleProducto } from '../../detalle-producto';
import { ProductosService } from '../../productos.service';
import {
  ANCLA_LANZAMIENTO,
  AURA_LANZAMIENTO,
  FOTO_LANZAMIENTO,
  LANZAMIENTO_RESPALDO,
  buscarLanzamiento,
} from '../../lanzamiento';
import { RUTA_POSTULA } from '../../postulaciones';

// Sección de terciopelo: dos ventanas del mismo tamaño sobre tela roja.
//
// Es un paréntesis a propósito. Toda la web es crema y pastel; aquí la página
// se apaga durante una pantalla para que solo brillen las dos novedades, y
// vuelve al crema enseguida. Es el recurso de una vitrina forrada.
//
// Las dos ventanas son gemelas y cada una se explica sola: la de la izquierda
// es un póster impreso (la galleta nueva), la de la derecha es el mismo marco
// pero con el carrito en movimiento (la convocatoria). Misma medida, mismo
// halo, mismo canto: lo único que cambia es que una se mueve.
//
// El rojo no es un rojo cualquiera: sale del esmalte de uñas de la propia foto
// (#8d120c, muestreado del original), así que el terciopelo y el póster son la
// misma paleta y no dos piezas pegadas. Y los halos tampoco están dibujados:
// son copias diminutas de cada imagen, desenfocadas detrás — la luz que tira
// cada ventana sobre la tela.
@Component({
  selector: 'app-producto-nuevo',
  imports: [RouterLink],
  templateUrl: './producto-nuevo.html',
  styleUrl: './producto-nuevo.css',
})
export class ProductoNuevo {
  private readonly productosSvc = inject(ProductosService);
  private readonly detalle = inject(DetalleProducto);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly marco = viewChild.required<ElementRef<HTMLElement>>('marco');
  private readonly texto = viewChild.required<ElementRef<HTMLElement>>('texto');
  private readonly marcoDos = viewChild.required<ElementRef<HTMLElement>>('marcoDos');
  private readonly textoDos = viewChild.required<ElementRef<HTMLElement>>('textoDos');
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  readonly ancla = ANCLA_LANZAMIENTO;
  readonly foto = FOTO_LANZAMIENTO;
  readonly aura = AURA_LANZAMIENTO;
  readonly rutaPostula = RUTA_POSTULA;

  readonly reducido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** El producto del menú vigente (base de datos si respondió, local si no). */
  readonly producto = computed(() => buscarLanzamiento(this.productosSvc.productos()));

  readonly nombre = computed(() => this.producto()?.nombre || LANZAMIENTO_RESPALDO.nombre);
  readonly descripcion = computed(
    () => this.producto()?.descripcion || LANZAMIENTO_RESPALDO.descripcion,
  );
  readonly detalleCorto = computed(() => this.producto()?.detalle || LANZAMIENTO_RESPALDO.detalle);

  /**
   * Precio ya formateado. El panel guardó este producto como "16000" en crudo,
   * sin separadores ni signo, y así se pinta hoy en el catálogo. Aquí se
   * normaliza con el mismo helper que usa el carrito, de modo que tanto
   * "16000" como "$ 15.000" salgan iguales.
   */
  readonly precio = computed(() => {
    const p = this.producto();
    const valor = precioNumero(p);
    if (valor > 0) return formatoCOP(valor);
    return p?.precio || LANZAMIENTO_RESPALDO.precio;
  });

  constructor() {
    afterNextRender(() => this.arrancar());
  }

  /** Abre la tarjeta del producto (la misma del catálogo) para pedirlo. */
  ordenar(): void {
    const p = this.producto();
    if (p) {
      this.detalle.abrir(p);
      return;
    }
    // Sin menú no hay tarjeta que abrir: el catálogo es la salida honesta.
    void this.router.navigate(['/catalogo']);
  }

  private arrancar(): void {
    this.prepararVideo();
    if (this.reducido) return;

    // La clase se pone desde el código, nunca desde el CSS: si este bloque no
    // llega a correr, la sección se queda visible en vez de invisible.
    const host = this.host.nativeElement as HTMLElement;
    host.classList.add('anima');

    // Cada ventana entra por su cuenta al asomarse, así que bajando despacio
    // la segunda no aparece ya puesta antes de llegar a ella.
    const parar = [
      this.entrada(this.marco().nativeElement, this.texto().nativeElement),
      this.entrada(this.marcoDos().nativeElement, this.textoDos().nativeElement),
    ];
    this.destroyRef.onDestroy(() => parar.forEach((p) => p()));
  }

  /**
   * Anima una ventana y su pie cuando asoma. Se vigila el marco y no la
   * sección entera: la sección puede ser más alta que la ventana del
   * navegador, y entonces un `amount` alto no se cumpliría nunca.
   */
  private entrada(marco: HTMLElement, texto: HTMLElement): VoidFunction {
    return inView(
      marco,
      () => {
        // Los fotogramas de `transform` se escriben COMPLETOS. Motion no
        // entiende 'none' como "sin transform": interpola hacia lo que falta y
        // la escala acaba en 0 (el elemento desaparece sin dar ningún error).
        animate(
          marco,
          {
            opacity: [0, 1],
            transform: ['translateY(40px) scale(0.94)', 'translateY(0px) scale(1)'],
          },
          { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
        );
        animate(
          texto,
          { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0px)'] },
          { duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] },
        );
      },
      { amount: 0.3 },
    );
  }

  /**
   * El bucle del carrito solo corre mientras se ve. Es decoración: dejarlo
   * girando fuera de pantalla gasta batería sin que nadie lo mire. Y con
   * `preload="none"` sus 545 kB no se descargan hasta que hace falta, que es
   * lo que mantiene ligera la portada.
   */
  private prepararVideo(): void {
    const v = this.video().nativeElement;
    // El atributo `muted` del HTML no fija la propiedad cuando Angular crea el
    // elemento: hay que ponerla a mano o el navegador no deja reproducir solo.
    v.muted = true;

    if (this.reducido) {
      // Con menos movimiento se queda el póster quieto: ni se descarga.
      return;
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);

    this.destroyRef.onDestroy(() => {
      io.disconnect();
      v.pause();
    });
  }
}
