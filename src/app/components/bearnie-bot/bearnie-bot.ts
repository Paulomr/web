import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Mensaje {
  rol: 'user' | 'assistant';
  texto: string;
}

// Asistente "Bearnie": burbuja flotante con chat.
// 1) Intenta el backend (/api/chat, IA real con la API de Anthropic).
// 2) Si no está disponible, responde localmente con el conocimiento del
//    negocio (precios, sedes, pedidos): nunca deja al cliente sin respuesta.

// Función serverless de Vercel (misma app). La API key vive en el servidor.
const API_CHAT = '/api/chat';

// Cada persona (por navegador) tiene 20 mensajes al mes con Bearnie.
const LIMITE_MENSUAL = 20;
const LIMITE_TEXTO =
  'POR AHORA LLEGASTE A TUS 20 MENSAJES DEL MES CONMIGO 🐻 VUELVO EL PRÓXIMO MES, ' +
  'O ESCRÍBENOS POR WHATSAPP Y TE ATENDEMOS AL INSTANTE.';

const SALUDO: Mensaje = {
  rol: 'assistant',
  texto: '¡HOLA! SOY BEARNIE, LA OSA DE CRUNCHY MUNCH. PREGÚNTAME POR PRECIOS, SEDES, PEDIDOS O LO QUE NECESITES.',
};

const RESPUESTAS: { claves: string[]; texto: string }[] = [
  {
    claves: ['hola', 'buenas', 'hey', 'saludos'],
    texto: '¡HOLA! ¿QUÉ ANTOJO TIENES HOY? PUEDO CONTARTE DE NUESTRAS GALLETAS, CROOKIES, MILKSHAKES Y MÁS.',
  },
  {
    claves: ['precio', 'cuesta', 'valor', 'vale', 'cuanto'],
    texto: 'NUESTRAS NY COOKIES DE 120G CUESTAN $13.000 ($15.000 LA KINDER Y LA FERRERO), LOS CROOKIES $25.000, LOS MILKSHAKES $25.000 (450G), LA CAJA MINICOOKIES $50.000 Y EL VASO $25.000.',
  },
  {
    claves: ['galleta', 'cookie', 'sabores'],
    texto: 'TENEMOS 12 SABORES DE NY COOKIES: BIRTHDAY, KINDER, FERRERO, OREO, RED VELVET, SMORE’S, REESE’S, SEA SALT, MACADAMIA, PIE LIMÓN, PIE MARACUYÁ Y 3 CHOCOLATES.',
  },
  {
    claves: ['crookie', 'croissant'],
    texto: 'EL CROOKIE ES CROISSANT HOJALDRADO CON QUESO + MASA DE GALLETA: KINDER, DOBLE KINDER, TRIPLE CHOCOLATE Y RED VELVET. TODOS A $25.000.',
  },
  {
    claves: ['milkshake', 'malteada', 'batido', 'helado'],
    texto: 'NUESTROS MILKSHAKES SON HELADO DE TU GALLETA FAVORITA, 450G POR $25.000: COOKIES & CREAM, FRESA Y RED VELVET.',
  },
  {
    claves: ['mini', 'minicookies'],
    texto: 'MINICOOKIES: CAJA PARA 4 PERSONAS (450G, 2 TOPPINGS) $50.000, O VASO PARA 2 (220G, 1 TOPPING) $25.000.',
  },
  {
    claves: ['bebida', 'matcha', 'chai', 'soda', 'hatsu', 'coca', 'leche'],
    texto: 'TENEMOS MATCHA HELADO, CHAI HELADO, HATSU SODA (ROSA, VERDE Y NARANJA), COCA-COLA NORMAL Y ZERO, Y LECHE COLANTA PERSONAL.',
  },
  {
    claves: ['sede', 'ubicacion', 'donde', 'direccion', 'local', 'tienda', 'mapa'],
    texto: 'TENEMOS DOS SEDES: SAN ANTONIO DE PEREIRA (RIONEGRO) Y MARINILLA. EN LA PÁGINA DE INICIO ESTÁN LOS MAPAS CON EL BOTÓN "CÓMO LLEGAR".',
  },
  {
    claves: ['pedido', 'pedir', 'ordenar', 'carrito', 'comprar', 'domicilio', 'entrega'],
    texto: 'AGREGA TUS ANTOJOS AL CARRITO (BOTÓN DE ABAJO A LA DERECHA), ELIGE DOMICILIO O RECOGER EN TIENDA, EFECTIVO O TRANSFERENCIA, Y EL PEDIDO SE ENVÍA SOLO POR WHATSAPP.',
  },
  {
    claves: ['pago', 'transferencia', 'efectivo', 'nequi', 'tarjeta'],
    texto: 'PUEDES PAGAR EN EFECTIVO O POR TRANSFERENCIA. EN TIENDA TAMBIÉN RECIBIMOS TARJETAS DÉBITO Y CRÉDITO.',
  },
  {
    claves: ['horario', 'abren', 'cierran', 'hora'],
    texto: 'LOS HORARIOS PUEDEN VARIAR POR SEDE: ESCRÍBENOS POR WHATSAPP Y TE CONFIRMAMOS AL INSTANTE.',
  },
  {
    claves: ['juego', 'jugar', 'pacman', 'trivia'],
    texto: 'ESCONDÍ UNOS MINIJUEGOS MÁGICOS EN LA SECCIÓN "JUEGOS" DEL MENÚ. ¡A VER SI SUPERAS MI PUNTAJE!',
  },
  {
    claves: ['gracias', 'genial', 'perfecto'],
    texto: '¡CON MUCHO GUSTO! RECUERDA: UNA SOLA NO ES SUFICIENTE.',
  },
];

const FALLBACK =
  'ESA NO ME LA SÉ TODAVÍA, PERO EN WHATSAPP TE AYUDAMOS AL INSTANTE. TAMBIÉN PUEDO CONTARTE DE PRECIOS, SEDES O CÓMO HACER TU PEDIDO.';

@Component({
  selector: 'app-bearnie-bot',
  imports: [],
  templateUrl: './bearnie-bot.html',
  styleUrl: './bearnie-bot.css',
})
export class BearnieBot {
  private readonly router = inject(Router);

  readonly abierto = signal(false);
  readonly escribiendo = signal(false);
  readonly mensajes = signal<Mensaje[]>([SALUDO]);

  /** Oculta a Bearnie en la sección de minijuegos (no estorbar al jugar). */
  readonly oculto = signal(this.enMinijuegos(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.enMinijuegos(e.urlAfterRedirects)) this.abierto.set(false);
        this.oculto.set(this.enMinijuegos(e.urlAfterRedirects));
      });
  }

  private enMinijuegos(url: string): boolean {
    return url.startsWith('/minijuegos');
  }

  async enviar(input: HTMLInputElement): Promise<void> {
    const texto = input.value.trim();
    if (!texto || this.escribiendo()) return;
    input.value = '';

    this.mensajes.update((m) => [...m, { rol: 'user', texto: texto.toUpperCase() }]);

    // Tope mensual: si ya usó sus 20, avisa y no consulta la IA.
    if (this.usados() >= LIMITE_MENSUAL) {
      this.mensajes.update((m) => [...m, { rol: 'assistant', texto: LIMITE_TEXTO }]);
      this.desplazar();
      return;
    }
    this.registrarUso();

    this.escribiendo.set(true);
    const respuesta = (await this.respuestaIA(texto)) ?? this.respuestaLocal(texto);
    this.mensajes.update((m) => [...m, { rol: 'assistant', texto: respuesta }]);
    this.escribiendo.set(false);
    this.desplazar();
  }

  // ---- Límite de 20 mensajes/mes por navegador (localStorage) ----
  private claveMes(): string {
    const d = new Date();
    return `bearnie-msgs-${d.getFullYear()}-${d.getMonth() + 1}`;
  }
  private usados(): number {
    try {
      return Number(localStorage.getItem(this.claveMes())) || 0;
    } catch {
      return 0;
    }
  }
  private registrarUso(): void {
    try {
      localStorage.setItem(this.claveMes(), String(this.usados() + 1));
    } catch {
      /* modo privado / sin storage: no bloquea el chat */
    }
  }

  private desplazar(): void {
    queueMicrotask(() => {
      const caja = document.querySelector('.bot-mensajes');
      caja?.scrollTo({ top: caja.scrollHeight, behavior: 'smooth' });
    });
  }

  /** IA real vía backend; null si no está disponible. */
  private async respuestaIA(texto: string): Promise<string | null> {
    try {
      const r = await fetch(API_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, historial: this.mensajes().slice(-8) }),
      });
      if (!r.ok) return null;
      const data = (await r.json()) as { respuesta?: string };
      return data.respuesta?.trim() || null;
    } catch {
      return null;
    }
  }

  private respuestaLocal(texto: string): string {
    const limpio = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    let mejor: { puntos: number; texto: string } = { puntos: 0, texto: FALLBACK };
    for (const r of RESPUESTAS) {
      const puntos = r.claves.filter((c) => limpio.includes(c)).length;
      if (puntos > mejor.puntos) mejor = { puntos, texto: r.texto };
    }
    return mejor.texto;
  }
}
