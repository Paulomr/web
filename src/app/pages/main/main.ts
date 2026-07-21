import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto, urlFoto } from '../../productos';
import { Carrito } from '../../carrito';
import { DetalleProducto } from '../../detalle-producto';
import { ProductosService } from '../../productos.service';
import { ConfiguracionService } from '../../configuracion.service';
import { HeroSelector } from '../../components/hero-selector/hero-selector';

@Component({
  selector: 'app-main',
  imports: [RouterLink, HeroSelector],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  readonly carrito = inject(Carrito);
  readonly detalle = inject(DetalleProducto);
  readonly cfg = inject(ConfiguracionService);
  private readonly productosSvc = inject(ProductosService);
  readonly urlFoto = urlFoto;

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
}
