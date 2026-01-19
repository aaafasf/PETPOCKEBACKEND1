module.exports = (sequelize, Sequelize) => {
  const Catalogo = sequelize.define('catalogo', {
    idCatalogo: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    estado: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'catalogos',
    timestamps: false
  });

  // ======================
  // MÉTODOS USADOS POR EL CONTROLLER
  // ======================

  Catalogo.listar = async () => {
    return await Catalogo.findAll();
  };

  Catalogo.crear = async (data) => {
    return await Catalogo.create(data);
  };

  Catalogo.actualizar = async (id, data) => {
    return await Catalogo.update(data, {
      where: { idCatalogo: id }
    });
  };

  Catalogo.eliminar = async (id) => {
    return await Catalogo.destroy({
      where: { idCatalogo: id }
    });
  };

  return Catalogo;
};
