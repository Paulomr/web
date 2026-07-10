// Función serverless (Vercel) que responde el chat de Bearnie con IA real.
// La API key vive SOLO en el servidor (variable de entorno ANTHROPIC_API_KEY),
// nunca se expone en el navegador. Usa Claude Haiku 4.5 (el modelo más
// económico en tokens).
//
// ⚠️ RELLENAR EN VERCEL: en el panel del proyecto → Settings → Environment
//    Variables, crea  ANTHROPIC_API_KEY  con tu clave de https://console.anthropic.com
//
// ⚠️ BLINDAJE POR IP (opcional pero recomendado): este archivo cuenta los
//    mensajes por IP usando Vercel KV (Redis) para que el límite de 20
//    mensajes/mes no dependa solo del localStorage del navegador. Para
//    activarlo, en el panel del proyecto de Vercel ve a Storage → crea un
//    store "KV" (Upstash/Redis) y conéctalo a este proyecto: Vercel crea
//    automáticamente las variables de entorno KV_REST_API_URL y
//    KV_REST_API_TOKEN. Si NO configuras esto, el chat sigue funcionando
//    normal, simplemente sin el conteo server-side por IP (ver más abajo).
import Anthropic from '@anthropic-ai/sdk';
import { kv } from '@vercel/kv';

// El cliente toma ANTHROPIC_API_KEY del entorno automáticamente.
const client = new Anthropic();

// Tope de mensajes por IP por mes (independiente del contador del navegador).
const LIMITE_MENSUAL = 20;

// Largo máximo permitido para el mensaje del usuario, para evitar abuso de tokens.
const LARGO_MAXIMO_MENSAJE = 1000;

// Extrae la IP real del cliente. En Vercel, 'x-forwarded-for' puede traer
// varias IPs separadas por coma (cliente, proxies...); la primera es la del cliente.
function obtenerIP(req) {
  const header = req.headers['x-forwarded-for'];
  if (typeof header === 'string' && header.trim()) {
    return header.split(',')[0].trim();
  }
  return 'anon';
}

// Arma la clave mensual (una por IP y por mes) que usamos en Redis, ej:
// "bearnie:2026-7:190.85.12.34"
function claveMensualPorIP(ip) {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth() + 1; // getMonth() es 0-indexado
  return `bearnie:${anio}-${mes}:${ip}`;
}

// Todo lo que Bearnie sabe de Crunchy Munch (catálogo real + datos de sedes).
const SYSTEM = `Eres Bearnie, la osa mascota y asistente de Crunchy Munch, una marca de galletas estilo Nueva York con sedes en San Antonio de Pereira (Rionegro) y Marinilla, Antioquia, Colombia.

TU ESTILO:
- Responde SIEMPRE en español, con calidez y cercanía, como una osa amigable y golosa.
- Sé breve: 1 a 3 frases. Puedes usar 1 emoji ocasional.
- Si te preguntan por el sabor de una galleta, descríbelo con antojo.
- Solo hablas de Crunchy Munch: productos, sabores, precios, sedes y pedidos. Si te preguntan algo ajeno o que no sabes con certeza, dilo con amabilidad e invita a escribir por WhatsApp.
- Precios en pesos colombianos (COP). NUNCA inventes precios ni productos que no estén en esta lista.

DATO CLAVE: TODAS las New York Cookies pesan 120 gramos cada una.

NEW YORK COOKIES (120 g c/u):
- Kinder ($15.000): repleta de chocolate Kinder y rellena de mucha Nutella.
- Ferrero ($15.000): chunks de chocolate semiamargo y un Ferrero entero por dentro.
- Birthday ($13.000): galleta sorpresa con relleno de temporada; pregunta cuál es el relleno actual.
- Oreo ($13.000): como un McFlurry de Oreo; mezclada con Oreo y rellena de mucho arequipe de la mejor calidad.
- Red Velvet ($13.000): rellena de cheesecake y coronada con lluvia de chocolate blanco.
- Smore's ($13.000): rellena de chocolate y coronada con marshmallow dorado; más chocolate que galleta.
- Reese's ($13.000): rellena de crema de maní, coronada con Reese's y chocolate blanco.
- Sea Salt ($13.000): puro chocolate y sal marina; el contraste perfecto.
- Macadamia ($13.000): mucho chocolate blanco y macadamias.
- Pie Limón ($13.000): relleno cremoso y corona de limón mandarino.
- Pie Maracuyá ($13.000): relleno y corona de maracuyá.
- 3 Chocolates ($13.000): galleta de chocolate con trozos de chocolate blanco y relleno de Nutella.

CROOKIES ($25.000): croissants hojaldrados con queso, rellenos y coronados con galleta. Rellenos disponibles: Nutella, cheesecake y Crema Kinder Suprema. Sabores: Kinder, Doble Kinder, Triple Chocolate y Red Velvet.

MILKSHAKES ($25.000 · 450 g · para 2 personas): helado de tu galleta favorita, de cualquier sabor de galleta disponible en el catálogo. Tip de Bearnie: si se derrite, no te preocupes; congélala y disfrutarás aún más la experiencia de un Milkshake Crunchy Munch. Presentaciones destacadas: Cookies & Cream, Fresa y Red Velvet.

MINI COOKIES: Caja para 4 personas (450 g, ~90 minicookies, 2 toppings) $50.000. Vaso para 2 personas (220 g, ~40 minicookies, 1 topping) $25.000.

BEBIDAS: Matcha helado, Chai helado, Hatsu Soda (rosa, verde y naranja), Coca-Cola normal y Zero, y leche Colanta personal. Para el precio exacto de bebidas, invita a consultar en tienda o por WhatsApp.

SEDES:
- San Antonio de Pereira (Rionegro). WhatsApp: +57 323 387 9652.
- Marinilla (Antioquia). WhatsApp: +57 321 526 5493.

PEDIDOS: pueden agregar productos al carrito (botón abajo a la derecha) y el pedido se envía por WhatsApp; o escribir directo por WhatsApp a la sede que prefieran.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const { mensaje, historial } = req.body ?? {};
    if (!mensaje || typeof mensaje !== 'string') {
      res.status(400).json({ error: 'Falta el mensaje' });
      return;
    }

    // Rechaza mensajes demasiado largos: evita que alguien mande textos
    // gigantes para inflar el consumo de tokens de la API de Anthropic.
    if (mensaje.length > LARGO_MAXIMO_MENSAJE) {
      res.status(400).json({ error: 'El mensaje es demasiado largo' });
      return;
    }

    // --- BLINDAJE POR IP CON VERCEL KV -------------------------------------
    // Contamos los mensajes por IP en Redis, con una clave que rota cada mes.
    // Si Vercel KV no está configurado (no existen las variables de entorno
    // KV_REST_API_URL / KV_REST_API_TOKEN) o kv.* lanza cualquier error, el
    // try/catch lo absorbe y el chat sigue funcionando normal, solo que sin
    // el conteo server-side (queda como respaldo el límite en el navegador).
    const kvDisponible = !!process.env.KV_REST_API_URL;
    let limiteSuperado = false;

    if (kvDisponible) {
      try {
        const ip = obtenerIP(req);
        const clave = claveMensualPorIP(ip);
        const contador = await kv.incr(clave);

        // En el primer incremento del mes, le ponemos vencimiento (~35 días)
        // para que la clave no quede creciendo para siempre en Redis.
        if (contador === 1) {
          await kv.expire(clave, 35 * 24 * 60 * 60);
        }

        if (contador > LIMITE_MENSUAL) {
          limiteSuperado = true;
        }
      } catch (kvErr) {
        // Degradación elegante: si KV falla, no rompemos el chat, solo lo registramos.
        console.error('Vercel KV no disponible, se omite el conteo por IP:', kvErr);
      }
    }

    if (limiteSuperado) {
      // No llamamos a Anthropic: respondemos directo para no gastar tokens.
      res.status(200).json({
        respuesta:
          'YA LLEGASTE A TUS 20 MENSAJES DE ESTE MES CONMIGO POR AQUÍ. ' +
          'PERO TRANQUILO, NO TE QUEDES CON EL ANTOJO: ESCRÍBENOS POR WHATSAPP ' +
          'Y CON GUSTO TE SEGUIMOS AYUDANDO. ¡TE ESPERO EL PRÓXIMO MES! 🐻',
      });
      return;
    }
    // --- FIN DEL BLINDAJE POR IP -------------------------------------------

    // Construye la conversación a partir del historial que envía el navegador.
    let messages = (Array.isArray(historial) ? historial : [])
      .filter((m) => m && m.texto)
      .map((m) => ({
        role: m.rol === 'user' ? 'user' : 'assistant',
        content: String(m.texto),
      }))
      .slice(-10);

    // La API exige que el primer turno sea del usuario.
    while (messages.length && messages[0].role !== 'user') messages.shift();

    // Garantiza que el último turno sea el mensaje actual del usuario.
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: mensaje });
    }

    const respuesta = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: SYSTEM,
      messages,
    });

    const texto = respuesta.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    res.status(200).json({ respuesta: texto });
  } catch (err) {
    console.error('Error en /api/chat:', err);
    res.status(500).json({ error: 'El asistente no está disponible ahora' });
  }
}
