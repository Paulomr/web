# Backend de Crunchy Munch — plan y guía

Backend **estable, por fases**. Cada fase se termina y se prueba antes de la
siguiente. Así crece ordenado y nunca se vuelve un "desorden".

## Cómo está montado (arquitectura)

- **Frontend:** Angular (la web que ya tienes) — no cambia su forma de trabajar.
- **Backend:** funciones serverless en la carpeta `api/` (se ejecutan en Vercel,
  sin servidor que tengas que mantener prendido).
- **Base de datos:** **MongoDB Atlas** (Mongo en la nube, gratis para empezar).
- **Conexión:** con **Mongoose** (valida los datos → no entra basura a la base).

```
api/
  _lib/                 <- código compartido (no son rutas)
    mongo.mjs           <- conexión cacheada a MongoDB
    auth.mjs            <- protección de rutas de admin (temporal)
    models/
      producto.mjs      <- forma de cada producto en la base
  productos/
    index.mjs           <- GET lista | POST crear (admin)
    [id].mjs            <- GET uno | PUT editar | DELETE ocultar (admin)
    models/
      pedido.mjs        <- pedidos enviados por WhatsApp (código, cliente, ítems)
      visita.mjs        <- pageviews para las estadísticas de tráfico
  productos/
    index.mjs           <- GET lista | POST crear (admin)
    [id].mjs            <- GET uno | PUT editar | DELETE ocultar (admin)
  pedidos.mjs           <- POST registra pedido | GET admin busca por código
  estadisticas.mjs      <- POST registra visita | GET admin métricas del negocio
  chat.mjs              <- IA de Bearnie (ya existía)
scripts/                <- utilidades (semilla de datos, etc.)
```

> Nota Vercel: cada archivo de `api/*.mjs` es una función serverless. Hoy hay 11
> (el plan Hobby permite 12). Si se agregan más, conviene agrupar acciones dentro
> de un mismo endpoint.

## Fases

- [x] **Fase 1 — Menú en la base de datos** ✅
      Menú en MongoDB con API para leerlo (con fallback local) y editarlo.
- [x] **Fase 2 — Panel de administración** ✅ (en `/admin`, protegido con ADMIN_TOKEN)
      Crear/editar/ocultar/reordenar productos, agrupados por categoría, con
      preview de fotos y pausa temporal ("vuelve solo" en una fecha).
- [~] **Fase 2.5 — CMS de contenido + subir fotos**
      · [x] Editar títulos/subtítulos desde el panel.
      · [x] Activar/desactivar minijuegos.
      · [x] Horarios y fechas especiales de las sedes.
      · [ ] Arrastrar y subir fotos (producto, hero, galería) → necesita **Vercel Blob**.
- [x] **Fase 3 — Guardar pedidos** ✅
      Cada pedido se guarda en la base (además de enviarse por WhatsApp) con su
      "código del pedido". El panel `/admin/estadisticas` busca por código y muestra
      los datos del cliente y su historial de pedidos.
- [x] **Fase 3.5 — Estadísticas del negocio** ✅
      Página `/admin/estadisticas` (diseño propio): tráfico en vivo / por día / mes /
      año, usuarios registrados, jugadores por juego, pedidos e ingresos.
- [ ] **Fase 4 — Pagos en línea**
      Cobro con tarjeta/PSE (proveedor colombiano: Wompi o MercadoPago).
- [ ] **Fase 5 — Cuentas y fidelidad**
      Registro/login de clientes, puntos por compra, login de admin real (reemplaza
      el ADMIN_TOKEN temporal).
- [ ] **Fase 6 — Rankings reales de los juegos**
      Reemplazar el marcador que hoy apunta a `localhost:3000` por uno real en Mongo.

---

## Lo que debes hacer TÚ (una sola vez): conectar MongoDB Atlas

1. Entra a **https://www.mongodb.com/atlas** y crea una cuenta (o inicia sesión).
2. Crea un **cluster gratis** (plan **M0**).
3. En **Database Access**, crea un usuario de base de datos con contraseña.
4. En **Network Access**, agrega la IP `0.0.0.0/0` (permitir desde cualquier lado;
   Vercel usa IPs variables). *Más adelante se puede afinar.*
5. En **Connect → Drivers**, copia la **cadena de conexión** (empieza por
   `mongodb+srv://...`). Reemplaza `<password>` por la clave del usuario y agrega
   al final el nombre de la base: `.../crunchymunch`.
6. Ponla en dos lugares:
   - **Local:** copia `.env.example` a `.env` y pega la cadena en `MONGODB_URI`.
   - **Vercel:** Settings → Environment Variables → `MONGODB_URI`.
7. Inventa una `ADMIN_TOKEN` (clave larga y secreta) y ponla en los dos lugares.

> ¿Ya tienes un Mongo? Si es **Atlas**, sirve el mismo (usamos colecciones
> nuevas). Si es **local** (en tu PC), NO sirve para la web publicada: Vercel no
> puede entrar a tu computador. En ese caso hay que crear el Atlas de arriba.

Cuando tengas la `MONGODB_URI`, avísame y hacemos la **semilla** (subir el menú
actual a la base) y conectamos la web para que lea desde ahí.
