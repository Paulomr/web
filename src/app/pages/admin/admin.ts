import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS } from '../../productos';
import { ProductosService } from '../../productos.service';

// Producto en el panel: mismos campos que la base, pero 'fotos' como texto
// (una foto por línea) para editarlo fácil. Los '_' son estado de la pantalla.
interface ProdAdmin {
  slug: string;
  nombre: string;
  descripcion: string;
  precio: string;
  detalle: string;
  categoria: string;
  fotos: string;
  nuevo: boolean;
  activo: boolean;
  orden: number;
  pausadoHasta: string; // 'YYYY-MM-DD' o '' (para <input type="date">)
  _nuevo?: boolean;
  _guardando?: boolean;
  _msg?: string;
}

const API = '/api/productos';
const KEY_TOKEN = 'cm-admin-token';

function mapDoc(d: any): ProdAdmin {
  return {
    slug: d.slug ?? '',
    nombre: d.nombre ?? '',
    descripcion: d.descripcion ?? '',
    precio: d.precio ?? '',
    detalle: d.detalle ?? '',
    categoria: d.categoria ?? 'cookies',
    fotos: (Array.isArray(d.fotos) ? d.fotos : []).join('\n'),
    nuevo: !!d.nuevo,
    activo: d.activo !== false,
    orden: d.orden ?? 0,
    pausadoHasta: d.pausadoHasta ? new Date(d.pausadoHasta).toISOString().slice(0, 10) : '',
  };
}

// Panel de administración del menú. Protegido con ADMIN_TOKEN (clave que se
// valida en el servidor). Permite crear, editar, ocultar y reordenar productos.
@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  readonly categorias = CATEGORIAS;
  private readonly productosSvc = inject(ProductosService);

  readonly token = signal<string | null>(this.leerToken());
  readonly claveInput = signal('');
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly productos = signal<ProdAdmin[]>([]);

  /** Productos agrupados por categoría, en el orden del catálogo. */
  readonly grupos = computed(() => {
    const items = this.productos();
    return this.categorias.map((c) => ({
      id: c.id,
      label: c.label,
      items: items.filter((p) => p.categoria === c.id),
    }));
  });

  constructor() {
    if (this.token()) void this.cargar();
  }

  /** Fotos de un producto como lista (para las miniaturas de preview). */
  fotosDe(p: ProdAdmin): string[] {
    return p.fotos
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private leerToken(): string | null {
    try {
      return localStorage.getItem(KEY_TOKEN);
    } catch {
      return null;
    }
  }

  private cabeceras(extra?: Record<string, string>): Record<string, string> {
    return { 'x-admin-token': this.token() ?? '', ...extra };
  }

  // ---- Sesión ----
  async entrar(): Promise<void> {
    const t = this.claveInput().trim();
    if (!t) return;
    this.cargando.set(true);
    this.error.set('');
    let r: Response;
    try {
      r = await fetch(`${API}?all=1`, { headers: { 'x-admin-token': t } });
    } catch {
      this.cargando.set(false);
      this.error.set('No hay conexión con el servidor.');
      return;
    }
    this.cargando.set(false);
    if (r.status === 401) {
      this.error.set('Clave incorrecta.');
      return;
    }
    if (!r.ok) {
      this.error.set('No se pudo conectar a la base. ¿Configuraste MONGODB_URI y ADMIN_TOKEN en Vercel?');
      return;
    }
    try {
      localStorage.setItem(KEY_TOKEN, t);
    } catch {
      /* sin storage */
    }
    this.token.set(t);
    this.claveInput.set('');
    this.productos.set(((await r.json()) as any[]).map(mapDoc));
  }

  salir(): void {
    try {
      localStorage.removeItem(KEY_TOKEN);
    } catch {
      /* nada */
    }
    this.token.set(null);
    this.productos.set([]);
  }

  // ---- Datos ----
  async cargar(): Promise<void> {
    this.cargando.set(true);
    let r: Response;
    try {
      r = await fetch(`${API}?all=1`, { headers: this.cabeceras() });
    } catch {
      this.cargando.set(false);
      return;
    }
    this.cargando.set(false);
    if (r.status === 401) {
      this.salir();
      return;
    }
    if (!r.ok) return;
    this.productos.set(((await r.json()) as any[]).map(mapDoc));
  }

  nuevo(): void {
    this.productos.update((l) => [
      {
        slug: '',
        nombre: '',
        descripcion: '',
        precio: '',
        detalle: '',
        categoria: 'cookies',
        fotos: '',
        nuevo: false,
        activo: true,
        orden: l.length,
        pausadoHasta: '',
        _nuevo: true,
        _msg: '',
      },
      ...l,
    ]);
  }

  async guardar(p: ProdAdmin): Promise<void> {
    if (!p.slug.trim() || !p.nombre.trim()) {
      p._msg = '⚠ Falta id o nombre';
      this.refrescar();
      return;
    }
    p._guardando = true;
    p._msg = '';
    this.refrescar();

    const body = {
      slug: p.slug.trim(),
      nombre: p.nombre.trim(),
      descripcion: p.descripcion,
      precio: p.precio.trim(),
      detalle: p.detalle.trim(),
      categoria: p.categoria,
      fotos: p.fotos
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      nuevo: p.nuevo,
      activo: p.activo,
      orden: Number(p.orden) || 0,
      pausadoHasta: p.pausadoHasta ? new Date(p.pausadoHasta).toISOString() : null,
    };

    const path = p._nuevo ? '' : `/${encodeURIComponent(p.slug.trim())}`;
    const method = p._nuevo ? 'POST' : 'PUT';
    let r: Response;
    try {
      r = await fetch(`${API}${path}`, {
        method,
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
    } catch {
      p._guardando = false;
      p._msg = '⚠ Sin conexión';
      this.refrescar();
      return;
    }

    p._guardando = false;
    if (r.status === 401) {
      this.salir();
      return;
    }
    if (r.ok) {
      p._nuevo = false;
      p._msg = '✓ Guardado';
      this.productosSvc.refrescar();
    } else {
      p._msg = '⚠ Error al guardar';
    }
    this.refrescar();
  }

  async ocultar(p: ProdAdmin): Promise<void> {
    if (p._nuevo) {
      this.productos.update((l) => l.filter((x) => x !== p));
      return;
    }
    if (!confirm(`¿Ocultar "${p.nombre}" del menú? Podrás reactivarlo después.`)) return;
    let r: Response;
    try {
      r = await fetch(`${API}/${encodeURIComponent(p.slug)}`, {
        method: 'DELETE',
        headers: this.cabeceras(),
      });
    } catch {
      return;
    }
    if (r.status === 401) {
      this.salir();
      return;
    }
    if (r.ok) {
      p.activo = false;
      p._msg = 'Oculto';
      this.productosSvc.refrescar();
      this.refrescar();
    }
  }

  // Emite el arreglo de nuevo para que la vista refleje los cambios de estado
  // (también reagrupa por categoría al cambiar la categoría de un producto).
  refrescar(): void {
    this.productos.update((l) => [...l]);
  }
}
