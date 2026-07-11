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
