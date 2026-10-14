import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
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
import {
  AURA_TEMPORADA,
  FOTO_TEMPORADA,
  HASTA_TEMPORADA,
  INGREDIENTES_TEMPORADA,
  enTemporada,
  esDeTemporada,
} from '../../temporada';
import { Producto } from '../../productos';

// Sección de terciopelo: dos pósters del mismo tamaño sobre tela roja.
//
// Es un paréntesis a propósito. Toda la web es crema y pastel; aquí la página
// se apaga durante una pantalla para que solo brillen las dos novedades, y
// vuelve al crema enseguida. Es el recurso de una vitrina forrada.
//
// Las dos ventanas son gemelas: a la izquierda la galleta nueva, a la derecha
// el producto de temporada (el Dracula Milkshake, hasta el 31 de octubre).
// Misma medida, mismo halo, mismo canto. Pasada la temporada la segunda se va
// sola y la galleta se queda en el centro.
//
// El rojo no es un rojo cualquiera: sale del esmalte de uñas de la propia foto
// (#8d120c, muestreado del original), así que el terciopelo y el póster son la
// misma paleta y no dos piezas pegadas. Para el Drácula el terciopelo rojo es,
// además, el forro de la capa. Y los halos tampoco están dibujados: son copias
// diminutas de cada póster, desenfocadas detrás — la luz que tira cada ventana
// sobre la tela.
@Component({
  selector: 'app-producto-nuevo',
  imports: [],
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
  // La segunda ventana va dentro de un @if (solo existe en temporada).
  private readonly marcoDos = viewChild<ElementRef<HTMLElement>>('marcoDos');
  private readonly textoDos = viewChild<ElementRef<HTMLElement>>('textoDos');

  readonly ancla = ANCLA_LANZAMIENTO;
  readonly foto = FOTO_LANZAMIENTO;
  readonly aura = AURA_LANZAMIENTO;
  readonly fotoTemporada = FOTO_TEMPORADA;
  readonly auraTemporada = AURA_TEMPORADA;
  readonly ingredientesTemporada = INGREDIENTES_TEMPORADA;
  readonly hastaTemporada = HASTA_TEMPORADA;

  readonly reducido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** El producto del menú vigente (base de datos si respondió, local si no). */
  readonly producto = computed(() => buscarLanzamiento(this.productosSvc.productos()));

  readonly nombre = computed(() => this.producto()?.nombre || LANZAMIENTO_RESPALDO.nombre);
  readonly descripcion = computed(
    () => this.producto()?.descripcion || LANZAMIENTO_RESPALDO.descripcion,
  );
  readonly detalleCorto = computed(() => this.producto()?.detalle || LANZAMIENTO_RESPALDO.detalle);

  /** El panel guardó este producto con el precio en crudo ("16000"). */
  readonly precio = computed(() => precioBonito(this.producto(), LANZAMIENTO_RESPALDO.precio));

  /**
   * El producto de temporada, mientras dure. Sale del menú vigente, que ya lo
   * trae metido (ver temporada.ts): así la ventana, el catálogo y el carrito
   * hablan del mismo producto, y si el panel lo crea con otro precio, manda el
   * del panel.
   */
  readonly temporada = computed(() =>
    enTemporada() ? this.productosSvc.productos().find(esDeTemporada) : undefined,
  );

  readonly precioTemporada = computed(() => precioBonito(this.temporada(), ''));

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

  /** Abre la tarjeta del de temporada. Su sabor es fijo: se agrega directo. */
  ordenarTemporada(): void {
    const p = this.temporada();
    if (p) this.detalle.abrir(p);
  }

  private arrancar(): void {
    if (this.reducido) return;

    // La clase se pone desde el código, nunca desde el CSS: si este bloque no
    // llega a correr, la sección se queda visible en vez de invisible.
    const host = this.host.nativeElement as HTMLElement;
    host.classList.add('anima');

    // Cada ventana entra por su cuenta al asomarse, así que bajando despacio
    // la segunda no aparece ya puesta antes de llegar a ella.
    const parar = [this.entrada(this.marco().nativeElement, this.texto().nativeElement)];
    const marcoDos = this.marcoDos()?.nativeElement;
    const textoDos = this.textoDos()?.nativeElement;
    if (marcoDos && textoDos) parar.push(this.entrada(marcoDos, textoDos));
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
}

/**
 * Precio ya formateado. El panel guarda a veces el precio en crudo ("16000",
 * sin separadores ni signo); aquí se normaliza con el mismo helper del carrito,
 * de modo que "16000" y "$ 15.000" salgan iguales.
 */
function precioBonito(p: Producto | undefined, respaldo: string): string {
  const valor = precioNumero(p);
  if (valor > 0) return formatoCOP(valor);
  return p?.precio || respaldo;
}
