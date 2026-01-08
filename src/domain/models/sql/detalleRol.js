const detalleRol = (sequelize, type) => {
  return sequelize.define('detalleRols', {
    idDetalleRol: {
      type: type.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    userIdUser: {
      type: type.INTEGER,
      allowNull: false
    },
    roleIdRol: {
      type: type.INTEGER,
      allowNull: false
    },
    createDetalleRol: {
      type: type.STRING,
      allowNull: false
    }
  }, {
    timestamps: false,
    tableName: 'detalleRols'
  });
};

module.exports = detalleRol;
