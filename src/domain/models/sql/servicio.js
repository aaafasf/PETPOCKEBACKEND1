// src/domain/models/sql/servicio.js
module.exports = (sequelize, DataTypes) => {
  const Servicio = sequelize.define('servicio', {
    idServicio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    estadoServicio: {
      type: DataTypes.STRING,
      defaultValue: 'activo'
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'nombreServicio'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'descripcionServicio'
    },
    precio: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: 'precioServicio'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'createServicio'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updateServicio'
    }
    // Nota: El campo 'imagen' se almacena en MongoDB, no en MySQL
  }, {
    tableName: 'servicios',
    timestamps: false
  });

  return Servicio;
};

