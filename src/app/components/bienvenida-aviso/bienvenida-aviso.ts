import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CuentaService } from '../../cuenta.service';
import { BIENVENIDA_PCT, CONDICIONES_BIENVENIDA, promosActivas } from '../../promos';

/** Recuerda el "ahora no" durante tres días: no es un aviso que persigue. */
const CLAVE = 'cm-aviso-bienvenida';
const PAUSA_MS = 3 * 86_400_000;
/** Lo que espera antes de salir: primero la portada, después la oferta. */
const ESPERA_MS = 3500;

// La invitación del 10 % para quien entra sin cuenta: un ticket troquelado,
// como los que vienen dentro de la caja de Halloween.
//
// Lo que NO hace, a propósito (ver el estudio de Temu y Shein): no tapa la
// tienda, no obliga a nada para seguir, no tiene reloj falso, se cierra con
// un toque y no vuelve a salir en tres días. Y lleva sus condiciones a la
// vista, que es lo que pide el Estatuto del Consumidor.
@Component({
  selector: 'app-bienvenida-aviso',
  imports: [],
  templateUrl: './bienvenida-aviso.html',
  styleUrl: './bienvenida-aviso.css',
})
export class BienvenidaAviso {
  private readonly cuenta = inject(CuentaService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pct = BIENVENIDA_PCT;
  readonly condiciones = CONDICIONES_BIENVENIDA;

  /** Ya pasó la espera y no se ha cerrado en esta visita. */
  private readonly listo = signal(false);
  /** En /admin no se ofrece nada: es el panel de la tienda. */
  private readonly enPanel = signal(false);
  /**
   * El video de la portada está en pantalla. Ahí abajo viven sus textos
   * ("Desliza", "triki triki halloween") y el ticket los taparía: espera a
   * que el visitante deje atrás el video.
   */
  private readonly sobreHero = signal(false);

  /** Se ve solo si sigue teniendo sentido en este momento. */
  readonly visible = computed(
    () =>
      this.listo() &&
      !this.enPanel() &&
      !this.sobreHero() &&
      !this.cuenta.registrado() &&
      !this.cuenta.abierto() &&
      promosActivas(),
  );

  constructor() {
    afterNextRender(() => {
      this.enPanel.set(this.esPanel(this.router.url));
      const sub = this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.enPanel.set(this.esPanel(e.urlAfterRedirects)));
      this.destroyRef.onDestroy(() => sub.unsubscribe());

      if (this.pausado()) return;
      const t = window.setTimeout(() => this.listo.set(true), ESPERA_MS);
      this.destroyRef.onDestroy(() => clearTimeout(t));

      // Se mira en cada cuadro de scroll, sin pasar por Angular salvo cuando
      // el valor cambia. Con el hero ocupando más de un tercio de la pantalla
      // por abajo, el ticket espera.
      let raf = 0;
      const medir = () => {
        raf = 0;
        const hero = document.querySelector('.hv');
        const tapa = !!hero && hero.getBoundingClientRect().bottom > window.innerHeight * 0.66;
        if (tapa !== this.sobreHero()) this.sobreHero.set(tapa);
      };
      const alScroll = () => {
        if (!raf) raf = requestAnimationFrame(medir);
      };
      medir();
      window.addEventListener('scroll', alScroll, { passive: true });
      window.addEventListener('resize', alScroll, { passive: true });
      const subMedir = this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => setTimeout(medir, 0));
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', alScroll);
        window.removeEventListener('resize', alScroll);
        cancelAnimationFrame(raf);
        subMedir.unsubscribe();
      });
    });
  }

  crear(): void {
    this.pausar();
    this.cuenta.abrir('registro');
  }

  ahoraNo(): void {
    this.pausar();
  }

  private esPanel(url: string): boolean {
    return url.startsWith('/admin');
  }

  private pausar(): void {
    this.listo.set(false);
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {
      /* sin almacenamiento: se cierra por esta visita y ya */
    }
  }

  private pausado(): boolean {
    try {
      const t = Number(localStorage.getItem(CLAVE));
      return Number.isFinite(t) && Date.now() - t < PAUSA_MS;
    } catch {
      return false;
    }
  }
}
