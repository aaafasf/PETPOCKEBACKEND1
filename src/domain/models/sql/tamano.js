const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tamano = sequelize.define('Tamano', {
    idTamano: {
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
    tableName: 'tamanos',
    timestamps: true
  });
  return Tamano;
};