const express = require('express');
const router = express.Router();
const estadoMascotaCtrl = require('../controller/estadoMascota.controller');

router.get('/', estadoMascotaCtrl.listar);
router.post('/', estadoMascotaCtrl.crear);
router.put('/:id', estadoMascotaCtrl.editar);
router.patch('/:id/desactivar', estadoMascotaCtrl.desactivar);

module.exports = router;
