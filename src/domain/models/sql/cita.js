const cita = (sequelize, type) => {
	return sequelize.define(
		'citas',
		{
			idCita: {
				type: type.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			idCliente: type.INTEGER,
			idMascota: type.INTEGER,
			idServicio: type.INTEGER,
			fecha: type.DATE,
			hora: type.STRING,
			estadoCita: type.STRING,
			createCita: type.STRING,
			updateCita: type.STRING,
			userIdUser: {
				type: type.INTEGER,
				allowNull: true,
				defaultValue: null,
			}, // Veterinario asignado (opcional)
		},
		{
			timestamps: false,
			comment: 'Tabla de Citas',
		}
	)
}
module.exports = cita
