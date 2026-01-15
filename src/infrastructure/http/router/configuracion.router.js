const express = require('express');
const router = express.Router();
const configuracionCtl = require('../controller/configuracion.controller');

// Obtener objeto armado (para formulario)
router.get('/', configuracionCtl.obtenerConfiguracion);

// Listar todas las filas (clave/valor)
router.get('/listar', configuracionCtl.listarConfiguraciones);

// Guardar/actualizar todas las claves de golpe (formulario)
router.post('/', configuracionCtl.guardarConfiguracion);

// Actualizar una clave puntual
router.put('/:clave', configuracionCtl.actualizarConfiguracion);

// Eliminar una clave puntual
router.delete('/:clave', configuracionCtl.eliminarConfiguracion);

module.exports = router;
