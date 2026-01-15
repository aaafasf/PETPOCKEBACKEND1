const { Sequelize } = require('sequelize')

const sequelize = new Sequelize('Petpoket', 'linkear', '0987021692@Rj', {
	host: '31.97.42.126',
	port: 3306,
	dialect: 'mysql',
	logging: false,
})

async function checkUsers() {
	try {
		// Primero verificar la estructura de la tabla
		const structure = await sequelize.query('DESCRIBE users', {
			type: Sequelize.QueryTypes.SELECT,
		})

		console.log('📋 Estructura de la tabla users:')
		structure.forEach(col => {
			console.log(`  ${col.Field} - ${col.Type}`)
		})

		// Ahora consultar los usuarios con los campos correctos
		const users = await sequelize.query('SELECT * FROM users LIMIT 10', {
			type: Sequelize.QueryTypes.SELECT,
		})

		console.log('\n👥 Usuarios en la tabla users:')
		users.forEach(u => {
			console.log(`  Usuario:`, u)
		})

		console.log(`\nTotal usuarios: ${users.length}`)
	} catch (err) {
		console.error('❌ Error:', err.message)
	} finally {
		await sequelize.close()
	}
}

checkUsers()
