const configuracion = (sequelize, Sequelize) => {
  return sequelize.define('configuracion', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: Sequelize.STRING,
    telefono: Sequelize.STRING,
    correo: Sequelize.STRING,
    direccion: Sequelize.STRING,
    horarios: Sequelize.STRING,
    logo: Sequelize.STRING,
    zonaHoraria: Sequelize.STRING,
    idioma: Sequelize.STRING,
    formatoFecha: Sequelize.STRING,
    politicas: Sequelize.TEXT,
    horasMinimasCancelacion: Sequelize.INTEGER,
    limiteMascotas: Sequelize.INTEGER
  }, {
    timestamps: false,
    comment: 'Tabla de configuración de la clínica'
  });
};

module.exports = configuracion;
