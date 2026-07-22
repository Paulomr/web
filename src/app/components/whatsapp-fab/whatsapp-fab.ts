import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { WHATSAPP_SEDES } from '../../productos';
import { CuentaService } from '../../cuenta.service';

/** Rutas donde el botón NO aparece: ahí el usuario está en otra tarea
 *  (administrar, jugar o mirar su tarjeta) y el flotante solo estorba. */
const RUTAS_OCULTAS = ['/admin', '/minijuegos', '/fidelidad'];

interface SedeWhatsApp {
  id: string;
  /** Nombre de la sede tal como se muestra en la píldora. */
  nombre: string;
  /** Ciudad / referencia, en letra pequeña. */
  zona: string;
  numero: string;
}

const SALUDO = '¡Hola Crunchy Munch! Quiero hacer un pedido 🍪';

// Burbuja flotante de WhatsApp (abajo a la izquierda). Al tocarla se despliegan
// las dos sedes; cada una abre el chat con su propio número.
@Component({
  selector: 'app-whatsapp-fab',
  imports: [],
  templateUrl: './whatsapp-fab.html',
  styleUrl: './whatsapp-fab.css',
})
export class WhatsappFab {
  private readonly router = inject(Router);
  private readonly cuenta = inject(CuentaService);

  readonly abierto = signal(false);

  readonly sedes: SedeWhatsApp[] = [
    {
      id: 'san-antonio',
      nombre: 'SAN ANTONIO',
      zona: 'DE PEREIRA · RIONEGRO',
      numero: WHATSAPP_SEDES['san-antonio'],
    },
    {
      id: 'marinilla',
      nombre: 'MARINILLA',
      zona: 'ANTIOQUIA',
      numero: WHATSAPP_SEDES.marinilla,
    },
  ];

  /** URL actual, como señal, para decidir si el botón se muestra. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly visible = computed(() => {
    // Sin la query ni el fragmento: /sedes#marinilla sigue siendo /sedes.
    const ruta = this.url().split(/[?#]/)[0];
    const oculta = RUTAS_OCULTAS.some((r) => ruta === r || ruta.startsWith(r + '/'));
    // Con la ventana de cuenta abierta el flotante quedaría sobre el velo.
    return !oculta && !this.cuenta.abierto();
  });

  constructor() {
    // Al cambiar de página (o al esconderse el botón) el desplegable se cierra:
    // si no, al volver aparecería ya abierto.
    effect(() => {
      this.url();
      this.visible();
      this.abierto.set(false);
    });
  }

  alternar(): void {
    this.abierto.update((v) => !v);
  }

  enlace(sede: SedeWhatsApp): string {
    return `https://wa.me/${sede.numero}?text=${encodeURIComponent(SALUDO)}`;
  }

  @HostListener('document:keydown.escape')
  cerrar(): void {
    this.abierto.set(false);
  }
}
