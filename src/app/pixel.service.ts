import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Producto } from './productos';

// Píxel de Meta: le cuenta a Facebook/Instagram qué hace la gente en la web
// (ver una galleta, agregarla al carrito, mandar el pedido por WhatsApp) para
// que las campañas puedan medirse y buscar clientes parecidos a los que ya
// compraron. Sin esto, los anuncios optimizan a ciegas.
//
// IMPORTANTE — privacidad: aquí NUNCA se envían nombre, teléfono, dirección ni
// correo. Solo el id del producto y el valor del pedido. Si algún día se añade
// otro evento, mantener esa regla.
//
// El panel de administración (/admin) queda fuera del seguimiento.

const PIXEL_ID = '384601011383019';
const MONEDA = 'COP';

/** Firma de la función global `fbq` que instala el script de Meta. */
type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

@Injectable({ providedIn: 'root' })
export class PixelService {
  private readonly router = inject(Router);

  /** Arranca el píxel y el conteo de páginas (se llama una vez al iniciar la app). */
  iniciar(): void {
    if (this.esAdmin(this.router.url)) return;
    this.cargarScript();
    this.enviar('init', PIXEL_ID);
    this.enviar('track', 'PageView');

    // En una SPA la página no se recarga, así que hay que avisar a cada cambio
    // de ruta; si no, Meta creería que todo el mundo ve una sola página.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (!this.esAdmin(e.urlAfterRedirects || e.url)) this.enviar('track', 'PageView');
      });
  }

  /** Abrió la tarjeta ampliada de un producto. */
  verProducto(p: Producto): void {
    this.enviar('track', 'ViewContent', {
      content_ids: [p.id],
      content_name: p.nombre,
      content_type: 'product',
      content_category: p.categoria,
      value: this.pesos(p.precio),
      currency: MONEDA,
    });
  }

  /** Agregó un producto al carrito. */
  agregarAlCarrito(id: string, nombre: string, valor: number): void {
    this.enviar('track', 'AddToCart', {
      content_ids: [id],
      content_name: nombre,
      content_type: 'product',
      value: valor,
      currency: MONEDA,
    });
  }

  /**
   * Envió el pedido por WhatsApp. Es lo más cerca de una compra que se puede
   * medir aquí: el cobro ocurre después, fuera de la web. Se cuenta como
   * Purchase a propósito, para que las campañas optimicen por valor del pedido.
   */
  pedidoEnviado(ids: string[], valor: number): void {
    this.enviar('track', 'Purchase', {
      content_ids: ids,
      content_type: 'product',
      num_items: ids.length,
      value: valor,
      currency: MONEDA,
    });
  }

  /** Tocó la burbuja de WhatsApp para escribir sin pedido armado. */
  contactoWhatsapp(): void {
    this.enviar('track', 'Lead', { content_name: 'WhatsApp flotante' });
  }

  private enviar(...args: unknown[]): void {
    try {
      window.fbq?.(...args);
    } catch {
      /* bloqueador de anuncios o sin red: la web sigue igual */
    }
  }

  private esAdmin(url: string): boolean {
    return url.split(/[?#]/)[0].startsWith('/admin');
  }

  /** "$ 13.000" -> 13000. Sin precio (a consultar) -> 0. */
  private pesos(precio: string): number {
    const digitos = precio.replace(/[^\d]/g, '');
    return digitos ? parseInt(digitos, 10) : 0;
  }

  /** Fragmento oficial de Meta: crea la cola `fbq` y baja fbevents.js. */
  private cargarScript(): void {
    if (window.fbq) return;
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = window._fbq = fbq;

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
}
