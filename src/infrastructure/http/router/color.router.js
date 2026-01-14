const express = require('express');
const router = express.Router();
const colorCtrl = require('../controller/color.controller');

router.get('/', colorCtrl.listar);
router.post('/', colorCtrl.crear);
router.put('/:id', colorCtrl.editar);
router.patch('/:id/desactivar', colorCtrl.desactivar);

module.exports = router;
