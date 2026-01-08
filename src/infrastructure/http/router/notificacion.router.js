const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Error de validación',
            errors: errors.array() 
        });
    }
    next();
};

const { 
    mostrarNotificaciones,
    obtenerNotificacionPorId,
    crearNotificacion,
    obtenerNotificacionesPorUsuario,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    crearNotificacionMasiva,
    obtenerEstadisticas,
    crearAlertaProgramada,
    limpiarHistorial,
    limpiarHistorialGeneral
} = require('../controller/notificacion.controller');

// Validaciones para crear notificación (más permisivas)
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
    
    body('tipo')
        .optional()
        .isIn(['general', 'recordatorio', 'urgente', 'promocion', 'sistema'])
        .withMessage('Tipo debe ser: general, recordatorio, urgente, promocion o sistema')
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

// Validaciones para crear alerta programada (más permisivas)
const validacionAlertaProgramada = [
    body('idUsuario')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo'),
    
    body('mensaje')
        .optional()
        .isLength({ min: 0, max: 1000 })
        .withMessage('El mensaje no puede exceder 1000 caracteres'),
    
    body('titulo')
        .optional()
        .isLength({ min: 0, max: 200 })
        .withMessage('El título no puede exceder 200 caracteres'),
    
    body('fechaProgramada')
        .optional()
        .custom((value) => {
            if (value) {
                const fecha = new Date(value);
                if (isNaN(fecha.getTime())) {
                    throw new Error('La fecha programada debe ser válida');
                }
            }
            return true;
        }),
    
    body('tipoRecordatorio')
        .optional()
        .isIn(['vacuna', 'control', 'cita', 'general', 'medicamento'])
        .withMessage('Tipo de recordatorio debe ser: vacuna, control, cita, general o medicamento')
];

// Validaciones para parámetros
const validacionParametroId = [
    param('id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El ID de la notificación debe ser un número entero positivo'),
    handleValidationErrors
];

const validacionParametroIdNotificacion = [
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
// Rutas principales que coinciden con lo esperado por el frontend
// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros

// Middleware para logging y CORS - PRIMERO
router.use((req, res, next) => {
    console.log(`\n🔍 [NOTIFICACIONES] ${req.method} ${req.path}`);
    console.log(`🔍 Origin: ${req.headers.origin || 'Sin origen'}`);
    console.log(`🔍 Headers:`, JSON.stringify(req.headers, null, 2));
    
    // Configurar CORS explícitamente en TODAS las rutas
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    
    // Manejar OPTIONS explícitamente
    if (req.method === 'OPTIONS') {
        console.log('✅ Respondiendo a OPTIONS (preflight)');
        return res.status(200).end();
    }
    
    // Forzar que NO se use caché en las respuestas
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    next();
});

// GET /api/notificaciones - Obtener todas las notificaciones
router.get('/', async (req, res) => {
    try {
        console.log('📥 GET /api/notificaciones - Iniciando...');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // Llamar al método directamente con manejo de errores garantizado
        await mostrarNotificaciones(req, res);
        
        console.log('✅ GET /api/notificaciones - Completado');
    } catch (error) {
        console.error('❌ [ROUTER] Error en GET /api/notificaciones:', error);
        console.error('❌ [ROUTER] Stack:', error.stack);
        
        // Configurar headers CORS en caso de error
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        
        // SIEMPRE responder con array vacío si hay error
        if (!res.headersSent) {
            const respuesta = [];
            console.log('📤 [ROUTER] Enviando respuesta de error (array vacío)');
            return res.status(200).json(respuesta);
        } else {
            console.log('⚠️ [ROUTER] Headers ya enviados en error handler');
        }
    }
});

// POST /api/notificaciones - Crear notificación o alerta programada
// IMPORTANTE: Esta ruta debe ir DESPUÉS de GET / pero ANTES de rutas con parámetros
router.post('/', [
    body('idUsuario')
        .optional()
        .isInt({ min: 1 })
        .withMessage('El ID del usuario debe ser un número entero positivo'),
    body('mensaje')
        .optional()
        .isLength({ min: 0, max: 1000 })
        .withMessage('El mensaje no puede exceder 1000 caracteres'),
    body('titulo')
        .optional()
        .isLength({ min: 0, max: 200 })
        .withMessage('El título no puede exceder 200 caracteres'),
    body('fechaProgramada')
        .optional()
        .custom((value) => {
            if (value && isNaN(new Date(value).getTime())) {
                throw new Error('La fecha debe ser válida');
            }
            return true;
        }),
    handleValidationErrors
], async (req, res) => {
    try {
        console.log('\n📨 [POST] ===== Petición POST /api/notificaciones recibida =====');
        console.log('📨 [POST] Origin:', req.headers.origin || 'Sin origen');
        console.log('📨 [POST] Body:', JSON.stringify(req.body, null, 2));
        
        // Configurar headers CORS y no-cache
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // Si viene fechaProgramada, usar crearAlertaProgramada
        // Si solo viene titulo (sin fechaProgramada), usar crearNotificacion (que maneja titulo)
        if (req.body.fechaProgramada) {
            console.log('📅 [POST] Creando alerta programada (con fecha)...');
            try {
                await crearAlertaProgramada(req, res);
                console.log('✅ [POST] crearAlertaProgramada completado');
            } catch (error) {
                console.error('❌ [POST] Error en crearAlertaProgramada:', error);
                if (!res.headersSent) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear la alerta programada',
                        error: error.message
                    });
                }
            }
        } else {
            console.log('📝 [POST] Creando notificación (simple o con título)...');
            try {
                await crearNotificacion(req, res);
                console.log('✅ [POST] crearNotificacion completado');
            } catch (error) {
                console.error('❌ [POST] Error en crearNotificacion:', error);
                if (!res.headersSent) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear la notificación',
                        error: error.message
                    });
                }
            }
        }
        
        // Verificar que se haya enviado una respuesta
        if (!res.headersSent) {
            console.error('❌ [POST] ERROR: No se envió respuesta del controlador');
            return res.status(500).json({
                success: false,
                message: 'Error: El controlador no envió respuesta'
            });
        }
        
        console.log('✅ [POST] POST /api/notificaciones completado');
        console.log('📨 [POST] ===== Fin de procesamiento POST =====\n');
    } catch (error) {
        console.error('\n❌ [POST] ===== Error en POST /api/notificaciones =====');
        console.error('❌ [POST] Error:', error.message);
        console.error('❌ [POST] Stack:', error.stack);
        
        // Configurar headers CORS en caso de error
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // Asegurarse de que siempre se responda
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'Error al procesar la solicitud',
                error: error.message
            });
        }
        console.error('❌ [POST] ===== Fin de manejo de error =====\n');
    }
});

// PATCH /api/notificaciones/:id/marcar-leida - Marcar como leída
router.patch('/:id/marcar-leida', [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    handleValidationErrors
], marcarComoLeida);

// DELETE /api/notificaciones/limpiar - Limpiar historial (debe ir antes de /:id)
router.delete('/limpiar', limpiarHistorialGeneral);

// GET /api/notificaciones/:id - Obtener una notificación por ID (debe ir al final de GET)
// Validación más flexible para evitar que se quede colgado
router.get('/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    handleValidationErrors
], obtenerNotificacionPorId);

// DELETE /api/notificaciones/:id - Eliminar notificación (debe ir después de rutas específicas)
router.delete('/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    handleValidationErrors
], eliminarNotificacion);

// ================ RUTAS ADICIONALES (compatibilidad) ================
// Estas rutas ya están definidas arriba, solo mantenemos las POST y DELETE alternativas

// Crear nueva notificación (ruta alternativa)
router.post('/crear', validacionCrearNotificacion, handleValidationErrors, crearNotificacion);

// Crear notificaciones masivas
router.post('/crear-masiva', validacionNotificacionMasiva, handleValidationErrors, crearNotificacionMasiva);

// Marcar notificación como leída (ruta alternativa)
router.put('/marcar-leida/:idNotificacion', [
    param('idNotificacion').isInt({ min: 1 }).withMessage('ID inválido'),
    handleValidationErrors
], marcarComoLeida);

// Marcar todas las notificaciones de un usuario como leídas
router.put('/marcar-todas-leidas/:idUsuario', [
    param('idUsuario').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
    handleValidationErrors
], marcarTodasComoLeidas);

// Eliminar notificación (ruta alternativa)
router.delete('/eliminar/:idNotificacion', [
    param('idNotificacion').isInt({ min: 1 }).withMessage('ID inválido'),
    handleValidationErrors
], eliminarNotificacion);

// Crear alerta programada (ej: Recordar vacuna en 6 meses)
router.post('/crear-alerta-programada', validacionAlertaProgramada, handleValidationErrors, crearAlertaProgramada);

// Limpiar historial de notificaciones de un usuario (ruta alternativa)
router.delete('/limpiar-historial/:idUsuario', [
    param('idUsuario').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
    handleValidationErrors
], limpiarHistorial);

// Log de registro de rutas al cargar el módulo
console.log('✅ Router de notificaciones cargado correctamente');
console.log('✅ Rutas registradas:');
router.stack.forEach((layer) => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`   ${methods} ${layer.route.path}`);
    }
});

module.exports = router;