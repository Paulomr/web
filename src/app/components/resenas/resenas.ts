import { Component } from '@angular/core';

// Reseñas reales de clientes (5 estrellas) tomadas de Google, mostradas al
// estilo de la marca. El texto y los nombres son los que dejaron en Google.
interface Resena {
  nombre: string;
  inicial: string;
  /** "Local Guide · Hace 2 meses" o solo la fecha. */
  meta: string;
  texto: string;
}

@Component({
  selector: 'app-resenas',
  imports: [],
  templateUrl: './resenas.html',
  styleUrl: './resenas.css',
})
export class Resenas {
  /** Calificación global en Google (real). */
  readonly rating = '4.7';
  readonly total = 10;
  /** Ficha de Google del negocio (ajustable al enlace exacto). */
  readonly googleUrl = 'https://www.google.com/maps/search/?api=1&query=Crunchy%20Munch%20Rionegro';

  readonly resenas: Resena[] = [
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
}
