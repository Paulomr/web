import { Injectable, signal } from '@angular/core';
import { PRODUCTOS, Producto } from './productos';

// Fuente del menú para toda la web.
//
// Red de seguridad: arranca SIEMPRE con el menú local (PRODUCTOS), así hay datos
// al instante y la web nunca queda en blanco. En segundo plano pregunta a la
// base de datos (/api/productos); si responde bien, reemplaza el menú por el de
// la base. Si la base falla o no está configurada, se queda el local: nada se rompe.
@Injectable({ providedIn: 'root' })
export class ProductosService {
  /** Menú vigente (local al inicio; se actualiza con el de la base si llega). */
  readonly productos = signal<Producto[]>(PRODUCTOS);

  /** true cuando el menú ya viene de la base de datos. */
  readonly desdeBase = signal(false);

  constructor() {
    void this.cargarDesdeBase();
  }

  private async cargarDesdeBase(): Promise<void> {
    try {
      const r = await fetch('/api/productos');
      if (!r.ok) return;
      const docs = (await r.json()) as unknown;
      if (!Array.isArray(docs) || docs.length === 0) return;

      const mapeados: Producto[] = docs.map((d) => ({
        id: String(d.slug),
        nombre: String(d.nombre ?? ''),
        descripcion: String(d.descripcion ?? ''),
        fotos: Array.isArray(d.fotos) ? d.fotos : [],
        precio: String(d.precio ?? ''),
        detalle: d.detalle ? String(d.detalle) : undefined,
        categoria: d.categoria,
        nuevo: d.nuevo ? true : undefined,
      }));

      this.productos.set(mapeados);
      this.desdeBase.set(true);
    } catch {
      /* sin conexión con la base: se mantiene el menú local */
    }
  }

  /** Busca un producto por su id (slug) en el menú vigente. */
  porId(id: string): Producto | undefined {
    return this.productos().find((p) => p.id === id);
  }
}
