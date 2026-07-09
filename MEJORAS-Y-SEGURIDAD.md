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

- [ ] **Blindar el límite por IP (a prueba de trampas).**
      Hoy el tope de 20 mensajes se guarda en el navegador (localStorage): sirve
      para el uso normal, pero alguien técnico podría reiniciarlo borrando datos
      del navegador y gastar tu saldo de API. Para un tope real:
      - Añadir **Vercel KV** (base de datos rápida, gratis en el plan hobby).
      - En `api/chat.mjs`, contar los mensajes por **IP** (`x-forwarded-for`) y
        rechazar cuando pasen del límite mensual.
      - Beneficio: el costo de la API queda blindado aunque borren el navegador.
      - *Se lo puedo montar cuando digas.*
- [ ] **Validar el tamaño del mensaje** en la función (rechazar mensajes muy
      largos) para evitar abuso de tokens. (Ya se valida que exista; falta el
      largo máximo.)
- [ ] **Cabeceras de seguridad** en `vercel.json` (`headers`): añadir
      `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
      `X-Frame-Options` / CSP. Endurecen el sitio con cero costo.
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

- [ ] **Imagen de compartir (Open Graph) con la foto nueva.** Cuando alguien
      pega tu link en WhatsApp/Instagram sale una tarjeta con foto. Hoy apunta a
      una foto vieja. Recomendado: crear una versión **1200×630 px** (horizontal)
      con la galleta/hero + logo, y ponerla como `og:image`.
      *Dime "sí" y la genero y la conecto.*
- [ ] **Iconos para instalar como app (PWA):** exportar el logo a `icon-192.png`
      y `icon-512.png` en `public/` y enlazarlos en `manifest.webmanifest`.
- [ ] **Analítica** para ver cuánta gente entra: **Vercel Analytics**
      (1 clic en el panel) o Google Analytics.
- [ ] **Rendimiento (Lighthouse):** correr una auditoría y afinar. Las fotos ya
      están en `.webp` y con carga diferida ✅; el hero nuevo lo optimicé a 211 KB.
- [ ] **Página 404 amigable** (con Bearnie) en vez de redirigir siempre al inicio.
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
