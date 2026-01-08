const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

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
    obtenerEstadisticas,
    obtenerVeterinarios
} = require('../controller/cita.controller');

// =======================
// VALIDACIONES
// =======================

const validacionCrearCita = [
    body('idCliente').isInt({ min: 1 }),
    body('idMascota').isInt({ min: 1 }),
    body('idServicio').isInt({ min: 1 }),
    body('fecha').isISO8601(),
    body('hora').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
];

const validacionActualizarCita = [
    param('idCita').isInt({ min: 1 }),
    ...validacionCrearCita
];

const validacionEliminarCita = [
    param('idCita').isInt({ min: 1 })
];

// =======================
// RUTAS
// =======================

// Veterinarios
router.get('/veterinarios', obtenerVeterinarios);

// Disponibilidad
router.get('/verificar-disponibilidad', verificarDisponibilidad);

// Citas
router.get('/lista', mostrarCitas);
router.get('/detalle/:idCita', obtenerCitaPorId);
router.get('/cliente/:idCliente', obtenerCitasPorCliente);
router.get('/calendario', obtenerCalendarioCitas);
router.get('/estadisticas', obtenerEstadisticas);

router.post('/crear', validacionCrearCita, crearCita);
router.put('/actualizar/:idCita', validacionActualizarCita, actualizarCita);
router.put('/reprogramar/:idCita', reprogramarCita);
router.put('/cambiar-estado/:idCita', cambiarEstadoCita);
router.delete('/cancelar/:idCita', validacionEliminarCita, eliminarCita);

module.exports = router;
