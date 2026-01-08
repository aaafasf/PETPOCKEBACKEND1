const citaCtl = {};
const orm = require('../../Database/dataBase.orm.js');
const sql = require('../../Database/dataBase.sql.js');
const mongo = require('../../Database/dataBaseMongose');
const { cifrarDatos, descifrarDatos } = require('../../../application/controller/encrypDates.js');

// Función para descifrar de forma segura
const descifrarSeguro = dato => {
	try {
		return dato ? descifrarDatos(dato) : ''
	} catch (error) {
		console.error('Error al descifrar:', error)
		return ''
	}
}

// Función para decodificar campos de URL
const decodificarCampo = campo => {
	try {
		return campo ? decodeURIComponent(campo) : ''
	} catch (error) {
		console.error('Error al decodificar:', error)
		return campo || ''
	}
}

// Mostrar todas las citas con información completa
citaCtl.mostrarCitas = async (req, res) => {
	try {
		const [listaCitas] = await sql.promise().query(`
            SELECT c.*, 
                   cl.nombreCliente, cl.cedulaCliente,
                   m.nombreMascota, m.especie,
                   s.nombreServicio, s.precioServicio,
                   u.nameUsers as veterinario
            FROM citas c
            JOIN clientes cl ON c.idCliente = cl.idClientes
            JOIN mascotas m ON c.idMascota = m.idMascota
            JOIN servicios s ON c.idServicio = s.idServicio
            LEFT JOIN users u ON c.userIdUser = u.idUser
            ORDER BY c.fecha DESC, c.hora DESC
        `)

		const citasCompletas = await Promise.all(
			listaCitas.map(async cita => {
				const citaMongo = await mongo.citaModel.findOne({
					idCitaSql: cita.idCita.toString(),
				})

				return {
					...cita,
					cliente: {
						nombre: descifrarSeguro(cita.nombreCliente),
						cedula: descifrarSeguro(cita.cedulaCliente),
					},
					mascota: {
						nombre: descifrarSeguro(cita.nombreMascota),
						especie: descifrarSeguro(cita.especie),
					},
					servicio: {
						nombre: descifrarSeguro(cita.nombreServicio),
						precio: cita.precioServicio,
					},
					veterinario: descifrarSeguro(cita.veterinario),
					detallesMongo: citaMongo
						? {
								motivo: citaMongo.motivo,
								sintomas: citaMongo.sintomas,
								diagnosticoPrevio: citaMongo.diagnosticoPrevio,
								tratamientosAnteriores: citaMongo.tratamientosAnteriores,
								estado: citaMongo.estado,
								notasAdicionales: citaMongo.notasAdicionales,
								asistio: citaMongo.asistio,
								fechaReal: citaMongo.fechaReal,
						  }
						: null,
				}
			})
		)

		return res.json(citasCompletas)
	} catch (error) {
		console.error('Error al mostrar citas:', error)
		return res
			.status(500)
			.json({ message: 'Error al obtener las citas', error: error.message })
	}
}

// Crear nueva cita
citaCtl.crearCita = async (req, res) => {
	try {
		const {
			idCliente,
			idMascota,
			idServicio,
			fecha,
			hora,
			userIdUser,
			motivo,
			sintomas,
			diagnosticoPrevio,
			tratamientosAnteriores,
			notasAdicionales,
		} = req.body

		if (!idCliente || !idMascota || !idServicio || !fecha || !hora) {
			return res.status(400).json({
				message: 'Cliente, mascota, servicio, fecha y hora son obligatorios',
			})
		}

		// Limpiar userIdUser: solo aceptar números válidos mayores a 0, de lo contrario null
		let veterinarioId = null
		if (
			userIdUser !== undefined &&
			userIdUser !== null &&
			userIdUser !== '' &&
			userIdUser !== '0' &&
			userIdUser !== 0
		) {
			const numVet =
				typeof userIdUser === 'string' ? parseInt(userIdUser, 10) : userIdUser
			if (!isNaN(numVet) && numVet > 0) {
				veterinarioId = numVet
			}
		}

		console.log(
			'📥 userIdUser recibido:',
			userIdUser,
			'tipo:',
			typeof userIdUser
		)
		console.log('✅ veterinarioId procesado:', veterinarioId)

		const nuevaCita = await orm.cita.create({
			idCliente: idCliente,
			idMascota: idMascota,
			idServicio: idServicio,
			fecha: fecha,
			hora: decodificarCampo(hora),
			estadoCita: 'programada',
			userIdUser: veterinarioId,
			createCita: new Date().toLocaleString(),
		})

		await mongo.citaModel.create({
			idCitaSql: nuevaCita.idCita.toString(),
			idCliente: idCliente.toString(),
			idMascota: idMascota.toString(),
			motivo: decodificarCampo(motivo) || '',
			sintomas: decodificarCampo(sintomas) || '',
			diagnosticoPrevio: decodificarCampo(diagnosticoPrevio) || '',
			tratamientosAnteriores: tratamientosAnteriores || [],
			estado: 'pendiente',
			notasAdicionales: decodificarCampo(notasAdicionales) || '',
			asistio: false,
		})

		return res.status(201).json({
			message: 'Cita creada exitosamente',
			idCita: nuevaCita.idCita,
		})
	} catch (error) {
		console.error('Error al crear cita:', error)
		return res.status(500).json({
			message: 'Error al crear la cita',
			error: error.message,
		})
	}
}

// Actualizar cita
citaCtl.actualizarCita = async (req, res) => {
	try {
		const { idCita } = req.params // Suponiendo que el ID se pasa como parámetro en la URL
		const {
			idCliente,
			idMascota,
			idServicio,
			fecha,
			hora,
			userIdUser,
			motivo,
			sintomas,
			diagnosticoPrevio,
			tratamientosAnteriores,
			notasAdicionales,
		} = req.body

		if (!idCliente || !idMascota || !idServicio || !fecha || !hora) {
			return res.status(400).json({
				message: 'Cliente, mascota, servicio, fecha y hora son obligatorios',
			})
		}

		// Actualizar en la base de datos SQL
		await orm.cita.update(
			{
				idCliente: idCliente,
				idMascota: idMascota,
				idServicio: idServicio,
				fecha: fecha,
				hora: decodificarCampo(hora),
				estadoCita: 'programada',
				userIdUser: userIdUser || null,
			},
			{
				where: { idCita },
			}
		)

		// Actualizar en la base de datos MongoDB
		await mongo.citaModel.updateOne(
			{ idCitaSql: idCita },
			{
				idCliente: idCliente.toString(),
				idMascota: idMascota.toString(),
				motivo: decodificarCampo(motivo) || '',
				sintomas: decodificarCampo(sintomas) || '',
				diagnosticoPrevio: decodificarCampo(diagnosticoPrevio) || '',
				tratamientosAnteriores: tratamientosAnteriores || [],
				notasAdicionales: decodificarCampo(notasAdicionales) || '',
				asistio: false, // Puedes cambiar esto si es necesario
			}
		)

		return res.json({ message: 'Cita actualizada exitosamente' })
	} catch (error) {
		console.error('Error al actualizar cita:', error)
		return res.status(500).json({
			message: 'Error al actualizar la cita',
			error: error.message,
		})
	}
}

// Eliminar cita
citaCtl.eliminarCita = async (req, res) => {
	try {
		const { idCita } = req.params // Suponiendo que el ID se pasa como parámetro en la URL

		// Marcar como inactivo en SQL
		await orm.cita.update(
			{
				estadoCita: 'cancelada',
				updateCita: new Date().toLocaleString(),
			},
			{
				where: { idCita },
			}
		)

		// Marcar como inactivo en MongoDB
		await mongo.citaModel.updateOne(
			{ idCitaSql: idCita },
			{ estado: 'cancelada' }
		)

		return res.json({ message: 'Cita cancelada exitosamente' })
	} catch (error) {
		console.error('Error al eliminar cita:', error)
		return res.status(500).json({
			message: 'Error al cancelar la cita',
			error: error.message,
		})
	}
}

// Obtener una cita específica por ID
citaCtl.obtenerCitaPorId = async (req, res) => {
	try {
		const { idCita } = req.params

		const [citaSQL] = await sql.promise().query(
			`
            SELECT c.*, 
                   cl.nombreCliente, cl.cedulaCliente,
                   m.nombreMascota, m.especie,
                   s.nombreServicio, s.precioServicio,
                   u.nameUsers as veterinario
            FROM citas c
            JOIN clientes cl ON c.idCliente = cl.idClientes
            JOIN mascotas m ON c.idMascota = m.idMascota
            JOIN servicios s ON c.idServicio = s.idServicio
            LEFT JOIN users u ON c.userIdUser = u.idUser
            WHERE c.idCita = ?
        `,
			[idCita]
		)

		if (citaSQL.length === 0) {
			return res.status(404).json({ message: 'Cita no encontrada' })
		}

		const cita = citaSQL[0]
		const citaMongo = await mongo.citaModel.findOne({
			idCitaSql: idCita,
		})

		const citaCompleta = {
			...cita,
			cliente: {
				nombre: descifrarSeguro(cita.nombreCliente),
				cedula: descifrarSeguro(cita.cedulaCliente),
			},
			mascota: {
				nombre: descifrarSeguro(cita.nombreMascota),
				especie: descifrarSeguro(cita.especie),
			},
			servicio: {
				nombre: descifrarSeguro(cita.nombreServicio),
				precio: cita.precioServicio,
				duracion: cita.duracionServicio,
			},
			veterinario: descifrarSeguro(cita.veterinario),
			detallesMongo: citaMongo
				? {
						motivo: citaMongo.motivo,
						sintomas: citaMongo.sintomas,
						diagnosticoPrevio: citaMongo.diagnosticoPrevio,
						tratamientosAnteriores: citaMongo.tratamientosAnteriores,
						estado: citaMongo.estado,
						notasAdicionales: citaMongo.notasAdicionales,
						asistio: citaMongo.asistio,
						fechaReal: citaMongo.fechaReal,
				  }
				: null,
		}

		return res.json(citaCompleta)
	} catch (error) {
		console.error('Error al obtener cita:', error)
		return res.status(500).json({
			message: 'Error al obtener la cita',
			error: error.message,
		})
	}
}

// Obtener citas por cliente (Mis próximas citas)
citaCtl.obtenerCitasPorCliente = async (req, res) => {
	try {
		const { idCliente } = req.params
		const { estado } = req.query // Opcional: filtrar por estado

		let query = `
            SELECT c.*, 
                   m.nombreMascota, m.especie,
                   s.nombreServicio, s.precioServicio,
                   u.nameUsers as veterinario
            FROM citas c
            JOIN mascotas m ON c.idMascota = m.idMascota
            JOIN servicios s ON c.idServicio = s.idServicio
            LEFT JOIN users u ON c.userIdUser = u.idUser
            WHERE c.idCliente = ?
        `

		const params = [idCliente]

		if (estado) {
			query += ` AND c.estadoCita = ?`
			params.push(estado)
		}
		// No aplicar filtro por defecto - devolver todas las citas

		query += ` ORDER BY c.createCita DESC, c.fecha DESC, c.hora DESC`

		const [listaCitas] = await sql.promise().query(query, params)

		const citasCompletas = await Promise.all(
			listaCitas.map(async cita => {
				const citaMongo = await mongo.citaModel.findOne({
					idCitaSql: cita.idCita.toString(),
				})

				return {
					idCita: cita.idCita,
					idCliente: cita.idCliente,
					idMascota: cita.idMascota,
					idServicio: cita.idServicio,
					fecha: cita.fecha,
					hora: cita.hora,
					estadoCita: cita.estadoCita,
					createCita: cita.createCita,
					updateCita: cita.updateCita,
					userIdUser: cita.userIdUser,
					mascota: {
						nombre: descifrarSeguro(cita.nombreMascota),
						especie: descifrarSeguro(cita.especie),
					},
					servicio: {
						nombre: descifrarSeguro(cita.nombreServicio),
						precio: cita.precioServicio,
					},
					veterinario: descifrarSeguro(cita.veterinario),
					detallesMongo: citaMongo
						? {
								motivo: citaMongo.motivo,
								sintomas: citaMongo.sintomas,
								estado: citaMongo.estado,
								notasAdicionales: citaMongo.notasAdicionales,
						  }
						: null,
				}
			})
		)

		return res.json(citasCompletas)
	} catch (error) {
		console.error('Error al obtener citas del cliente:', error)
		return res.status(500).json({
			message: 'Error al obtener las citas del cliente',
			error: error.message,
		})
	}
}

// Calendario de citas (para veterinario o administrador)
citaCtl.obtenerCalendarioCitas = async (req, res) => {
	try {
		const { fechaInicio, fechaFin, idVeterinario } = req.query

		let query = `
            SELECT c.idCita, c.fecha, c.hora, c.estadoCita,
                   cl.nombreCliente,
                   m.nombreMascota,
                   s.nombreServicio, s.duracionServicio,
                   u.nameUsers as veterinario
            FROM citas c
            JOIN clientes cl ON c.idCliente = cl.idClientes
            JOIN mascotas m ON c.idMascota = m.idMascota
            JOIN servicios s ON c.idServicio = s.idServicio
            LEFT JOIN users u ON c.userIdUser = u.idUser
            WHERE 1=1
        `

		const params = []

		if (fechaInicio && fechaFin) {
			query += ` AND c.fecha BETWEEN ? AND ?`
			params.push(fechaInicio, fechaFin)
		} else if (fechaInicio) {
			query += ` AND c.fecha >= ?`
			params.push(fechaInicio)
		}

		if (idVeterinario) {
			query += ` AND c.userIdUser = ?`
			params.push(idVeterinario)
		}

		// Filtrar solo citas programadas y confirmadas
		query += ` AND c.estadoCita IN ('programada', 'confirmada')`
		query += ` ORDER BY c.fecha ASC, c.hora ASC`

		const [listaCitas] = await sql.promise().query(query, params)

		const citasCalendario = listaCitas.map(cita => ({
			idCita: cita.idCita,
			titulo: `${descifrarSeguro(cita.nombreMascota)} - ${descifrarSeguro(
				cita.nombreServicio
			)}`,
			fechaHora: `${cita.fecha} ${cita.hora}`,
			fecha: cita.fecha,
			hora: cita.hora,
			duracion: cita.duracionServicio,
			estado: cita.estadoCita,
			cliente: descifrarSeguro(cita.nombreCliente),
			mascota: descifrarSeguro(cita.nombreMascota),
			servicio: descifrarSeguro(cita.nombreServicio),
			veterinario: descifrarSeguro(cita.veterinario),
		}))

		return res.json(citasCalendario)
	} catch (error) {
		console.error('Error al obtener calendario de citas:', error)
		return res.status(500).json({
			message: 'Error al obtener el calendario',
			error: error.message,
		})
	}
}

// Reprogramar cita (cambiar fecha, hora o veterinario)
citaCtl.reprogramarCita = async (req, res) => {
	try {
		const { idCita } = req.params
		const { fecha, hora, userIdUser, motivoReprogramacion } = req.body

		if (!fecha && !hora && !userIdUser) {
			return res.status(400).json({
				message:
					'Debe proporcionar al menos una fecha, hora o veterinario para reprogramar',
			})
		}

		// Obtener cita actual
		const [citaActual] = await sql
			.promise()
			.query('SELECT * FROM citas WHERE idCita = ?', [idCita])

		if (citaActual.length === 0) {
			return res.status(404).json({ message: 'Cita no encontrada' })
		}

		// Preparar datos de actualización
		const datosActualizacion = {
			updateCita: new Date().toLocaleString(),
		}

		if (fecha) datosActualizacion.fecha = fecha
		if (hora) datosActualizacion.hora = decodificarCampo(hora)
		if (userIdUser) datosActualizacion.userIdUser = userIdUser

		// Actualizar en SQL
		await orm.cita.update(datosActualizacion, {
			where: { idCita },
		})

		// Actualizar notas en MongoDB
		if (motivoReprogramacion) {
			await mongo.citaModel.updateOne(
				{ idCitaSql: idCita },
				{
					$set: {
						notasAdicionales: `Reprogramada: ${decodificarCampo(
							motivoReprogramacion
						)}. ${citaActual[0].notasAdicionales || ''}`,
					},
				}
			)
		}

		return res.json({
			message: 'Cita reprogramada exitosamente',
			citaReprogramada: {
				idCita,
				nuevaFecha: fecha || citaActual[0].fecha,
				nuevaHora: hora || citaActual[0].hora,
			},
		})
	} catch (error) {
		console.error('Error al reprogramar cita:', error)
		return res.status(500).json({
			message: 'Error al reprogramar la cita',
			error: error.message,
		})
	}
}

// Cambiar estado de cita
citaCtl.cambiarEstadoCita = async (req, res) => {
	try {
		const { idCita } = req.params
		const { estado, notas, asistio } = req.body

		const estadosPermitidos = [
			'programada',
			'confirmada',
			'cancelada',
			'completada',
		]

		if (!estadosPermitidos.includes(estado)) {
			return res.status(400).json({
				message:
					'Estado no válido. Debe ser: programada, confirmada, cancelada o completada',
			})
		}

		// Actualizar en SQL
		await orm.cita.update(
			{
				estadoCita: estado,
				updateCita: new Date().toLocaleString(),
			},
			{
				where: { idCita },
			}
		)

		// Actualizar en MongoDB
		const actualizacionMongo = {
			estado: estado,
		}

		if (notas) {
			actualizacionMongo.notasAdicionales = decodificarCampo(notas)
		}

		if (typeof asistio === 'boolean') {
			actualizacionMongo.asistio = asistio
		}

		if (estado === 'completada') {
			actualizacionMongo.fechaReal = new Date()
		}

		await mongo.citaModel.updateOne(
			{ idCitaSql: idCita },
			{ $set: actualizacionMongo }
		)

		return res.json({
			message: `Estado de la cita cambiado a ${estado} exitosamente`,
		})
	} catch (error) {
		console.error('Error al cambiar estado de cita:', error)
		return res.status(500).json({
			message: 'Error al cambiar el estado',
			error: error.message,
		})
	}
}

// Verificar disponibilidad de horario
citaCtl.verificarDisponibilidad = async (req, res) => {
	try {
		const { fecha, hora, idServicio, idVeterinario } = req.query

		if (!fecha || !hora) {
			return res.status(400).json({
				message: 'Fecha y hora son requeridos',
			})
		}

		let query = `
            SELECT COUNT(*) as citasExistentes 
            FROM citas 
            WHERE fecha = ? 
            AND hora = ? 
            AND estadoCita IN ('programada', 'confirmada')
        `

		const params = [fecha, hora]

		const [resultado] = await sql.promise().query(query, params)

		const disponible = resultado[0].citasExistentes === 0

		return res.json({
			disponible,
			mensaje: disponible
				? 'Horario disponible'
				: 'Horario no disponible, ya existe una cita programada',
		})
	} catch (error) {
		console.error('Error al verificar disponibilidad:', error)
		return res.status(500).json({
			message: 'Error al verificar disponibilidad',
			error: error.message,
		})
	}
}

// Obtener estadísticas de citas
citaCtl.obtenerEstadisticas = async (req, res) => {
	try {
		const { fechaInicio, fechaFin } = req.query

		let filtroFecha = ''
		const params = []

		if (fechaInicio && fechaFin) {
			filtroFecha = 'WHERE fecha BETWEEN ? AND ?'
			params.push(fechaInicio, fechaFin)
		}

		const [estadisticas] = await sql.promise().query(
			`
            SELECT 
                COUNT(*) as totalCitas,
                SUM(CASE WHEN estadoCita = 'programada' THEN 1 ELSE 0 END) as citasProgramadas,
                SUM(CASE WHEN estadoCita = 'confirmada' THEN 1 ELSE 0 END) as citasConfirmadas,
                SUM(CASE WHEN estadoCita = 'completada' THEN 1 ELSE 0 END) as citasCompletadas,
                SUM(CASE WHEN estadoCita = 'cancelada' THEN 1 ELSE 0 END) as citasCanceladas
            FROM citas
            ${filtroFecha}
        `,
			params
		)

        return res.json(estadisticas[0]);

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};
