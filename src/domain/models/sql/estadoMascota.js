const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EstadoMascota = sequelize.define('EstadoMascota', {
    idEstadoMascota: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'estados_mascota',
    timestamps: true
  });
  return EstadoMascota;
};