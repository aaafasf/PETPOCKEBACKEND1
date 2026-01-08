const { Sequelize } = require('sequelize')

const sequelize = new Sequelize('Petpoket', 'linkear', '0987021692@Rj', {
	host: '31.97.42.126',
	port: 3306,
	dialect: 'mysql',
	logging: false,
})

async function checkAllData() {
	try {
		console.log('🔍 Verificando datos en la base de datos...\n')

		// Clientes
		const clientes = await sequelize.query(
			'SELECT idClientes FROM clientes LIMIT 5',
			{ type: Sequelize.QueryTypes.SELECT }
		)
		console.log(
			'👤 Clientes (IDs):',
			clientes.map(c => c.idClientes).join(', ')
		)

		// Mascotas
		const mascotas = await sequelize.query(
			'SELECT idMascota, nombreMascota FROM mascotas LIMIT 5',
			{ type: Sequelize.QueryTypes.SELECT }
		)
		console.log(
			'🐾 Mascotas:',
			mascotas.map(m => `${m.idMascota} (${m.nombreMascota})`).join(', ')
		)

		// Servicios
		const servicios = await sequelize.query(
			'SELECT idServicio, nombreServicio FROM servicios LIMIT 5',
			{ type: Sequelize.QueryTypes.SELECT }
		)
		console.log(
			'💼 Servicios:',
			servicios.map(s => `${s.idServicio} (${s.nombreServicio})`).join(', ')
		)

		// Usuarios (veterinarios)
		const users = await sequelize.query('SELECT idUser FROM users', {
			type: Sequelize.QueryTypes.SELECT,
		})
		console.log('👨‍⚕️ Veterinarios (IDs):', users.map(u => u.idUser).join(', '))
	} catch (err) {
		console.error('❌ Error:', err.message)
	} finally {
		await sequelize.close()
	}
}

checkAllData()
