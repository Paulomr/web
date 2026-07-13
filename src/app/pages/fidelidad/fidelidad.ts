import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CuentaService } from '../../cuenta.service';

// Tarjeta de fidelidad por sellos. El QR del vendedor abre esta página con
// ?c=CODIGO y, si hay sesión con Instagram, suma el sello automáticamente.
@Component({
  selector: 'app-fidelidad',
  imports: [FormsModule, RouterLink],
  templateUrl: './fidelidad.html',
  styleUrl: './fidelidad.css',
})
export class Fidelidad implements OnInit {
  readonly cuenta = inject(CuentaService);
  private readonly route = inject(ActivatedRoute);

  readonly codigo = signal('');
  readonly igInput = signal('');
  readonly mensaje = signal('');
  readonly exito = signal(false);
  readonly cargando = signal(false);

  /** Un slot por cada sello de la meta; true = sello lleno. */
  readonly slots = computed(() =>
    Array.from({ length: this.cuenta.metaSellos() }, (_, i) => i < this.cuenta.sellos()),
  );

  ngOnInit(): void {
    void this.cuenta.sincronizarFidelidad();
    const c = this.route.snapshot.queryParamMap.get('c');
    if (c) {
      this.codigo.set(c.toUpperCase().slice(0, 6));
      if (this.cuenta.registrado() && this.cuenta.cuenta()?.instagram) {
        void this.sumar();
      }
    }
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
}
