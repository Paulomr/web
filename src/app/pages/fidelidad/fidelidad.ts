import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CuentaService } from '../../cuenta.service';

/** Ruido determinista 0..1 a partir de una semilla (para no re-aleatorizar en cada render). */
function ruido(n: number): number {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

/** Transformación "mal pegada" y estable para el sello en la posición i. */
function transformSello(i: number): string {
  const rot = (ruido(i * 12.9898 + 1) - 0.5) * 34; // -17°..+17°
  const dx = (ruido(i * 78.233 + 2) - 0.5) * 9; // -4.5..4.5 px
  const dy = (ruido(i * 37.719 + 3) - 0.5) * 7; // -3.5..3.5 px
  return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
}

// Tarjeta de fidelidad como "expandable card": colapsada muestra el club;
// al expandir aparecen los sellos y el canje. El QR del vendedor abre esta
// página con ?c=CODIGO y, si hay sesión con Instagram, suma el sello.
@Component({
  selector: 'app-fidelidad',
  imports: [FormsModule, RouterLink],
  templateUrl: './fidelidad.html',
  styleUrl: './fidelidad.css',
})
export class Fidelidad implements OnInit {
  readonly cuenta = inject(CuentaService);
  private readonly route = inject(ActivatedRoute);

  readonly expandido = signal(false);
  readonly golden = signal(false);
  readonly codigo = signal('');
  readonly igInput = signal('');
  readonly mensaje = signal('');
  readonly exito = signal(false);
  readonly cargando = signal(false);

  // Premios
  readonly premioMsg = signal('');
  readonly premioCodigo = signal('');
  readonly reclamando = signal(false);

  /**
   * Un slot por cada sello de la meta. Cada sello lleno lleva una transformación
   * pseudo-aleatoria pero ESTABLE por posición: rotado y descuadrado como si se
   * hubiera pegado a mano (unos más ladeados a un lado, otros al otro).
   */
  readonly sellosView = computed(() =>
    Array.from({ length: this.cuenta.metaSellos() }, (_, i) => ({
      lleno: i < this.cuenta.sellos(),
      transform: transformSello(i),
    })),
  );

  /** Progreso (0–100) hacia el premio maestro de estrellas. */
  readonly estrellasPct = computed(() =>
    Math.min(100, Math.round((this.cuenta.puntos() / this.cuenta.metaEstrellas) * 100)),
  );

  /** Umbral de compra formateado en pesos ("25.000"). */
  readonly umbralTexto = computed(() => this.cuenta.umbralCompra().toLocaleString('es-CO'));

  ngOnInit(): void {
    void this.cuenta.sincronizarFidelidad();
    const c = this.route.snapshot.queryParamMap.get('c');
    if (c) {
      this.codigo.set(c.toUpperCase().slice(0, 6));
      this.expandido.set(true); // llega desde el QR: abre la tarjeta
      if (this.cuenta.registrado() && this.cuenta.cuenta()?.instagram) {
        void this.sumar();
      }
    }
  }

  abrir(): void {
    this.expandido.set(true);
  }

  cerrarExpand(): void {
    this.expandido.set(false);
  }

  abrirGolden(): void {
    this.golden.set(true);
  }

  cerrarGolden(): void {
    this.golden.set(false);
  }

  /** Escape cierra primero el Golden Club (está por encima) y luego la tarjeta. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.golden()) {
      this.golden.set(false);
      return;
    }
    this.expandido.set(false);
  }

  async sumar(): Promise<void> {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.mensaje.set('');
    const r = await this.cuenta.redimir(this.codigo());
    this.cargando.set(false);
    this.exito.set(r.ok);
    this.mensaje.set(r.mensaje);
    if (r.ok) this.codigo.set('');
  }

  guardarIg(): void {
    this.cuenta.agregarInstagram(this.igInput());
    this.igInput.set('');
  }

  async reclamar(tipo: 'sellos' | 'estrellas'): Promise<void> {
    if (this.reclamando()) return;
    this.reclamando.set(true);
    this.premioMsg.set('');
    this.premioCodigo.set('');
    const r = await this.cuenta.reclamar(tipo);
    this.reclamando.set(false);
    if (!r.ok) {
      this.premioMsg.set(r.error ?? 'No se pudo reclamar.');
      return;
    }
    this.premioCodigo.set(r.codigo ?? '');
    this.premioMsg.set('¡Premio reclamado! Muestra este código en tienda:');
  }
}

