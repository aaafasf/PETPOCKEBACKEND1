const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Raza = sequelize.define('Raza', {
    idRaza: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    idEspecie: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'razas',
    timestamps: true
  });
  return Raza;
};