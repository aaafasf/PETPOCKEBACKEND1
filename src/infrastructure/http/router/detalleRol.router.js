const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const { 
    mostrarRelaciones,
    obtenerRolesUsuario,
    obtenerUsuariosRol,
    asignarMultiplesRoles,
    asignarRolMultiplesUsuarios,
    removerMultiplesRoles,
    removerRolMultiplesUsuarios,
    obtenerEstadisticas,
    validarRelacion
} = require('../controller/detalleRol.controller');

// Middleware de autenticación (opcional, descomenta si lo necesitas)
// const isLoggedIn = require('../lib/auth');

// Validaciones para asignar múltiples roles
const validacionMultiplesRoles = [
    body('usuarioId')
        .isInt({ min: 1 })
        .withMessage('ID de usuario debe ser un número entero positivo'),
    
    body('roles')
        .isArray({ min: 1 })
        .withMessage('Roles debe ser un array con al menos un elemento'),
    
    body('roles.*')
        .isInt({ min: 1 })
        .withMessage('Cada rol debe ser un número entero positivo')
];

// Validaciones para asignar rol a múltiples usuarios
const validacionRolMultiplesUsuarios = [
    body('rolId')
        .isInt({ min: 1 })
        .withMessage('ID de rol debe ser un número entero positivo'),
    
    body('usuarios')
        .isArray({ min: 1 })
        .withMessage('Usuarios debe ser un array con al menos un elemento'),
    
    body('usuarios.*')
        .isInt({ min: 1 })
        .withMessage('Cada usuario debe ser un número entero positivo')
];

// Validaciones para parámetros de ruta
const validacionParametroId = [
    param('usuarioId')
        .isInt({ min: 1 })
        .withMessage('ID de usuario debe ser un número entero positivo')
];

const validacionParametrosRelacion = [
    param('usuarioId')
        .isInt({ min: 1 })
        .withMessage('ID de usuario debe ser un número entero positivo'),
    
    param('rolId')
        .isInt({ min: 1 })
        .withMessage('ID de rol debe ser un número entero positivo')
];

// ================ RUTAS DE DETALLE ROL ================

// Obtener todas las relaciones usuario-rol
router.get('/lista', mostrarRelaciones);

// Obtener roles de un usuario específico
router.get('/usuario/:usuarioId/roles', validacionParametroId, obtenerRolesUsuario);

// Obtener usuarios con un rol específico
router.get('/rol/:rolId/usuarios', obtenerUsuariosRol);

// Obtener estadísticas de relaciones
router.get('/estadisticas', obtenerEstadisticas);

// Validar si existe una relación específica usuario-rol
router.get('/validar/:usuarioId/:rolId', validacionParametrosRelacion, validarRelacion);

// Asignar múltiples roles a un usuario
router.post('/asignar-multiples-roles', validacionMultiplesRoles, asignarMultiplesRoles);

// Asignar un rol a múltiples usuarios
router.post('/asignar-rol-multiples-usuarios', validacionRolMultiplesUsuarios, asignarRolMultiplesUsuarios);

// Remover múltiples roles de un usuario
router.delete('/remover-multiples-roles', validacionMultiplesRoles, removerMultiplesRoles);

router.get('/veterinarios', (req, res) => {
    // Suponiendo que el idRol de "Veterinario" es 1
    req.params.rolId = 1;
    return obtenerUsuariosRol(req, res);
});

// Remover un rol de múltiples usuarios
router.delete('/remover-rol-multiples-usuarios', validacionRolMultiplesUsuarios, removerRolMultiplesUsuarios);

module.exports = router;