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
    },
    imagen: {
      type: DataTypes.STRING,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'servicios',
    timestamps: false
  });

  return Servicio;
};

