const { Sequelize } = require('sequelize');
const {
  MYSQLHOST,
  MYSQLUSER,
  MYSQLPASSWORD,
  MYSQLDATABASE,
  MYSQLPORT,
  MYSQL_URI
} = require('../../config/keys');

let sequelize;

// =======================
// CONEXIÓN
// =======================
if (MYSQL_URI) {
  sequelize = new Sequelize(MYSQL_URI, {
    dialect: 'mysql',
    dialectOptions: { charset: 'utf8mb4' },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    logging: false
  });
} else {
  sequelize = new Sequelize(
    MYSQLDATABASE,
    MYSQLUSER,
    MYSQLPASSWORD,
    {
      host: MYSQLHOST,
      port: MYSQLPORT,
      dialect: 'mysql',
      dialectOptions: { charset: 'utf8mb4' },
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      },
      logging: false
    }
  );
}

// =======================
// AUTENTICAR
// =======================
sequelize.authenticate()
  .then(() => console.log('✅ Conectado a MySQL (Sequelize)'))
  .catch(err => console.error('❌ Error MySQL:', err.message));

// =======================
// MODELOS
// =======================
const usuarioModel = require('../../domain/models/sql/usuario');
const rolModel = require('../../domain/models/sql/rol');
const detalleRolModel = require('../../domain/models/sql/detalleRol');
const clienteModel = require('../../domain/models/sql/cliente');
const mascotaModel = require('../../domain/models/sql/mascota');
const servicioModel = require('../../domain/models/sql/servicio');
const citaModel = require('../../domain/models/sql/cita');
const propietarioModel = require('../../domain/models/sql/propietario');
const productoModel = require('../../domain/models/sql/producto');
const pagoModel = require('../../domain/models/sql/pago');
const notificacionModel = require('../../domain/models/sql/notificacion');
const auditoriaModel = require('../../domain/models/sql/auditoria');
const feedbackModel = require('../../domain/models/sql/feedback');
const promocionModel = require('../../domain/models/sql/promocion');
const reservaModel = require('../../domain/models/sql/reserva');
const configuracionModel = require('../../domain/models/sql/configuracion');
const configuracionServicioModel = require('../../domain/models/sql/configuracionServicio');
const historialCitaModel = require('../../domain/models/sql/historialCita');
const historialPagoModel = require('../../domain/models/sql/historialPago');
const logModel = require('../../domain/models/sql/log');
const pageModel = require('../../domain/models/sql/page');
const tipoMascotaModel = require('../../domain/models/sql/tipoMascota');
const tipoServicioModel = require('../../domain/models/sql/tipoServicio');

// =======================
// INICIALIZAR MODELOS
// =======================
const usuario = usuarioModel(sequelize, Sequelize);
const rol = rolModel(sequelize, Sequelize);
const detalleRol = detalleRolModel(sequelize, Sequelize);
const cliente = clienteModel(sequelize, Sequelize);
const mascota = mascotaModel(sequelize, Sequelize);
const servicio = servicioModel(sequelize, Sequelize);
const cita = citaModel(sequelize, Sequelize);
const propietario = propietarioModel(sequelize, Sequelize);
const producto = productoModel(sequelize, Sequelize);
const pago = pagoModel(sequelize, Sequelize);
const notificacion = notificacionModel(sequelize, Sequelize);
const auditoria = auditoriaModel(sequelize, Sequelize);
const feedback = feedbackModel(sequelize, Sequelize);
const promocion = promocionModel(sequelize, Sequelize);
const reserva = reservaModel(sequelize, Sequelize);
const configuracion = configuracionModel(sequelize, Sequelize);
const configuracionServicio = configuracionServicioModel(sequelize, Sequelize);
const historialCita = historialCitaModel(sequelize, Sequelize);
const historialPago = historialPagoModel(sequelize, Sequelize);
const log = logModel(sequelize, Sequelize);
const page = pageModel(sequelize, Sequelize);
const tipoMascota = tipoMascotaModel(sequelize, Sequelize);
const tipoServicio = tipoServicioModel(sequelize, Sequelize);

// =======================
// RELACIONES
// =======================

// ROLES
usuario.hasMany(detalleRol, { foreignKey: 'idUsuario' });
detalleRol.belongsTo(usuario, { foreignKey: 'idUsuario' });

rol.hasMany(detalleRol, { foreignKey: 'idRol' });
detalleRol.belongsTo(rol, { foreignKey: 'idRol' });

// CITAS
usuario.hasMany(cita, { foreignKey: 'userIdUser' });
cita.belongsTo(usuario, { foreignKey: 'userIdUser' });

cliente.hasMany(cita, { foreignKey: 'idCliente' });
cita.belongsTo(cliente, { foreignKey: 'idCliente' });

mascota.hasMany(cita, { foreignKey: 'idMascota' });
cita.belongsTo(mascota, { foreignKey: 'idMascota' });

servicio.hasMany(cita, { foreignKey: 'idServicio' });
cita.belongsTo(servicio, { foreignKey: 'idServicio' });

// MASCOTAS
propietario.hasMany(mascota, { foreignKey: 'idPropietario' });
mascota.belongsTo(propietario, { foreignKey: 'idPropietario' });

// PAGOS
cita.hasMany(pago, { foreignKey: 'idCita' });
pago.belongsTo(cita, { foreignKey: 'idCita' });

// =======================
// EXPORTS
// =======================
module.exports = {
  sequelize,
  usuario,
  rol,
  detalleRol,
  cliente,
  mascota,
  servicio,
  cita,
  propietario,
  producto,
  pago,
  notificacion,
  auditoria,
  feedback,
  promocion,
  reserva,
  configuracion,
  configuracionServicio,
  historialCita,
  historialPago,
  log,
  page,
  tipoMascota,
  tipoServicio
};
