import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostulacionesService } from '../../postulaciones.service';
import { RUTA_POSTULA, TOP_VOTADOS } from '../../postulaciones';

// Marcador de la convocatoria, dentro del hero: los negocios más votados.
//
// Vive DENTRO de `hero-video` a propósito. El hero publica su avance como la
// variable CSS `--p`, y las variables se heredan, así que este recuadro puede
// desvanecerse al ritmo exacto del video sin escuchar el scroll por su cuenta
// ni abrir un segundo bucle de animación.
//
// Si no hay ninguna postulación aprobada, no se pinta nada. Un marcador vacío
// en la portada no informa de nada y encima ocupa: hasta que no haya negocios
// aprobados, el hero se ve como siempre.
@Component({
  selector: 'app-votados',
  imports: [RouterLink],
  templateUrl: './votados.html',
  styleUrl: './votados.css',
})
export class Votados {
  readonly svc = inject(PostulacionesService);
  readonly rutaPostula = RUTA_POSTULA;
  readonly cuantos = TOP_VOTADOS;

  constructor() {
    // El servicio tiene candado: si el recuadro y la página /postula la piden
    // a la vez, sale una sola petición.
    void this.svc.cargar();
  }

  /** '01', '02'… El puesto se lee antes que el nombre. */
  puesto(i: number): string {
    return String(i + 1).padStart(2, '0');
  }
}
