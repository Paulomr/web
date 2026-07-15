// Pedido enviado por WhatsApp desde la web. Se guarda para el panel:
// buscar por "código del pedido" y ver el historial de cada cliente.
//
// ⚠️ DATO PERSONAL: guarda nombre, teléfono y dirección de entrega. Solo se
// registra cuando el cliente (con sesión) envía el pedido.
import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    nombre: { type: String, default: '' },
    cantidad: { type: Number, default: 1 },
    precioUnit: { type: Number, default: 0 },
  },
  { _id: false },
);

const PedidoSchema = new mongoose.Schema(
  {
    // Código legible y único (CM-AAMMDD-XXXX): el que ve el cliente en WhatsApp.
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Cuenta que hizo el pedido (identidad = @instagram).
    instagram: { type: String, default: '', lowercase: true, trim: true, index: true },
    nombre: { type: String, default: '' },
    telefono: { type: String, default: '' },
    sede: { type: String, default: '' },
    entrega: { type: String, default: '' },
    pago: { type: String, default: '' },
    direccion: { type: String, default: '' },
    referencia: { type: String, default: '' },
    notas: { type: String, default: '' },
    items: { type: [ItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    descuento: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    cupon: { type: Boolean, default: false },
    hayConsultar: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Pedido = mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
