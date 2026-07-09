import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PAGES, SITE } from './site.config';

/**
 * Mantiene los metadatos SEO sincronizados con la ruta activa.
 *
 * Como el sitio es una SPA (una sola carga de index.html), sin este servicio
 * todas las secciones compartirían el mismo <title> y la misma descripción.
 * Aquí, en cada navegación, reescribimos título, descripción, canonical y
 * Open Graph con lo definido en site.config.ts — que es lo que Google lee al
 * renderizar la página.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  /** Empieza a escuchar los cambios de ruta. Se llama una vez, en el arranque. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.aplicar(e.urlAfterRedirects));
  }

  private aplicar(url: string): void {
    // Normaliza: quita query/hash y las barras de los extremos → clave de PAGES.
    const clave = url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    const page = PAGES[clave] ?? PAGES[''];

    const tituloCompleto = `${page.title} · ${SITE.sufijoTitulo}`;
    const canonical = SITE.url + (clave ? `/${clave}` : '/');
    const imagen = SITE.url + (page.image ?? SITE.imagenCompartir);

    this.title.setTitle(tituloCompleto);

    this.setName('description', page.description);
    this.setCanonical(canonical);

    // Open Graph / Twitter — para que al compartir cada sección salga su texto.
    this.setProperty('og:title', tituloCompleto);
    this.setProperty('og:description', page.description);
    this.setProperty('og:url', canonical);
    this.setProperty('og:image', imagen);
    this.setName('twitter:title', tituloCompleto);
    this.setName('twitter:description', page.description);
    this.setName('twitter:image', imagen);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(href: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
