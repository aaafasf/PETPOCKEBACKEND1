const configuracion = (sequelize, Sequelize) => {
  return sequelize.define('configuracion', {
    idConfiguracion: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    idClinica: {   // 🔹 nuevo campo
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Identificador de la clínica dueña de esta configuración'
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
    comment: 'Tabla de configuraciones clave-valor por clínica'
  });
};

module.exports = configuracion;
