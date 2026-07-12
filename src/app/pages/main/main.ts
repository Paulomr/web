import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../productos';
import { Carrito } from '../../carrito';
import { DetalleProducto } from '../../detalle-producto';
import { ProductosService } from '../../productos.service';

@Component({
  selector: 'app-main',
  imports: [RouterLink],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements AfterViewInit {
  readonly carrito = inject(Carrito);
  readonly detalle = inject(DetalleProducto);
  private readonly productosSvc = inject(ProductosService);

  /** Productos con foto, repartidos en tres cintas (marquee). Reacciona al
      menú del servicio (local al inicio; base de datos si llega). */
  private readonly filas = computed(() => {
    const conFoto = this.productosSvc.productos().filter((p) => p.fotos.length > 0);
    const tercio = Math.ceil(conFoto.length / 3);
    return [conFoto.slice(0, tercio), conFoto.slice(tercio, tercio * 2), conFoto.slice(tercio * 2)];
  });
  readonly filaA = computed(() => this.filas()[0]);
  readonly filaB = computed(() => this.filas()[1]);
  readonly filaC = computed(() => this.filas()[2]);

  /** Tocar un producto del menú vivo abre su tarjeta ampliada. */
  abrir(p: Producto): void {
    this.detalle.abrir(p);
  }

  /** Sección alta que gobierna el hero expandible (progreso 0 → 1). */
  @ViewChild('expandEl') private expandEl?: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    this.onScroll();
  }

  // El progreso del scroll se escribe como variable CSS (--p) directamente en
  // el DOM: la interpolación de tamaños/posiciones vive en el CSS y no pasa
  // por change detection (innecesaria a esta frecuencia).
  @HostListener('window:scroll')
  onScroll(): void {
    const el = this.expandEl?.nativeElement;
    if (!el) return;
    const recorrible = el.offsetHeight - window.innerHeight;
    const p = recorrible > 0 ? Math.min(1, Math.max(0, window.scrollY / recorrible)) : 1;
    el.style.setProperty('--p', p.toFixed(4));
  }
}
