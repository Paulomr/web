// Modelo "Cuenta": clientes registrados (para pedidos, premios y fidelidad).
//
// ⚠️ DATO PERSONAL: guarda nombre, edad, Instagram y dirección. Solo se debe
// escribir aquí con consentimiento del cliente (campo `acepta`). Antes de usarlo
// en producción con datos reales, rota las credenciales expuestas (pase de
// seguridad) — ver notas del proyecto.
import mongoose from 'mongoose';

const CuentaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    edad: { type: String, default: '' },
    // Usuario de Instagram normalizado (con @, minúsculas). Único cuando existe.
    instagram: { type: String, default: '', trim: true, lowercase: true },
    direccion: { type: String, default: '' },
    // Consentimiento de tratamiento de datos (obligatorio para registrarse).
    acepta: { type: Boolean, default: false },
    // Fidelidad: puntos acumulados (se irán sumando con pedidos/juegos).
    puntos: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Cuenta = mongoose.models.Cuenta || mongoose.model('Cuenta', CuentaSchema);
