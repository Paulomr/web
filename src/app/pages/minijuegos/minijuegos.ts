import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GAMES, Game } from '../../games';
import { fetchTopScores, ScoreRow } from '../../scores';
import { AnimatedHero } from '../../components/animated-hero/animated-hero';

type Rgb = [number, number, number];

@Component({
  selector: 'app-minijuegos',
  imports: [RouterLink, AnimatedHero],
  templateUrl: './minijuegos.html',
  styleUrl: './minijuegos.css',
})
export class Minijuegos {
  readonly games = GAMES;

  /** Juego actualmente abierto en el reproductor (null = mostrando la lista). */
  readonly selected = signal<Game | null>(null);

  /** URL saneada que consume el iframe del juego seleccionado. */
  readonly safeUrl = signal<SafeResourceUrl | null>(null);

  /** Top 10 de puntajes del juego abierto ([] si el backend está apagado). */
  readonly topScores = signal<ScoreRow[]>([]);

  /** Referencia a la sección para actualizar su fondo según el scroll. */
  @ViewChild('sectionEl') private sectionEl?: ElementRef<HTMLElement>;
  /** Referencia al hero para teñir su canvas según el scroll. */
  @ViewChild(AnimatedHero) private hero?: AnimatedHero;

  // Página: crema -> rosa pastel suave.
  private readonly PAGE_FROM: Rgb = [253, 249, 247];
  private readonly PAGE_TO: Rgb = [249, 209, 229];
  // Cards: blanco -> rosa muy pálido
  // (claro siempre, para mantener legible el texto oscuro encima).
  private readonly CARD_FROM: Rgb = [255, 255, 255];
  private readonly CARD_TO: Rgb = [252, 236, 244];

  constructor(private readonly sanitizer: DomSanitizer) {}

  private mix(from: Rgb, to: Rgb, t: number): string {
    const [r, g, b] = from.map((f, i) => Math.round(f + (to[i] - f) * t));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Handler de scroll: actualiza los fondos directamente en el DOM (sin pasar
  // por change detection, innecesaria y costosa a esta frecuencia).
  @HostListener('window:scroll')
  onScroll(): void {
    const el = this.sectionEl?.nativeElement;
    if (!el) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    const pageColor = this.mix(this.PAGE_FROM, this.PAGE_TO, t);
    const cardColor = this.mix(this.CARD_FROM, this.CARD_TO, t);

    el.style.backgroundColor = pageColor;
    if (this.hero) this.hero.bgColor = pageColor;
    el.querySelectorAll<HTMLElement>('.card').forEach((card) => {
      card.style.backgroundColor = cardColor;
    });
  }

  open(game: Game): void {
    this.selected.set(game);
    this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(game.url));
    this.topScores.set([]);
    void this.refreshScores(game.id);
  }

  close(): void {
    this.selected.set(null);
    this.safeUrl.set(null);
    this.topScores.set([]);
  }

  async refreshScores(gameId: string): Promise<void> {
    this.topScores.set(await fetchTopScores(gameId));
  }
}
