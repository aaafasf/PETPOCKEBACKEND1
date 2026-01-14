const express = require('express');
const router = express.Router();
const sexoCtrl = require('../controller/sexo.controller');

router.get('/', sexoCtrl.listar);
router.post('/', sexoCtrl.crear);
router.put('/:id', sexoCtrl.editar);
router.patch('/:id/desactivar', sexoCtrl.desactivar);

module.exports = router;
