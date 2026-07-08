// Asistente "Bearnie" con IA real (API de Anthropic).
// Requiere ANTHROPIC_API_KEY en el .env; sin ella responde 503 y el
// widget del frontend usa sus respuestas locales.

const CONTEXTO = `Eres Bearnie, la osa asistente de Crunchy Munch, una tienda de galletas
artesanales New York Style en Colombia. Respondes SIEMPRE en español, cálida, breve
(máximo 3 frases) y EN MAYÚSCULAS.

Datos del negocio:
- Sedes: San Antonio de Pereira (Rionegro) y Marinilla, Antioquia.
- Pedidos: por la web (carrito) o WhatsApp; entrega a domicilio o recoger en tienda; pago en efectivo o transferencia.
- NY Cookies 120g $13.000 (Birthday, Oreo, Red Velvet, Smore's, Reese's, Sea Salt, Macadamia, Pie Limón, Pie Maracuyá, 3 Chocolates) y $15.000 (Kinder, Ferrero).
- NY Crookies $25.000 (croissant hojaldrado con queso: Kinder, Doble Kinder, Triple Chocolate, Red Velvet).
- Milkshakes $25.000 (450g): Cookies & Cream, Fresa, Red Velvet ("helado de tu galleta favorita").
- MiniCookies: caja 4 personas $50.000 (450g, 2 toppings), vaso 2 personas $25.000 (220g, 1 topping).
- Bebidas: matcha helado, chai helado, Hatsu soda (rosa, verde, naranja), Coca-Cola normal y Zero, leche Colanta personal.
- La web tiene minijuegos escondidos en la sección Juegos.
Si no sabes algo (horarios exactos, promociones), invita a escribir por WhatsApp.`;

async function responder(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'IA no configurada' });

  const { mensaje, historial } = req.body || {};
  if (typeof mensaje !== 'string' || !mensaje.trim()) {
    return res.status(400).json({ error: 'Falta mensaje' });
  }

  // Historial acotado: [{rol:'user'|'assistant', texto}] -> formato Anthropic.
  const previos = Array.isArray(historial)
    ? historial.slice(-8).map((m) => ({
        role: m.rol === 'assistant' ? 'assistant' : 'user',
        content: String(m.texto || '').slice(0, 500),
      }))
    : [];

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: CONTEXTO,
        messages: [...previos, { role: 'user', content: mensaje.slice(0, 500) }],
      }),
    });

    if (!r.ok) {
      console.error('[Chat] Anthropic respondió', r.status);
      return res.status(502).json({ error: 'La IA no está disponible ahora' });
    }

    const data = await r.json();
    const texto = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    res.json({ respuesta: texto || 'MMM… ¿ME LO REPITES?' });
  } catch (err) {
    console.error('[Chat] Error llamando a la IA:', err.message);
    res.status(502).json({ error: 'La IA no está disponible ahora' });
  }
}

module.exports = { responder };
