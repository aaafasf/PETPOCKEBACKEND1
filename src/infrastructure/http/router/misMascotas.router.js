const express = require('express');
const router = express.Router();
const ctrl = require('../controller/misMascotas.controller');

router.get('/', ctrl.listar);
router.put('/:id', ctrl.editar);

module.exports = router;
