const orm = require('../../Database/dataBase.orm.js');
const sql = require('../../Database/dataBase.sql.js');
const mongo = require('../../Database/dataBaseMongose');
const { cifrarDatos, descifrarDatos } = require('../../../application/controller/encrypDates.js');

const citaCtl = {};

/* =========================
   UTILIDADES
========================= */

const descifrarSeguro = (dato) => {
    try {
        return dato ? descifrarDatos(dato) : '';
    } catch (error) {
        console.error('Error al descifrar:', error);
        return '';
    }
};

const decodificarCampo = (campo) => {
    try {
        return campo ? decodeURIComponent(campo) : '';
    } catch (error) {
        return campo || '';
    }
};

/* =========================
   MOSTRAR TODAS LAS CITAS
========================= */
citaCtl.mostrarCitas = async (req, res) => {
    try {
        const [citas] = await sql.promise().query(`
            SELECT c.*,
                   cl.nombreCliente, cl.cedulaCliente,
                   m.nombreMascota, m.especie,
                   s.nombreServicio, s.precioServicio,
                   u.nameUsers AS veterinario
            FROM citas c
            JOIN clientes cl ON c.idCliente = cl.idClientes
            JOIN mascotas m ON c.idMascota = m.idMascota
            JOIN servicios s ON c.idServicio = s.idServicio
            LEFT JOIN users u ON c.userIdUser = u.idUser
            ORDER BY c.fecha DESC, c.hora DESC
        `);

        const resultado = await Promise.all(
            citas.map(async (cita) => {
                const mongoData = await mongo.citaModel.findOne({
                    idCitaSql: cita.idCita.toString()
                });

                return {
                    ...cita,
                    cliente: {
                        nombre: descifrarSeguro(cita.nombreCliente),
                        cedula: descifrarSeguro(cita.cedulaCliente)
                    },
                    mascota: {
                        nombre: descifrarSeguro(cita.nombreMascota),
                        especie: descifrarSeguro(cita.especie)
                    },
                    servicio: {
                        nombre: descifrarSeguro(cita.nombreServicio),
                        precio: cita.precioServicio
                    },
                    veterinario: descifrarSeguro(cita.veterinario),
                    detallesMongo: mongoData
                };
            })
        );

        return res.json(resultado);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al listar citas' });
    }
};

/* =========================
   CREAR CITA
========================= */
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
            notasAdicionales
        } = req.body;

        if (!idCliente || !idMascota || !idServicio || !fecha || !hora) {
            return res.status(400).json({ message: 'Campos obligatorios faltantes' });
        }

        const cita = await orm.cita.create({
            idCliente,
            idMascota,
            idServicio,
            fecha,
            hora: decodificarCampo(hora),
            estadoCita: 'programada',
            userIdUser: userIdUser || null,
            createCita: new Date().toLocaleString()
        });

        await mongo.citaModel.create({
            idCitaSql: cita.idCita.toString(),
            idCliente: idCliente.toString(),
            idMascota: idMascota.toString(),
            motivo: decodificarCampo(motivo) || '',
            sintomas: decodificarCampo(sintomas) || '',
            diagnosticoPrevio: decodificarCampo(diagnosticoPrevio) || '',
            tratamientosAnteriores: tratamientosAnteriores || [],
            notasAdicionales: decodificarCampo(notasAdicionales) || '',
            estado: 'pendiente',
            asistio: false
        });

        return res.status(201).json({
            message: 'Cita creada correctamente',
            idCita: cita.idCita
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al crear cita' });
    }
};

/* =========================
   OBTENER CITA POR ID
========================= */
citaCtl.obtenerCitaPorId = async (req, res) => {
    try {
        const { idCita } = req.params;

        const [resultado] = await sql.promise().query(
            `SELECT * FROM citas WHERE idCita = ?`,
            [idCita]
        );

        if (!resultado.length) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        return res.json(resultado[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener cita' });
    }
};

/* =========================
   CITAS POR CLIENTE
========================= */
citaCtl.obtenerCitasPorCliente = async (req, res) => {
    try {
        const { idCliente } = req.params;

        const [citas] = await sql.promise().query(
            `SELECT * FROM citas WHERE idCliente = ? ORDER BY fecha DESC`,
            [idCliente]
        );

        return res.json(citas);
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener citas del cliente' });
    }
};

/* =========================
   ACTUALIZAR CITA
========================= */
citaCtl.actualizarCita = async (req, res) => {
    try {
        const { idCita } = req.params;

        await orm.cita.update(req.body, {
            where: { idCita }
        });

        return res.json({ message: 'Cita actualizada' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al actualizar cita' });
    }
};

/* =========================
   ELIMINAR (CANCELAR) CITA
========================= */
citaCtl.eliminarCita = async (req, res) => {
    try {
        const { idCita } = req.params;

        await orm.cita.update(
            { estadoCita: 'cancelada' },
            { where: { idCita } }
        );

        return res.json({ message: 'Cita cancelada' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al cancelar cita' });
    }
};

/* =========================
   CALENDARIO
========================= */
citaCtl.obtenerCalendarioCitas = async (req, res) => {
    try {
        const [citas] = await sql.promise().query(
            `SELECT idCita, fecha, hora FROM citas`
        );

        return res.json(citas);
    } catch (error) {
        return res.status(500).json({ message: 'Error calendario' });
    }
};

/* =========================
   REPROGRAMAR
========================= */
citaCtl.reprogramarCita = async (req, res) => {
    try {
        const { idCita } = req.params;
        const { fecha, hora } = req.body;

        await orm.cita.update(
            { fecha, hora },
            { where: { idCita } }
        );

        return res.json({ message: 'Cita reprogramada' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al reprogramar' });
    }
};

/* =========================
   CAMBIAR ESTADO
========================= */
citaCtl.cambiarEstadoCita = async (req, res) => {
    try {
        const { idCita } = req.params;
        const { estado } = req.body;

        await orm.cita.update(
            { estadoCita: estado },
            { where: { idCita } }
        );

        return res.json({ message: 'Estado actualizado' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al cambiar estado' });
    }
};

/* =========================
   DISPONIBILIDAD
========================= */
citaCtl.verificarDisponibilidad = async (req, res) => {
    try {
        const { fecha, hora } = req.query;

        const [resultado] = await sql.promise().query(
            `SELECT COUNT(*) AS total FROM citas WHERE fecha = ? AND hora = ?`,
            [fecha, hora]
        );

        return res.json({ disponible: resultado[0].total === 0 });
    } catch (error) {
        return res.status(500).json({ message: 'Error disponibilidad' });
    }
};

/* =========================
   ESTADÍSTICAS
========================= */
citaCtl.obtenerEstadisticas = async (req, res) => {
    try {
        const [stats] = await sql.promise().query(`
            SELECT
                COUNT(*) total,
                SUM(estadoCita='programada') programadas,
                SUM(estadoCita='confirmada') confirmadas,
                SUM(estadoCita='completada') completadas,
                SUM(estadoCita='cancelada') canceladas
            FROM citas
        `);

        return res.json(stats[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Error estadísticas' });
    }
};

/* =========================
   VETERINARIOS (TEMP)
========================= */
citaCtl.obtenerVeterinarios = async (req, res) => {
    return res.json([]);
};

module.exports = citaCtl;
