const express = require('express');
const router = express.Router();
const configuracionCtl = require('../controller/configuracion.controller');

router.get('/', configuracionCtl.obtenerConfiguracion);
router.get('/listar', configuracionCtl.listarConfiguraciones);
router.post('/', configuracionCtl.guardarConfiguracion);

module.exports = router;
