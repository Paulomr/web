// Protección temporal para las rutas de administración (crear/editar/borrar
// productos, ver pedidos, etc.).
//
// POR AHORA usa una clave secreta compartida (ADMIN_TOKEN) que viaja en una
// cabecera. Es suficiente para empezar y proteger las escrituras. En la FASE de
// "cuentas y fidelidad" lo reemplazaremos por un login real con usuarios y
// sesiones (JWT). Por eso está aislado aquí: cambiarlo luego será en un solo sitio.
//
// ⚠️ RELLENAR EN VERCEL Y EN TU .env LOCAL:
//    ADMIN_TOKEN = una clave larga y secreta que solo tú conozcas.
//
// Aquí viven también los ayudantes de identidad del CLIENTE (@instagram + pin),
// para que la fórmula del hash exista en un solo sitio: si se duplica en cada
// endpoint, tarde o temprano una copia cambia y esas cuentas dejan de entrar.
import crypto from 'node:crypto';

export function esAdmin(req) {
  const token = req.headers['x-admin-token'];
  return Boolean(process.env.ADMIN_TOKEN) && token === process.env.ADMIN_TOKEN;
}

/** Corta la petición con 401 si no es admin. Devuelve true si puede seguir. */
export function requiereAdmin(req, res) {
  if (!esAdmin(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

/** Usuario de Instagram normalizado: '@usuario' en minúsculas, o '' si viene vacío. */
export function normalizarIg(s) {
  const v = (s || '').toString().trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  return v ? '@' + v : '';
}

/**
 * Hash del código de 4 dígitos del cliente. No cambiar la fórmula: dejaría
 * fuera a todas las cuentas ya creadas.
 */
export function hashPin(ig, pin) {
  return crypto.createHash('sha256').update(`${ig}:${pin}:crunchy-pin-v1`).digest('hex');
}
