const express = require('express');
const router = express.Router();
const razaCtrl = require('../controller/raza.controller');

router.get('/', razaCtrl.listar);
router.post('/', razaCtrl.crear);
router.put('/:id', razaCtrl.editar);
router.patch('/:id/desactivar', razaCtrl.desactivar);

module.exports = router;
