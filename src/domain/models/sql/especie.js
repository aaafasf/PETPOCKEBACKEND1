const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Especie = sequelize.define('Especie', {
    idEspecie: {
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
    tableName: 'especies',
    timestamps: true
  });
  return Especie;
};