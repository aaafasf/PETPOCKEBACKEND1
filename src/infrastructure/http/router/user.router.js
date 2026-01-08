const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { 
    mostrarUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    obtenerUsuario,
    buscarUsuarios,
    asignarRol,
    removerRol,
    cambiarEstado,
    obtenerEstadisticas
} = require('../controller/usuario.controller');
const usuarioCtrl = require('../controller/usuario.controller');

// Middleware de autenticación (opcional, descomenta si lo necesitas)
// const isLoggedIn = require('../lib/auth');

// Validaciones para crear usuario
const validacionCrearUsuario = [
    body('nameUsers')
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('emailUser')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    
    body('userName')
        .notEmpty()
        .withMessage('El nombre de usuario es obligatorio')
        .isLength({ min: 3, max: 50 })
        .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    
    body('passwordUser')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
    body('phoneUser')
        .optional()
        .isMobilePhone()
        .withMessage('Debe ser un número de teléfono válido'),
    
    body('roles')
        .optional()
        .isArray()
        .withMessage('Los roles deben ser un array')
];

// Validaciones para actualizar usuario
const validacionActualizarUsuario = [
    body('nameUsers')
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('emailUser')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),
    
    body('userName')
        .notEmpty()
        .withMessage('El nombre de usuario es obligatorio')
        .isLength({ min: 3, max: 50 })
        .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    
    body('passwordUser')
        .optional()
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    
    body('phoneUser')
        .optional()
        .isMobilePhone()
        .withMessage('Debe ser un número de teléfono válido'),
    
    body('roles')
        .optional()
        .isArray()
        .withMessage('Los roles deben ser un array')
];

// Validaciones para asignar/remover rol
const validacionRol = [
    body('usuarioId')
        .isInt({ min: 1 })
        .withMessage('ID de usuario debe ser un número entero positivo'),
    
    body('rolId')
        .isInt({ min: 1 })
        .withMessage('ID de rol debe ser un número entero positivo')
];

// Validación para cambiar estado
const validacionEstado = [
    body('estado')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Estado debe ser: active, inactive o suspended')
];

// ================ RUTAS DE USUARIOS ================

// Obtener todos los usuarios
router.get('/lista', mostrarUsuarios);

// Obtener un usuario específico por ID
router.get('/obtener/:id', obtenerUsuario);

// Buscar usuarios por término
router.get('/buscar', buscarUsuarios);

// Obtener estadísticas de usuarios
router.get('/estadisticas', obtenerEstadisticas);

// Crear nuevo usuario
router.post('/crear', validacionCrearUsuario, crearUsuario);

// Asignar rol a usuario
router.post('/asignar-rol', validacionRol, asignarRol);

// Remover rol de usuario
//router.post('/removerRol', usuarioCtrl.removerRol);

// Actualizar usuario existente
router.put('/actualizar/:id', validacionActualizarUsuario, actualizarUsuario);

// Cambiar estado de usuario
router.put('/cambiar-estado/:id', validacionEstado, cambiarEstado);

// Eliminar (desactivar) usuario
router.delete('/eliminar/:id', usuarioCtrl.eliminarUsuario);

module.exports = router;