const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('[NOTIFICACIONES] Errores de validación:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            error: 'Los datos enviados no son válidos',
            details: errors.array().map(err => ({
                campo: err.param || err.msg,
                mensaje: err.msg,
                valor: err.value
            })),
            errors: errors.array()
        });
    }
    next();
};

// Middleware para capturar errores no manejados
const handleAsyncErrors = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.error('[NOTIFICACIONES] Error no manejado:', error);
            console.error('[NOTIFICACIONES] Stack:', error.stack);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message,
                details: 'Ocurrió un error inesperado al procesar la solicitud',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        });
    };
};

const { 
    mostrarNotificaciones,
    crearNotificacion,
    obtenerNotificacionesPorUsuario,
    obtenerNotificacionPorId,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    crearNotificacionMasiva,
    obtenerEstadisticas,
    crearAlertaProgramada,
    limpiarHistorial
} = require('../controller/notificacion.controller');

// Validaciones para crear notificación (idUsuario es opcional, puede venir de sesión)
const validacionCrearNotificacion = [
    body('idUsuario')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo'),
    
    body('mensaje')
        .notEmpty()
        .withMessage('El mensaje es obligatorio')
        .isLength({ min: 1, max: 500 })
        .withMessage('El mensaje debe tener entre 1 y 500 caracteres'),
    
    body('titulo')
        .optional()
        .isLength({ max: 200 })
        .withMessage('El título no puede exceder 200 caracteres'),
    
    body('tipo')
        .optional()
        .isIn(['general', 'recordatorio', 'urgente', 'promocion', 'sistema', 'control', 'vacuna', 'cita', 'medicamento'])
        .withMessage('Tipo debe ser válido'),
    
    body('fechaProgramada')
        .optional()
        .isISO8601()
        .withMessage('La fecha programada debe ser válida (formato ISO 8601)'),
    
    body('tipoRecordatorio')
        .optional()
        .isIn(['vacuna', 'control', 'cita', 'general', 'medicamento'])
        .withMessage('Tipo de recordatorio debe ser: vacuna, control, cita, general o medicamento')
];

// Validaciones para notificación masiva
const validacionNotificacionMasiva = [
    body('mensaje')
        .notEmpty()
        .withMessage('El mensaje es obligatorio')
        .isLength({ min: 1, max: 500 })
        .withMessage('El mensaje debe tener entre 1 y 500 caracteres'),
    
    body('usuarios')
        .isArray({ min: 1 })
        .withMessage('Usuarios debe ser un array con al menos un elemento'),
    
    body('usuarios.*')
        .isInt({ min: 1 })
        .withMessage('Cada usuario debe ser un número entero positivo'),
    
    body('tipo')
        .optional()
        .isIn(['general', 'recordatorio', 'urgente', 'promocion', 'sistema'])
        .withMessage('Tipo debe ser: general, recordatorio, urgente, promocion o sistema')
];

// Validaciones para crear alerta programada (fechaProgramada es opcional)
const validacionAlertaProgramada = [
    body('idUsuario')
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo'),
    
    body('mensaje')
        .notEmpty()
        .withMessage('El mensaje es obligatorio')
        .isLength({ min: 1, max: 500 })
        .withMessage('El mensaje debe tener entre 1 y 500 caracteres'),
    
    body('fechaProgramada')
        .optional()
        .isISO8601()
        .withMessage('La fecha programada debe ser válida (formato ISO 8601)')
        .custom((value) => {
            if (value) {
                const fecha = new Date(value);
                const ahora = new Date();
                if (fecha <= ahora) {
                    throw new Error('La fecha programada debe ser futura');
                }
            }
            return true;
        }),
    
    body('tipo')
        .optional()
        .isIn(['general', 'recordatorio', 'urgente', 'promocion', 'sistema'])
        .withMessage('Tipo debe ser: general, recordatorio, urgente, promocion o sistema'),
    
    body('tipoRecordatorio')
        .optional()
        .isIn(['vacuna', 'control', 'cita', 'general', 'medicamento'])
        .withMessage('Tipo de recordatorio debe ser: vacuna, control, cita, general o medicamento')
];

// Validaciones para parámetros
const validacionParametroId = [
    param('idNotificacion')
        .isInt({ min: 1 })
        .withMessage('El ID de la notificación debe ser un número entero positivo')
];

const validacionParametroUsuario = [
    param('idUsuario')
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo')
];

// ================ RUTAS DE NOTIFICACIONES ================
// IMPORTANTE: Las rutas más específicas deben ir ANTES que las rutas con parámetros dinámicos

// Endpoint raíz - Información de la API y prueba de conexión
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de Notificaciones funcionando correctamente',
        timestamp: new Date().toISOString(),
        basePath: '/notificaciones o /notificacion',
        endpoints: {
            'lista': 'GET /notificacion/lista',
            'lista-completa': 'GET /notificacion/lista-completa',
            'estadisticas': 'GET /notificacion/estadisticas',
            'por-usuario': 'GET /notificacion/usuario/:idUsuario',
            'no-leidas': 'GET /notificacion/usuario/:idUsuario/no-leidas',
            'por-id': 'GET /notificacion/:idNotificacion',
            'crear': 'POST /notificacion',
            'crear-alerta': 'POST /notificacion/alerta-programada',
            'marcar-leida': 'PUT /notificacion/:idNotificacion/marcar-leida',
            'actualizar-estado': 'PATCH /notificacion/:idNotificacion/estado',
            'actualizar': 'PUT /notificacion/:idNotificacion',
            'eliminar': 'DELETE /notificacion/:idNotificacion',
            'limpiar-historial': 'DELETE /notificacion/limpiar-historial/:idUsuario'
        }
    });
});

// Obtener todas las notificaciones
router.get('/lista', handleAsyncErrors(mostrarNotificaciones));

// Obtener todas las notificaciones con información completa
router.get('/lista-completa', handleAsyncErrors(mostrarNotificaciones));

// Obtener estadísticas de notificaciones
router.get('/estadisticas', handleAsyncErrors(obtenerEstadisticas));

// Obtener notificaciones por usuario (rutas específicas primero)
router.get('/usuario/:idUsuario/no-leidas', validacionParametroUsuario, handleValidationErrors, handleAsyncErrors((req, res) => {
    req.query.estado = 'pendiente';
    return obtenerNotificacionesPorUsuario(req, res);
}));

// Obtener notificaciones por usuario
router.get('/usuario/:idUsuario', validacionParametroUsuario, handleValidationErrors, handleAsyncErrors(obtenerNotificacionesPorUsuario));

// Obtener una notificación individual por ID (para modal/vista) - Debe ir DESPUÉS de rutas más específicas
router.get('/:idNotificacion', validacionParametroId, handleValidationErrors, handleAsyncErrors(obtenerNotificacionPorId));

// Crear nueva notificación (ruta principal para crear notificaciones)
router.post('/', validacionCrearNotificacion, handleValidationErrors, handleAsyncErrors(crearNotificacion));

// Alias para compatibilidad
router.post('/crear', validacionCrearNotificacion, handleValidationErrors, handleAsyncErrors(crearNotificacion));

// Crear notificaciones masivas
router.post('/masiva', validacionNotificacionMasiva, handleValidationErrors, handleAsyncErrors(crearNotificacionMasiva));

// Marcar notificación como leída
router.put('/:idNotificacion/marcar-leida', validacionParametroId, handleValidationErrors, handleAsyncErrors(marcarComoLeida));

// Actualizar estado de la notificación
router.patch('/:idNotificacion/estado', validacionParametroId, handleValidationErrors, handleAsyncErrors((req, res) => {
    const { estado } = req.body;
    if (!estado) {
        return res.status(400).json({ 
            success: false, 
            message: 'El estado es requerido' 
        });
    }
    req.query.estado = estado;
    return marcarComoLeida(req, res);
}));

// Actualizar notificación (campos específicos)
router.put('/:idNotificacion', validacionParametroId, handleValidationErrors, handleAsyncErrors((req, res) => {
    // Si se intenta actualizar, usar el mismo controlador de crear pero con lógica de actualización
    return obtenerNotificacionPorId(req, res);
}));

// Marcar todas las notificaciones de un usuario como leídas
router.put('/marcar-todas-leidas/:idUsuario', validacionParametroUsuario, handleValidationErrors, handleAsyncErrors(marcarTodasComoLeidas));

// Eliminar notificación
router.delete('/:idNotificacion', validacionParametroId, handleValidationErrors, handleAsyncErrors(eliminarNotificacion));

// Alias para compatibilidad
router.delete('/eliminar/:idNotificacion', validacionParametroId, handleValidationErrors, handleAsyncErrors(eliminarNotificacion));

// Eliminar notificación (desde body) - Ruta alternativa para compatibilidad con frontend
router.delete('/eliminar', (req, res, next) => {
    if (req.body && req.body.idNotificacion) {
        req.params.idNotificacion = req.body.idNotificacion;
        console.log('[NOTIFICACIONES] ID de notificación recibido en body:', req.body.idNotificacion);
    }
    next();
}, handleAsyncErrors(eliminarNotificacion));

// Crear alerta programada (ej: Recordar vacuna en 6 meses)
router.post('/alerta-programada', validacionAlertaProgramada, handleValidationErrors, handleAsyncErrors(crearAlertaProgramada));

// Limpiar historial de notificaciones de un usuario (desde params)
router.delete('/limpiar-historial/:idUsuario', validacionParametroUsuario, handleValidationErrors, handleAsyncErrors(limpiarHistorial));

// Limpiar historial de notificaciones (desde body) - Ruta alternativa para compatibilidad con frontend
router.delete('/limpiar-historial', (req, res, next) => {
    if (req.body && req.body.idUsuario) {
        req.params.idUsuario = req.body.idUsuario;
        console.log('[NOTIFICACIONES] ID de usuario recibido en body:', req.body.idUsuario);
    }
    next();
}, handleAsyncErrors(limpiarHistorial));

module.exports = router;