const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Color = sequelize.define('Color', {
    idColor: {
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
    tableName: 'colores',
    timestamps: true
  });
  return Color;
};