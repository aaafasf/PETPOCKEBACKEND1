const express = require('express');
const router = express.Router();
const servicioCtl = require('../controller/servicio.controller'); 
console.log('servicioCtl:', servicioCtl);

// ADMIN
router.get('/', servicioCtl.listarAdmin);
router.post('/', servicioCtl.crear);
router.put('/:id', servicioCtl.actualizar);
router.delete('/:id', servicioCtl.eliminar);
router.patch('/:id/estado', servicioCtl.cambiarEstado);



// PUBLICO (dashboard normal)
router.get('/lista', servicioCtl.listarPublico);

module.exports = router;
