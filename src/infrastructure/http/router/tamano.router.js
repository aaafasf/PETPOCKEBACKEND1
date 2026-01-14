const express = require('express');
const router = express.Router();
const tamanoCtrl = require('../controller/tamano.controller');

router.get('/', tamanoCtrl.listar);
router.post('/', tamanoCtrl.crear);
router.put('/:id', tamanoCtrl.editar);
router.patch('/:id/desactivar', tamanoCtrl.desactivar);

module.exports = router;
