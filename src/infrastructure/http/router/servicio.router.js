const express = require('express');
const router = express.Router();
const servicioCtl = require('../controller/servicio.controller'); // ✅ solo una vez
console.log('servicioCtl:', servicioCtl);

// ADMIN
router.get('/', servicioCtl.listarAdmin);
router.post('/', servicioCtl.crear);
router.put('/:id', servicioCtl.actualizar);
router.delete('/:id', servicioCtl.eliminar);

// PUBLICO (dashboard normal)
router.get('/lista', servicioCtl.listarPublico);

module.exports = router;
