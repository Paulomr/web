# Crunchy Munch — Seguridad y mejoras para una web sólida y profesional

Guía viva. Marca con [x] lo que vayas completando.
Prioridad: 🔴 alta · 🟡 media · 🟢 opcional / a futuro.

---

## 1. Seguridad — ✅ YA APLICADO

- [x] **La API key de Anthropic vive solo en el servidor.** El chat de Bearnie
      llama a una función serverless (`api/chat.mjs`); la clave nunca viaja al
      navegador ni queda en el código del sitio.
- [x] **La trivia dejó de publicarse.** Era una app de servidor (con su propio
      `.env`) metida dentro de `public/`, así que el sitio la exponía en
      `/juegos/trivia/` (incluidas credenciales). La quité de la lista y la
      excluí del build en `angular.json`.
- [x] **`.vercel` y `.claude` ignorados** en `.gitignore` (no se suben configs
      locales).
- [x] **Sin secretos en el repositorio de git** (verificado: no hay `.env`
      rastreado).
- [x] **Tope de 20 mensajes/mes por persona** en el bot → controla el costo de
      la API en el uso normal.
- [x] **`/api` excluido del rewrite del SPA** en `vercel.json` (la función se
      ejecuta en vez de devolver el `index.html`).

---

## 2. Seguridad — 🔴 PENDIENTE (haz esto pronto)

- [ ] **Conectar la API de Anthropic.**
      1. Crea una cuenta en https://console.anthropic.com y añade saldo/crédito.
      2. Genera una API key (empieza por `sk-ant-...`).
      3. En Vercel → tu proyecto → **Settings → Environment Variables**, crea:
         - Nombre: `ANTHROPIC_API_KEY`
         - Valor: tu clave
         - Marca los 3 entornos (Production, Preview, Development).
      4. Vuelve a desplegar (o haz un push). Sin esta clave, Bearnie funciona
         igual pero con respuestas locales básicas.
- [ ] **Pon un límite de gasto en Anthropic.** En la consola → Billing →
      *Usage limits / Spend limit*. Así, pase lo que pase, el costo del bot
      nunca se dispara.
- [ ] **Rota las credenciales que estuvieron en el `.env` de la trivia**
      (contraseña de la base de datos MongoDB, tokens). Estuvieron públicas un
      tiempo: cámbialas por seguridad.
- [ ] **Elimina el proyecto "trivia" en Vercel** si sigue desplegado aparte
      (tenía su propia carpeta `.vercel`). Mientras exista, Google puede seguir
      mostrándolo al buscar "crunchy munch".

---

## 3. Seguridad — 🟡 RECOMENDADO (blindaje del costo y del sitio)

- [x] **Blindar el límite por IP (a prueba de trampas).** ✅ HECHO en el código.
      El tope de 20 mensajes ahora también se cuenta por **IP en el servidor**
      (`api/chat.mjs`, con **Vercel KV**), no solo en el navegador. Degradación
      elegante: si aún no creas el store KV, el chat funciona igual (solo se
      salta el conteo por IP). **Para ACTIVARLO** en Vercel: Storage → crear un
      store **KV** (Upstash/Redis) y conectarlo al proyecto; eso crea solo las
      variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`. Luego redeploy.
- [x] **Validar el tamaño del mensaje** ✅ HECHO. La función rechaza mensajes de
      más de 1000 caracteres para evitar abuso de tokens.
- [x] **Cabeceras de seguridad** en `vercel.json` ✅ HECHO. Añadidas
      `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
      `Referrer-Policy`, `Permissions-Policy` y `Strict-Transport-Security`.
      (CSP se dejó para después para no romper Google Maps.)
- [ ] **HTTPS**: ya lo da Vercel automáticamente ✅ (nada que hacer).

---

## 4. Verse sólida y profesional — 🔴 lo que más rinde

- [ ] **Comprar un dominio propio** (ej. `crunchymunch.com` o `.co`). Da mucha
      más confianza que `xxxx.vercel.app`, y mejora el SEO. Se conecta a Vercel
      en minutos.
- [ ] **Rellenar los `RELLENAR` del SEO.** El SEO no está "activo" del todo
      hasta completar, en `src/index.html`, `src/app/seo/site.config.ts`,
      `public/robots.txt` y `public/sitemap.xml`:
      - El **dominio** (el mismo en los 4 sitios).
      - En el JSON-LD: **horarios, dirección exacta y redes** (Instagram/Facebook/TikTok).
- [ ] **Google Business Profile** (ficha de Google Maps) para **cada sede**.
      Para un negocio local esto rinde MÁS que casi cualquier otra cosa: sales
      en el mapa, con fotos, horario y reseñas.
- [ ] **Google Search Console**: registra el sitio y envía el `sitemap.xml`
      (https://search.google.com/search-console) para que Google te indexe bien.

---

## 5. Verse profesional — 🟡 detalles que suman

- [x] **Imagen de compartir (Open Graph) con la foto nueva.** ✅ HECHO. Creé
      `public/fotos/og-crunchy-munch.jpg` (1200×630 px, ~70 KB) a partir del hero
      nuevo y la conecté como `og:image` y `twitter:image` en `src/index.html` y
      en `site.config.ts`. (La tarjeta saldrá bien cuando conectes el dominio
      real en los `RELLENAR`.)
- [ ] **Iconos para instalar como app (PWA):** exportar el logo a `icon-192.png`
      y `icon-512.png` en `public/` y enlazarlos en `manifest.webmanifest`.
- [ ] **Analítica** para ver cuánta gente entra: **Vercel Analytics**
      (1 clic en el panel) o Google Analytics.
- [ ] **Rendimiento (Lighthouse):** correr una auditoría y afinar. Las fotos ya
      están en `.webp` y con carga diferida ✅; el hero nuevo lo optimicé a 211 KB.
- [x] **Página 404 amigable** (con Bearnie) ✅ HECHO. Nueva página en
      `src/app/pages/no-encontrada/` con Bearnie sorprendida, "404", texto cálido
      y botón "VOLVER AL INICIO"; la ruta comodín ahora la muestra en vez de
      redirigir al inicio.
- [ ] **Accesibilidad:** revisar contraste de textos y `alt` en imágenes
      (varias ya lo tienen).

---

## 6. A futuro — 🟢 opcional

- [ ] **SSR (Angular con renderizado en servidor)** para el mejor SEO posible.
      Es un cambio más grande; hoy el SEO ya rinde bien sin esto para negocio local.
- [ ] **Política de privacidad / términos** si algún día recolectas datos
      (formularios, analítica con cookies).
- [ ] **Blindaje anti-spam** si agregas formularios de contacto (honeypot / captcha).

---

### ¿Qué te monto yo cuando quieras?
1. El **blindaje por IP** del bot (Vercel KV). 🔴
2. La **imagen Open Graph** 1200×630 con la foto nueva. 🟡
3. Las **cabeceras de seguridad** en `vercel.json`. 🟡
4. La **página 404** con Bearnie. 🟡

Solo dime cuál y lo dejo listo en un commit.
