const express = require("express");
const router = express.Router();

const {mostrarMensaje} = require('../controller/index.controller')

// Catálogos maestros
router.use('/especies', require('./especie.router'));
router.use('/razas', require('./raza.router'));
router.use('/tamanos', require('./tamano.router'));
router.use('/sexos', require('./sexo.router'));
router.use('/colores', require('./color.router'));
router.use('/estados-mascota', require('./estadoMascota.router'));
router.use('/mis-mascotas', require('./misMascotas.router'));

router.get('/', mostrarMensaje)

module.exports = router