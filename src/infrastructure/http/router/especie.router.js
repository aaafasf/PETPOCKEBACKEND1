const express = require('express');
const router = express.Router();
const especieCtrl = require('../controller/especie.controller');

router.get('/', especieCtrl.listar);
router.post('/', especieCtrl.crear);
router.put('/:id', especieCtrl.editar);
router.patch('/:id/desactivar', especieCtrl.desactivar);

module.exports = router;
