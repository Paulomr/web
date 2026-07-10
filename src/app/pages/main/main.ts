import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PRODUCTOS, Producto } from '../../productos';
import { Carrito } from '../../carrito';
import { DetalleProducto } from '../../detalle-producto';

interface Sede {
  nombre: string;
  direccion: string;
  foto: string;
  /** Enlace exacto de Google Maps (el corto oficial de la sede). */
  comoLlegar: string;
  /** Mapa embebido (aproximado por búsqueda del nombre). */
  mapa: SafeResourceUrl;
}

@Component({
  selector: 'app-main',
  imports: [RouterLink],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements AfterViewInit {
  readonly carrito = inject(Carrito);
  readonly detalle = inject(DetalleProducto);

  /** Productos con foto para las tres filas en movimiento (marquee). */
  readonly filaA: Producto[];
  readonly filaB: Producto[];
  readonly filaC: Producto[];

  readonly sedes: Sede[];

  constructor(sanitizer: DomSanitizer) {
    const conFoto = PRODUCTOS.filter((p) => p.fotos.length > 0);
    const tercio = Math.ceil(conFoto.length / 3);
    this.filaA = conFoto.slice(0, tercio);
    this.filaB = conFoto.slice(tercio, tercio * 2);
    this.filaC = conFoto.slice(tercio * 2);

    // Coordenadas exactas resueltas desde los enlaces cortos oficiales.
    // El mapa embebido usa OpenStreetMap (embebible sin clave ni bloqueos);
    // el botón "Cómo llegar" abre el pin exacto en Google Maps.
    const embed = (lat: number, lon: number) => {
      const d = 0.0045;
      const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
      return sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`,
      );
    };
    this.sedes = [
      {
        nombre: 'SEDE SAN ANTONIO',
        direccion: 'San Antonio de Pereira, Rionegro',
        foto: 'bearnie-1107.webp',
        comoLlegar: 'https://maps.app.goo.gl/rtGSKErLw9K45GoW9',
        mapa: embed(6.1309694, -75.3787989),
      },
      {
        nombre: 'SEDE MARINILLA',
        direccion: 'Marinilla, Antioquia',
        foto: 'bearnie-1262.webp',
        comoLlegar: 'https://maps.app.goo.gl/LGtExQPKwM9vYJ5NA',
        mapa: embed(6.1711354, -75.3388328),
      },
    ];
  }

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
