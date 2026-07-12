import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConfiguracionService } from '../../configuracion.service';

interface Sede {
  /** Ancla para el scroll desde la portada (#marinilla / #san-antonio). */
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  /** Fotos de la sede (se irán sumando; la primera es la portada). */
  fotos: string[];
  /** ¿Tiene DrinkLab (matcha, chai, café, granizados)? */
  drinkLab: boolean;
  /** Enlace corto oficial de Google Maps. */
  comoLlegar: string;
  /** Mapa embebido (OpenStreetMap, sin clave ni bloqueos). */
  mapa: SafeResourceUrl;
}

// Página dedicada a las sedes: horarios, DrinkLab, mapa y cómo llegar.
// Los horarios y fechas especiales vienen de la configuración (editables en /admin).
@Component({
  selector: 'app-sedes',
  imports: [RouterLink],
  templateUrl: './sedes.html',
  styleUrl: './sedes.css',
})
export class Sedes {
  readonly cfg = inject(ConfiguracionService);

  /** Bebidas del DrinkLab. */
  readonly drinkLab = ['MATCHA', 'CHAI', 'CAFÉ', 'GRANIZADOS'];

  readonly sedes: Sede[];

  /** Foto seleccionada en la galería de cada sede (por nombre). */
  private readonly seleccion = signal<Record<string, number>>({});

  indiceFoto(nombre: string): number {
    return this.seleccion()[nombre] ?? 0;
  }

  elegirFoto(nombre: string, i: number): void {
    this.seleccion.update((m) => ({ ...m, [nombre]: i }));
  }

  constructor(sanitizer: DomSanitizer) {
    // Coordenadas exactas resueltas desde los enlaces cortos oficiales.
    const embed = (lat: number, lon: number) => {
      const d = 0.0045;
      const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
      return sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`,
      );
    };

    this.sedes = [
      {
        id: 'san-antonio',
        nombre: 'SEDE SAN ANTONIO',
        ciudad: 'San Antonio de Pereira · Rionegro',
        direccion: 'San Antonio de Pereira, Rionegro, Antioquia',
        fotos: ['bearnie-1107.webp', 'bearnie-1085.webp'],
        drinkLab: true,
        comoLlegar: 'https://maps.app.goo.gl/rtGSKErLw9K45GoW9',
        mapa: embed(6.1309694, -75.3787989),
      },
      {
        id: 'marinilla',
        nombre: 'SEDE MARINILLA',
        ciudad: 'Marinilla · Antioquia',
        direccion: 'Marinilla, Antioquia',
        fotos: ['sede-marinilla-1.jpg', 'sede-marinilla-2.jpg', 'sede-marinilla-3.jpg'],
        drinkLab: false,
        comoLlegar: 'https://maps.app.goo.gl/LGtExQPKwM9vYJ5NA',
        mapa: embed(6.1711354, -75.3388328),
      },
    ];
  }
}
