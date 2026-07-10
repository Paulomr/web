import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Horario {
  dias: string;
  horas: string;
}

interface Sede {
  nombre: string;
  ciudad: string;
  direccion: string;
  /** Fotos de la sede (se irán sumando; la primera es la portada). */
  fotos: string[];
  horarios: Horario[];
  /** ¿Tiene DrinkLab (matcha, chai, café, granizados)? */
  drinkLab: boolean;
  /** Enlace corto oficial de Google Maps. */
  comoLlegar: string;
  /** Mapa embebido (OpenStreetMap, sin clave ni bloqueos). */
  mapa: SafeResourceUrl;
}

// Página dedicada a las sedes: horarios, DrinkLab, mapa y cómo llegar.
@Component({
  selector: 'app-sedes',
  imports: [RouterLink],
  templateUrl: './sedes.html',
  styleUrl: './sedes.css',
})
export class Sedes {
  /** Bebidas del DrinkLab. */
  readonly drinkLab = ['MATCHA', 'CHAI', 'CAFÉ', 'GRANIZADOS'];

  readonly sedes: Sede[];

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
        nombre: 'SEDE SAN ANTONIO',
        ciudad: 'San Antonio de Pereira · Rionegro',
        direccion: 'San Antonio de Pereira, Rionegro, Antioquia',
        fotos: ['bearnie-1107.webp', 'bearnie-1085.webp'],
        horarios: [{ dias: 'Lunes a domingo y festivos', horas: '12:00 m – 8:00 pm' }],
        drinkLab: true,
        comoLlegar: 'https://maps.app.goo.gl/rtGSKErLw9K45GoW9',
        mapa: embed(6.1309694, -75.3787989),
      },
      {
        nombre: 'SEDE MARINILLA',
        ciudad: 'Marinilla · Antioquia',
        direccion: 'Marinilla, Antioquia',
        // TODO: Paulo pasará fotos propias de la sede Marinilla.
        fotos: ['bearnie-1262.webp'],
        horarios: [
          { dias: 'Lunes', horas: '12:00 m – 6:30 pm' },
          { dias: 'Martes a sábado', horas: '12:00 m – 7:00 pm' },
          { dias: 'Domingos y festivos', horas: '12:00 m – 6:30 pm' },
        ],
        drinkLab: false,
        comoLlegar: 'https://maps.app.goo.gl/LGtExQPKwM9vYJ5NA',
        mapa: embed(6.1711354, -75.3388328),
      },
    ];
  }
}
