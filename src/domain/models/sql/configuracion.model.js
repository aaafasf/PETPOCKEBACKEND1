const configuracion = (sequelize, Sequelize) => {
  return sequelize.define('configuracion', {
    idConfiguracion: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    clave: Sequelize.STRING,
    valor: Sequelize.STRING,
    descripcion: Sequelize.STRING,
    tipo: Sequelize.STRING,
    createConfiguracion: Sequelize.STRING,
    updateConfiguracion: Sequelize.STRING
  }, {
    tableName: 'configuraciones',
    timestamps: false,
    comment: 'Tabla de configuraciones clave-valor'
  });
};

module.exports = configuracion;
