const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sexo = sequelize.define('Sexo', {
    idSexo: {
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
    tableName: 'sexos',
    timestamps: true
  });
  return Sexo;
};