import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS, urlFoto } from '../../productos';
import { FOTOS } from '../../fotos';
import { GAMES } from '../../games';
import { ProductosService } from '../../productos.service';
import { CAMPOS_TEXTO, DEFAULT_TEXTOS, DEFAULT_SEDES, SedeCfg } from '../../configuracion.service';

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
  _abierto?: boolean;
  _guardando?: boolean;
  _subiendo?: boolean;
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
  readonly urlFoto = urlFoto;
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

  /** Categorías (módulos) desplegadas. */
  readonly categoriasAbiertas = signal<Set<string>>(new Set());

  // ---- Contenido del sitio (textos + minijuegos) ----
  readonly camposTexto = CAMPOS_TEXTO;
  readonly juegos = GAMES;
  readonly cfgAbierto = signal(false);
  readonly sedesAbierto = signal(false);
  readonly cfgGuardando = signal(false);
  readonly cfgMsg = signal('');
  cfgTextos: Record<string, string> = { ...DEFAULT_TEXTOS };
  cfgJuegos: Record<string, boolean> = {};
  cfgSedes: SedeCfg[] = this.copiaSedes(DEFAULT_SEDES);

  // ---- Fidelidad (código del día + QR) ----
  readonly fidAbierto = signal(false);
  readonly fidCodigo = signal('');
  readonly fidFecha = signal('');
  readonly fidQr = signal('');
  readonly fidGenerando = signal(false);
  readonly fidMsg = signal('');
  fidUmbral = 25000;
  fidMeta = 10;

  // ---- Canjes de premios ----
  readonly canjesAbierto = signal(false);
  readonly canjes = signal<any[]>([]);
  readonly canjesMsg = signal('');

  // ---- Galería de fotos ----
  readonly galAbierto = signal(false);
  readonly galSubiendo = signal(false);
  readonly galMsg = signal('');
  cfgGaleria: string[] = [];

  private copiaSedes(base: SedeCfg[], guardadas?: SedeCfg[]): SedeCfg[] {
    return base.map((d) => {
      const s = Array.isArray(guardadas) ? guardadas.find((x) => x?.id === d.id) : undefined;
      const horarios = (s?.horarios?.length ? s.horarios : d.horarios).map((h) => ({
        dias: h.dias ?? '',
        horas: h.horas ?? '',
      }));
      const especiales = (s?.especiales ?? []).map((e) => ({ fecha: e.fecha ?? '', nota: e.nota ?? '' }));
      return { id: d.id, nombre: d.nombre, horarios, especiales };
    });
  }

  constructor() {
    if (this.token()) {
      void this.cargar();
      void this.cargarConfig();
      void this.cargarFidelidad();
      void this.cargarCanjes();
    }
  }

  async cargarConfig(): Promise<void> {
    try {
      const r = await fetch('/api/config');
      if (!r.ok) return;
      const c = (await r.json()) as {
        textos?: Record<string, string>;
        juegos?: Record<string, boolean>;
        sedes?: SedeCfg[];
        galeria?: string[];
      };
      this.cfgTextos = { ...DEFAULT_TEXTOS, ...(c?.textos ?? {}) };
      const jg: Record<string, boolean> = {};
      for (const g of GAMES) jg[g.id] = c?.juegos?.[g.id] !== false;
      this.cfgJuegos = jg;
      this.cfgSedes = this.copiaSedes(DEFAULT_SEDES, c?.sedes);
      // Si no hay galería propia guardada, arranca con las fotos por defecto
      // para que puedas ver y quitar las actuales.
      this.cfgGaleria = Array.isArray(c?.galeria) && c.galeria.length ? [...c.galeria] : [...FOTOS];
    } catch {
      /* deja los valores por defecto */
    }
  }

  async guardarConfig(): Promise<void> {
    this.cfgGuardando.set(true);
    this.cfgMsg.set('');
    let r: Response;
    try {
      r = await fetch('/api/config', {
        method: 'PUT',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ textos: this.cfgTextos, juegos: this.cfgJuegos, sedes: this.cfgSedes, galeria: this.cfgGaleria }),
      });
    } catch {
      this.cfgGuardando.set(false);
      this.cfgMsg.set('⚠ Sin conexión');
      return;
    }
    this.cfgGuardando.set(false);
    if (r.status === 401) {
      this.salir();
      return;
    }
    this.cfgMsg.set(r.ok ? '✓ Guardado' : '⚠ Error al guardar');
  }

  // ---- Fidelidad ----
  async cargarFidelidad(): Promise<void> {
    try {
      const r = await fetch('/api/fidelidad', { headers: this.cabeceras() });
      if (r.status === 401) return;
      if (!r.ok) return;
      const d = (await r.json()) as { codigoDia?: string; fecha?: string; umbral?: number; meta?: number };
      this.fidCodigo.set(d.codigoDia ?? '');
      this.fidFecha.set(d.fecha ?? '');
      if (typeof d.umbral === 'number') this.fidUmbral = d.umbral;
      if (typeof d.meta === 'number') this.fidMeta = d.meta;
      if (d.codigoDia) void this.generarQr(d.codigoDia);
    } catch {
      /* ignore */
    }
  }

  async generarCodigo(): Promise<void> {
    this.fidGenerando.set(true);
    this.fidMsg.set('');
    let r: Response;
    try {
      r = await fetch('/api/fidelidad', {
        method: 'PUT',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ generar: true }),
      });
    } catch {
      this.fidGenerando.set(false);
      this.fidMsg.set('⚠ Sin conexión');
      return;
    }
    this.fidGenerando.set(false);
    if (r.status === 401) {
      this.salir();
      return;
    }
    if (!r.ok) {
      this.fidMsg.set('⚠ Error al generar');
      return;
    }
    const d = (await r.json()) as { codigoDia?: string; fecha?: string };
    this.fidCodigo.set(d.codigoDia ?? '');
    this.fidFecha.set(d.fecha ?? '');
    this.fidMsg.set('✓ Código del día listo');
    void this.generarQr(d.codigoDia ?? '');
  }

  async guardarAjustesFidelidad(): Promise<void> {
    this.fidMsg.set('');
    let r: Response;
    try {
      r = await fetch('/api/fidelidad', {
        method: 'PUT',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ umbral: Number(this.fidUmbral) || 0, meta: Number(this.fidMeta) || 10 }),
      });
    } catch {
      this.fidMsg.set('⚠ Sin conexión');
      return;
    }
    if (r.status === 401) {
      this.salir();
      return;
    }
    if (!r.ok) {
      this.fidMsg.set('⚠ Error al guardar');
      return;
    }
    const d = (await r.json()) as { umbral?: number; meta?: number };
    if (typeof d.umbral === 'number') this.fidUmbral = d.umbral;
    if (typeof d.meta === 'number') this.fidMeta = d.meta;
    this.fidMsg.set('✓ Ajustes guardados');
  }

  private async generarQr(code: string): Promise<void> {
    if (!code) {
      this.fidQr.set('');
      return;
    }
    try {
      const QRCode = (await import('qrcode')).default;
      const url = `${location.origin}/fidelidad?c=${code}`;
      this.fidQr.set(
        await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#4a3b47', light: '#ffffff' } }),
      );
    } catch {
      this.fidQr.set('');
    }
  }

  // ---- Canjes ----
  async cargarCanjes(): Promise<void> {
    try {
      const r = await fetch('/api/premios', { headers: this.cabeceras() });
      if (!r.ok) return;
      this.canjes.set((await r.json()) as any[]);
    } catch {
      /* ignore */
    }
  }

  async confirmarCanje(c: any): Promise<void> {
    this.canjesMsg.set('');
    let r: Response;
    try {
      r = await fetch('/api/premios', {
        method: 'PUT',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ codigo: c.codigo, entregado: true }),
      });
    } catch {
      this.canjesMsg.set('⚠ Sin conexión');
      return;
    }
    if (r.status === 401) {
      this.salir();
      return;
    }
    if (r.ok) {
      c.entregado = true;
      this.canjes.update((l) => [...l]);
      this.canjesMsg.set('✓ Entregado');
    } else {
      this.canjesMsg.set('⚠ Error');
    }
  }

  // ---- Galería ----
  onSoltarGaleria(ev: DragEvent): void {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) void this.subirGaleria(file);
  }

  onSeleccionarGaleria(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.subirGaleria(file);
    input.value = '';
  }

  quitarGaleria(i: number): void {
    this.cfgGaleria.splice(i, 1);
    this.cfgGaleria = [...this.cfgGaleria];
  }

  private async subirGaleria(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.galMsg.set('⚠ Solo imágenes');
      return;
    }
    this.galSubiendo.set(true);
    this.galMsg.set('');
    try {
      const { base64, tipo, nombre } = await this.optimizar(file);
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre, tipo, data: base64 }),
      });
      if (r.status === 401) {
        this.salir();
        return;
      }
      if (!r.ok) {
        this.galMsg.set('⚠ No se pudo subir (¿configuraste Vercel Blob?)');
        return;
      }
      const { url } = (await r.json()) as { url: string };
      this.cfgGaleria = [url, ...this.cfgGaleria]; // la nueva aparece primero
      this.galMsg.set('✓ Foto agregada — recuerda GUARDAR');
    } catch {
      this.galMsg.set('⚠ Error al procesar la foto');
    } finally {
      this.galSubiendo.set(false);
    }
  }

  catAbierta(id: string): boolean {
    return this.categoriasAbiertas().has(id);
  }

  toggleCat(id: string): void {
    this.categoriasAbiertas.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /** Abre/cierra el editor de una tarjeta al hacer clic en ella. */
  toggleProd(p: ProdAdmin): void {
    p._abierto = !p._abierto;
    this.refrescar();
  }

  /** Fotos de un producto como lista (para las miniaturas de preview). */
  fotosDe(p: ProdAdmin): string[] {
    return p.fotos
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ---- Subir / editar fotos ----
  onSeleccionar(p: ProdAdmin, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.subirFoto(p, file);
    input.value = '';
  }

  onSoltar(p: ProdAdmin, ev: DragEvent): void {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) void this.subirFoto(p, file);
  }

  quitarFoto(p: ProdAdmin, i: number): void {
    const arr = this.fotosDe(p);
    arr.splice(i, 1);
    p.fotos = arr.join('\n');
    this.refrescar();
  }

  hacerPrincipal(p: ProdAdmin, i: number): void {
    const arr = this.fotosDe(p);
    const [x] = arr.splice(i, 1);
    arr.unshift(x);
    p.fotos = arr.join('\n');
    this.refrescar();
  }

  private async subirFoto(p: ProdAdmin, file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      p._msg = '⚠ Solo imágenes';
      this.refrescar();
      return;
    }
    p._subiendo = true;
    p._msg = '';
    this.refrescar();
    try {
      const { base64, tipo, nombre } = await this.optimizar(file);
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: this.cabeceras({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre, tipo, data: base64 }),
      });
      if (r.status === 401) {
        this.salir();
        return;
      }
      if (!r.ok) {
        p._msg = '⚠ No se pudo subir (¿configuraste Vercel Blob?)';
        return;
      }
      const { url } = (await r.json()) as { url: string };
      p.fotos = (p.fotos ? p.fotos + '\n' : '') + url;
      p._msg = '✓ Foto agregada — recuerda GUARDAR';
    } catch {
      p._msg = '⚠ Error al procesar la foto';
    } finally {
      p._subiendo = false;
      this.refrescar();
    }
  }

  // Achica y comprime la imagen en el navegador (máx 1400px, JPEG) para que
  // suba liviana y ya optimizada. Devuelve base64 sin el prefijo data:.
  private async optimizar(file: File): Promise<{ base64: string; tipo: string; nombre: string }> {
    const img = await this.cargarImagen(file);
    const MAX = 1400;
    const escala = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * escala));
    const h = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('sin canvas');
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.82),
    );
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    return {
      base64: dataUrl.split(',')[1] ?? '',
      tipo: 'image/jpeg',
      nombre: file.name.replace(/\.[^.]+$/, ''),
    };
  }

  private cargarImagen(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('imagen inválida'));
      };
      img.src = url;
    });
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
    void this.cargarConfig();
    void this.cargarFidelidad();
    void this.cargarCanjes();
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
        _abierto: true,
        _msg: '',
      },
      ...l,
    ]);
    // Abre el módulo de "cookies" (categoría por defecto del nuevo) para verlo.
    this.categoriasAbiertas.update((s) => new Set(s).add('cookies'));
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
