const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const {
    mostrarCitas,
    crearCita,
    actualizarCita,
    eliminarCita,
    obtenerCitaPorId,
    obtenerCitasPorCliente,
    obtenerCalendarioCitas,
    reprogramarCita,
    cambiarEstadoCita,
    verificarDisponibilidad,
    obtenerEstadisticas
} = require('../controller/cita.controller');

// Middleware de autenticación (opcional)
// const isLoggedIn = require('../lib/auth');

// Validaciones para crear cita
const validacionCrearCita = [
    body('idCliente')
        .isInt({ min: 1 })
        .withMessage('El ID del cliente debe ser un número entero positivo'),

    body('idMascota')
        .isInt({ min: 1 })
        .withMessage('El ID de la mascota debe ser un número entero positivo'),

    body('idServicio')
        .isInt({ min: 1 })
        .withMessage('El ID del servicio debe ser un número entero positivo'),

    body('fecha')
        .isISO8601()
        .withMessage('La fecha debe ser válida (formato ISO 8601)')
        .custom((value) => {
            const fecha = new Date(value);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fecha < hoy) {
                throw new Error('La fecha no puede ser anterior a hoy');
            }
            return true;
        }),

    body('hora')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('La hora debe tener formato HH:MM válido'),

    body('userIdUser')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo'),

    // Validaciones para campos de MongoDB
    body('motivo')
        .optional()
        .isLength({ max: 255 })
        .withMessage('El motivo no puede exceder 255 caracteres'),

    body('sintomas')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Los síntomas no pueden exceder 500 caracteres'),

    body('diagnosticoPrevio')
        .optional()
        .isLength({ max: 300 })
        .withMessage('El diagnóstico previo no puede exceder 300 caracteres'),

    body('tratamientosAnteriores')
        .optional()
        .isArray()
        .withMessage('Los tratamientos anteriores deben ser un array'),

    body('notasAdicionales')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las notas adicionales no pueden exceder 500 caracteres')
];

// Validaciones para actualizar cita
const validacionActualizarCita = [
    param('idCita')
        .isInt({ min: 1 })
        .withMessage('El ID de la cita debe ser un número entero positivo'),

    ...validacionCrearCita
];

// Validación para eliminar cita
const validacionEliminarCita = [
    param('idCita')
        .isInt({ min: 1 })
        .withMessage('El ID de la cita debe ser un número entero positivo')
];

// Validación para cambiar estado de cita
const validacionCambiarEstado = [
    param('idCita')
        .isInt({ min: 1 })
        .withMessage('El ID de la cita debe ser un número entero positivo'),

    body('estado')
        .isIn(['programada', 'confirmada', 'cancelada', 'completada'])
        .withMessage('Estado debe ser: programada, confirmada, cancelada o completada'),

    body('notas')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las notas no pueden exceder 500 caracteres'),

    body('asistio')
        .optional()
        .isBoolean()
        .withMessage('El campo asistio debe ser verdadero o falso')
];

// Validación para reprogramar cita
const validacionReprogramarCita = [
    param('idCita')
        .isInt({ min: 1 })
        .withMessage('El ID de la cita debe ser un número entero positivo'),

    body('fecha')
        .optional()
        .isISO8601()
        .withMessage('La fecha debe ser válida (formato ISO 8601)'),

    body('hora')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('La hora debe tener formato HH:MM válido'),

    body('userIdUser')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo'),

    body('motivoReprogramacion')
        .optional()
        .isLength({ max: 300 })
        .withMessage('El motivo no puede exceder 300 caracteres')
];

// ================ RUTAS DE CITAS ================

/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Gestión de citas veterinarias
 */

/**
 * @swagger
 * /cita/lista:
 *   get:
 *     summary: Obtener todas las citas
 *     tags: [Citas]
 *     description: Obtiene un listado completo de todas las citas con información de cliente, mascota y servicio
 *     responses:
 *       200:
 *         description: Lista de citas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cita'
 *       500:
 *         description: Error del servidor
 */
router.get('/lista', mostrarCitas);

/**
 * @swagger
 * /cita/detalle/{idCita}:
 *   get:
 *     summary: Obtener una cita específica
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: idCita
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita encontrada
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error del servidor
 */
router.get('/detalle/:idCita',
    param('idCita').isInt({ min: 1 }).withMessage('ID de cita inválido'),
    obtenerCitaPorId
);

/**
 * @swagger
 * /cita/cliente/{idCliente}:
 *   get:
 *     summary: Obtener citas de un cliente (Mis Citas)
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: idCliente
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [programada, confirmada, cancelada, completada]
 *         description: Filtrar por estado de la cita
 *     responses:
 *       200:
 *         description: Lista de citas del cliente
 *       500:
 *         description: Error del servidor
 */
router.get('/cliente/:idCliente',
    param('idCliente').isInt({ min: 1 }).withMessage('ID de cliente inválido'),
    obtenerCitasPorCliente
);

/**
 * @swagger
 * /cita/calendario:
 *   get:
 *     summary: Calendario de citas para veterinario
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Calendario de citas obtenido
 *       500:
 *         description: Error del servidor
 */
router.get('/calendario', obtenerCalendarioCitas);

/**
 * @swagger
 * /cita/verificar-disponibilidad:
 *   get:
 *     summary: Verificar disponibilidad de horario
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha a verificar (YYYY-MM-DD)
 *       - in: query
 *         name: hora
 *         required: true
 *         schema:
 *           type: string
 *         description: Hora a verificar (HH:MM)
 *     responses:
 *       200:
 *         description: Disponibilidad verificada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 disponible:
 *                   type: boolean
 *                 mensaje:
 *                   type: string
 *       400:
 *         description: Parámetros inválidos
 */
//router.get('/verificar-disponibilidad', verificarDisponibilidad);

/**
 * @swagger
 * /cita/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de citas
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para el reporte
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para el reporte
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas
 *       500:
 *         description: Error del servidor
 */
router.get('/estadisticas', obtenerEstadisticas);

/**
 * @swagger
 * /cita/crear:
 *   post:
 *     summary: Agendar nueva cita
 *     tags: [Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idCliente
 *               - idMascota
 *               - idServicio
 *               - fecha
 *               - hora
 *             properties:
 *               idCliente:
 *                 type: integer
 *                 description: ID del cliente
 *                 example: 1
 *               idMascota:
 *                 type: integer
 *                 description: ID de la mascota
 *                 example: 5
 *               idServicio:
 *                 type: integer
 *                 description: ID del servicio
 *                 example: 3
 *               fecha:
 *                 type: string
 *                 format: date
 *                 description: Fecha de la cita
 *                 example: "2025-12-30"
 *               hora:
 *                 type: string
 *                 description: Hora de la cita
 *                 example: "14:00"
 *               motivo:
 *                 type: string
 *                 description: Motivo de la consulta
 *                 example: "Vacunación anual"
 *               sintomas:
 *                 type: string
 *                 description: Síntomas de la mascota
 *                 example: "Ninguno, consulta preventiva"
 *               diagnosticoPrevio:
 *                 type: string
 *                 description: Diagnóstico previo
 *               tratamientosAnteriores:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Historial de tratamientos
 *               notasAdicionales:
 *                 type: string
 *                 description: Notas adicionales
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error del servidor
 */
router.post('/crear', validacionCrearCita, crearCita);

/**
 * @swagger
 * /cita/actualizar/{idCita}:
 *   put:
 *     summary: Actualizar información completa de una cita
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: idCita
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cita'
 *     responses:
 *       200:
 *         description: Cita actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error del servidor
 */
router.put('/actualizar/:idCita', validacionActualizarCita, actualizarCita);

/**
 * @swagger
 * /cita/reprogramar/{idCita}:
 *   put:
 *     summary: Reprogramar cita (cambiar fecha/hora/veterinario)
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: idCita
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita a reprogramar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               hora:
 *                 type: string
 *                 example: "16:00"
 *               motivoReprogramacion:
 *                 type: string
 *                 example: "Cliente solicitó cambio por viaje"
 *     responses:
 *       200:
 *         description: Cita reprogramada exitosamente
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error del servidor
 */
router.put('/reprogramar/:idCita', validacionReprogramarCita, reprogramarCita);

/**
 * @swagger
 * /cita/cambiar-estado/{idCita}:
 *   put:
 *     summary: Cambiar estado de la cita
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: idCita
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [programada, confirmada, cancelada, completada]
 *                 example: "confirmada"
 *               notas:
 *                 type: string
 *                 example: "Cliente confirmó asistencia"
 *               asistio:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado cambiado exitosamente
 *       400:
 *         description: Estado inválido
 *       500:
 *         description: Error del servidor
 */
router.put('/cambiar-estado/:idCita', validacionCambiarEstado, cambiarEstadoCita);

/**
 * @swagger
 * /cita/cancelar/{idCita}:
 *   delete:
 *     summary: Cancelar una cita
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: idCita
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cita a cancelar
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
 *       404:
 *         description: Cita no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/cancelar/:idCita', validacionEliminarCita, eliminarCita);

module.exports = router;