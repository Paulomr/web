import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuentaService } from '../../cuenta.service';

// Sección "Lo que dicen de nosotros": mezcla las reseñas reales de Google con
// las opiniones que dejan los clientes registrados en la web.
//
// Para opinar hay que tener cuenta. El envío pide además el código de 4 dígitos:
// la sesión vive en el dispositivo, así que sin el código cualquiera que agarre
// un celular prestado podría firmar una opinión con el nombre de su dueño.
// Toda opinión nueva queda en revisión hasta que se aprueba desde /admin.

interface ResenaGoogle {
  nombre: string;
  inicial: string;
  /** "Local Guide · Hace 2 meses" o solo la fecha. */
  meta: string;
  texto: string;
}

/** Opinión enviada desde la web (viene de /api/resenas). */
interface ResenaWeb {
  instagram: string;
  nombre: string;
  estrellas: number;
  texto: string;
  fecha: string;
  /** Solo llega en la propia: 'pendiente' | 'aprobada' | 'oculta'. */
  estado?: string;
}

/** Lo que pinta la plantilla, venga de donde venga. */
interface Tarjeta {
  clave: string;
  nombre: string;
  inicial: string;
  meta: string;
  texto: string;
  estrellas: number;
  google: boolean;
}

@Component({
  selector: 'app-resenas',
  imports: [FormsModule],
  templateUrl: './resenas.html',
  styleUrl: './resenas.css',
})
export class Resenas {
  readonly cuenta = inject(CuentaService);

  /** Calificación global en Google (real). */
  readonly rating = '4.7';
  readonly total = 10;
  /** Ficha de Google del negocio (ajustable al enlace exacto). */
  readonly googleUrl = 'https://www.google.com/maps/search/?api=1&query=Crunchy%20Munch%20Rionegro';

  readonly maxTexto = 600;

  /** Opiniones aprobadas que llegaron del servidor. */
  private readonly deLaWeb = signal<ResenaWeb[]>([]);
  /** La opinión del visitante, si ya envió una (en cualquier estado). */
  readonly mia = signal<ResenaWeb | null>(null);

  // ---- Formulario ----
  readonly formAbierto = signal(false);
  readonly estrellas = signal(5);
  readonly texto = signal('');
  readonly pin = signal('');
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly exito = signal(false);

  readonly restantes = computed(() => this.maxTexto - this.texto().length);

  readonly resenasGoogle: ResenaGoogle[] = [
    {
      nombre: 'Vane Montoya',
      inicial: 'V',
      meta: 'Local Guide · Hace 2 meses',
      texto:
        'Sin duda alguna es un lugar demasiado espectacular, pero en TODO: su atención, su menú, su presentación… Qué cosas tan deliciosas y el ambiente del lugar (solo he ido al de San Antonio) es demasiado agradable. Amé su malteada y definitivamente todas las galletas son DELICIOSAS. ¡Me encanta muchísimo, full recomendados!',
    },
    {
      nombre: 'Yor Uribe',
      inicial: 'Y',
      meta: 'Local Guide · Hace 6 meses',
      texto:
        'Malteada de galletaaa 🤤 qué cosaaaa tan deliciosaaaaa 🍪🍪🍪 y la chica siempre tiene una hermosa actitud 🥰',
    },
    {
      nombre: 'Juliana Cruz',
      inicial: 'J',
      meta: 'Hace 2 días',
      texto: 'Amo estas galletas ❤️ vengo desde Medellín a comerlas 😋',
    },
    {
      nombre: 'Valeria C.',
      inicial: 'V',
      meta: 'Local Guide · Jul 2025',
      texto: 'Delicioso 🍪 y la atención brutal.',
    },
    {
      nombre: 'Jeisson Orozco',
      inicial: 'J',
      meta: 'Hace 3 meses',
      texto: 'Muy buena atención.',
    },
  ];

  /** Las de la web primero (son las nuevas), después las de Google. */
  readonly tarjetas = computed<Tarjeta[]>(() => [
    ...this.deLaWeb().map((r) => ({
      clave: 'web:' + r.instagram,
      nombre: r.nombre,
      inicial: (r.nombre.trim()[0] ?? '?').toUpperCase(),
      meta: this.cuando(r.fecha),
      texto: r.texto,
      estrellas: r.estrellas,
      google: false,
    })),
    ...this.resenasGoogle.map((r) => ({
      clave: 'google:' + r.nombre,
      nombre: r.nombre,
      inicial: r.inicial,
      meta: r.meta,
      texto: r.texto,
      estrellas: 5,
      google: true,
    })),
  ]);

  constructor() {
    void this.cargar();
  }

  /** Trae las aprobadas y, si hay sesión, también la propia. */
  async cargar(): Promise<void> {
    const ig = this.cuenta.cuenta()?.instagram ?? '';
    const url = ig ? `/api/resenas?ig=${encodeURIComponent(ig)}` : '/api/resenas';
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const d = (await r.json()) as { resenas?: ResenaWeb[]; mia?: ResenaWeb | null };
      this.deLaWeb.set(d.resenas ?? []);
      this.mia.set(d.mia ?? null);
    } catch {
      // Sin conexión: se quedan solo las de Google. La sección nunca se rompe.
    }
  }

  /** Abre el formulario; sin cuenta, manda primero a crearla. */
  abrirForm(): void {
    if (!this.cuenta.registrado()) {
      this.cuenta.abrir('registro');
      return;
    }
    const previa = this.mia();
    if (previa) {
      this.estrellas.set(previa.estrellas);
      this.texto.set(previa.texto);
    }
    this.error.set('');
    this.exito.set(false);
    this.formAbierto.set(true);
  }

  cerrarForm(): void {
    this.formAbierto.set(false);
    this.pin.set('');
    this.error.set('');
  }

  async enviar(): Promise<void> {
    const c = this.cuenta.cuenta();
    if (!c?.instagram) {
      this.error.set('Agrega tu Instagram en tu cuenta para poder opinar.');
      return;
    }
    const texto = this.texto().trim();
    if (texto.length < 10) {
      this.error.set('Cuéntanos un poco más (mínimo 10 letras).');
      return;
    }
    if (!/^\d{4}$/.test(this.pin())) {
      this.error.set('Escribe tu código de 4 dígitos.');
      return;
    }

    this.enviando.set(true);
    this.error.set('');
    try {
      const r = await fetch('/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram: c.instagram,
          pin: this.pin(),
          estrellas: this.estrellas(),
          texto,
        }),
      });
      const d = (await r.json()) as { mia?: ResenaWeb; error?: string };
      if (!r.ok) {
        this.error.set(d.error || 'No se pudo enviar. Intenta de nuevo.');
        return;
      }
      this.mia.set(d.mia ?? null);
      this.exito.set(true);
      this.formAbierto.set(false);
      this.pin.set('');
    } catch {
      this.error.set('Sin conexión. Intenta de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }

  /** "Hace 3 días", "Hace 2 meses"… a partir de la fecha del servidor. */
  private cuando(iso: string): string {
    const t = new Date(iso).getTime();
    if (!t) return '';
    const dias = Math.floor((Date.now() - t) / 86_400_000);
    if (dias <= 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 30) return `Hace ${dias} días`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    const anios = Math.floor(meses / 12);
    return `Hace ${anios} ${anios === 1 ? 'año' : 'años'}`;
  }
}
