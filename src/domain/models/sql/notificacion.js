    const notificacion = (sequelize, type) => {
        return sequelize.define('notificaciones', {
            idNotificacion: {
                type: type.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            idUsuario: type.INTEGER,
            mensaje: type.STRING,
            estadoNotificacion: type.STRING,
            createNotificacion: type.STRING,
        }, {
            timestamps: false,
            comment: 'Tabla de Notificaciones'
        });
    }
    module.exports = notificacion;
    