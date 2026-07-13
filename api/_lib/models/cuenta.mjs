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
    // Hash del código de 4 dígitos (contraseña para volver a entrar). No es el PIN.
    pinHash: { type: String, default: '' },
    // Trofeos de juegos (gamificación, aparte de la fidelidad).
    puntos: { type: Number, default: 0 },
    // Tarjeta de fidelidad: sellos actuales (0..meta) y tarjetas completadas.
    sellos: { type: Number, default: 0 },
    tarjetas: { type: Number, default: 0 },
    // Fecha (YYYY-MM-DD) del último sello: 1 sello por cuenta por día.
    ultimoSello: { type: String, default: '' },
    // Premio de estrellas (todos los juegos al 100%) ya reclamado (una vez).
    premioEstrellas: { type: Boolean, default: false },
    // Cupón de bienvenida (20% primera compra) ya usado (una vez por cuenta).
    cuponUsado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Cuenta = mongoose.models.Cuenta || mongoose.model('Cuenta', CuentaSchema);
