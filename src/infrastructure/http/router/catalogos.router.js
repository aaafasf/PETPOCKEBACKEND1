const express = require('express');
const router = express.Router();
const catalogosController = require('../controller/catalogos.controller');

// GET - listar
router.get('/', catalogosController.listar);

// POST - crear
router.post('/', catalogosController.crear);

// PUT - actualizar
router.put('/:id', catalogosController.actualizar);

// DELETE - eliminar (lógico)
router.delete('/:id', catalogosController.eliminar);

module.exports = router;
