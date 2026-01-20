const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const { 
    mostrarMascotas, 
    crearMascota, 
    actualizarMascota,
    obtenerMascotasPorPropietario,
    obtenerMascotaPorId,
    eliminarMascota
} = require('../controller/mascota.controller');

// Middleware de autenticación (opcional)
// const isLoggedIn = require('../lib/auth');

// Validaciones para crear mascota
const validacionCrearMascota = [
    body('nombreMascota')
        .notEmpty()
        .withMessage('El nombre de la mascota es obligatorio')
        .isLength({ min: 1, max: 50 })
        .withMessage('El nombre debe tener entre 1 y 50 caracteres'),
    
    body('especie')
        .notEmpty()
        .withMessage('La especie es obligatoria')
        .isIn(['perro', 'gato', 'ave', 'pez', 'roedor', 'reptil', 'otro'])
        .withMessage('Especie debe ser: perro, gato, ave, pez, roedor, reptil u otro'),
    
    body('raza')
        .optional()
        .isLength({ max: 50 })
        .withMessage('La raza no puede exceder 50 caracteres'),
    
    body('edad')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('La edad debe ser un número entre 0 y 50'),
    
    body('sexo')
        .optional()
        .isIn(['macho', 'hembra', 'indefinido'])
        .withMessage('Sexo debe ser: macho, hembra o indefinido'),
    
    body('idPropietario')
        .isInt({ min: 1 })
        .withMessage('ID del propietario debe ser un número entero positivo'),
    
    // Validaciones para campos de MongoDB
    body('pesoKg')
        .optional()
        .isFloat({ min: 0.1, max: 500 })
        .withMessage('El peso debe ser un número entre 0.1 y 500 kg'),
    
    body('color')
        .optional()
        .isLength({ max: 30 })
        .withMessage('El color no puede exceder 30 caracteres'),
    
    body('esterilizado')
        .optional()
        .isBoolean()
        .withMessage('Esterilizado debe ser verdadero o falso'),
    
    body('vacunas')
        .optional()
        .isArray()
        .withMessage('Las vacunas deben ser un array'),
    
    body('alergias')
        .optional()
        .isArray()
        .withMessage('Las alergias deben ser un array'),
    
    body('chipIdentificacion')
        .optional()
        .isLength({ max: 20 })
        .withMessage('El chip de identificación no puede exceder 20 caracteres'),
    
    body('observaciones')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las observaciones no pueden exceder 500 caracteres')
];

// Validaciones para actualizar mascota
const validacionActualizarMascota = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero positivo'),
    
    ...validacionCrearMascota.filter(validation => 
        !validation.builder.fields.includes('idPropietario')
    ) // Excluir idPropietario en actualización
];

// ================ RUTAS DE MASCOTAS ================

// Obtener todas las mascotas
router.get('/lista', mostrarMascotas);

// Obtener mascotas por propietario
router.get('/propietario/:idPropietario', obtenerMascotasPorPropietario);

// Obtener una mascota por ID
router.get('/:id', obtenerMascotaPorId);

// Crear nueva mascota
router.post('/crear', validacionCrearMascota, crearMascota);

// Actualizar mascota existente
router.put('/actualizar/:id', validacionActualizarMascota, actualizarMascota);

// Eliminar mascota
router.delete('/eliminar/:id', eliminarMascota);

module.exports = router;