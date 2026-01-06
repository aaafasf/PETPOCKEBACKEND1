const mongoose = require('mongoose');
const { Schema } = mongoose;

const servicioSchema = new Schema({
  idServicioSql: {
    type: Number,
    required: true,
    unique: true   
  },

  descripcionExtendida: String,
  requisitos: [String],
  duracionMinutos: Number,
  equipoNecesario: [String],
  instruccionesPrevias: String,
  instruccionesPosteriores: String,
  etiquetas: [String],
  destacado: { type: Boolean, default: false },
  imagenUrl: String

}, { timestamps: true });

module.exports = mongoose.model('ServicioMongo', servicioSchema);
