// Importar módulos necesarios
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const fileUpload = require("express-fileupload");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const winston = require('winston');
const fs = require('fs');
const crypto = require('crypto');
const hpp = require('hpp');
const toobusy = require('toobusy-js');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('../src/config/keys');
require('../src/lib/passport');

// Crear aplicación Express
const app = express();

// ==================== CONFIGURACIÓN BÁSICA ====================
app.set('port', process.env.PORT || 3000);

// Habilitar CORS - Permitir todas las conexiones
app.use(cors({
    origin: '*', // Permite todos los orígenes
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: false, // Debe ser false cuando origin es '*'
    optionsSuccessStatus: 200
}));

// Manejar peticiones preflight explícitamente
app.options('*', cors());

// Headers adicionales para CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==================== CONFIGURACIÓN DE LOGS MEJORADA ====================

// 1. Configuración de directorio de logs
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// 2. Configuración de Winston para logs unificados (consola y archivo)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => {
            return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
        })
    ),
    transports: [
        // Transporte para archivo (siempre activo)
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        // Transporte para consola (siempre activo)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Sobrescribir los métodos console para redirigir a Winston
console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.debug = (...args) => logger.debug(args.join(' '));

// 3. Configurar Morgan para usar Winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (message) => {
            // Eliminar saltos de línea innecesarios
            const cleanedMessage = message.replace(/\n$/, '');
            logger.info(cleanedMessage);
        }
    }
}));

// ==================== CONFIGURACIÓN DE SEGURIDAD MEJORADA ====================

// 4. Middleware de protección contra sobrecarga del servidor
app.use((req, res, next) => {
    if (toobusy()) {
        logger.warn('Server too busy!');
        res.status(503).json({ error: 'Server too busy. Please try again later.' });
    } else {
        next();
    }
});

// 5. Configuración de Helmet - Ajustado para permitir CORS
app.use(helmet({
    crossOriginResourcePolicy: false, // Permitir recursos de otros orígenes
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false // Desactivar CSP para desarrollo
}));

// 6. Protección contra HTTP Parameter Pollution
app.use(hpp());

// 7. Limitar tamaño de payload
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 8. Rate limiting para prevenir ataques de fuerza bruta
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests, please try again later.'
        });
    }
});
app.use(limiter);

// 9. Configuración avanzada de cookies
app.use(cookieParser(
    process.env.COOKIE_SECRET || crypto.randomBytes(64).toString('hex'),
    {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    }
));

// 10. Configuración de sesiones seguras
const sessionConfig = {
    store: new MySQLStore({
        host: MYSQLHOST,
        port: MYSQLPORT,
        user: MYSQLUSER,
        password: MYSQLPASSWORD,
        database: MYSQLDATABASE,
        createDatabaseTable: true
    }),
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    },
    name: 'secureSessionId',
    rolling: true,
    unset: 'destroy'
};

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));
app.use(flash());


// 12. Headers de seguridad adicionales (ajustados para permitir CORS)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // X-Frame-Options removido para permitir embedding
    // Feature-Policy ajustado para desarrollo
    next();
});

// 13. Validación de entrada global
app.use((req, res, next) => {
    // Sanitizar parámetros de consulta
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = escape(req.query[key]);
        }
    }

    // Sanitizar cuerpo de la petición
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = escape(req.body[key]);
            }
        }
    }

    next();
});

// ==================== MIDDLEWARE ADICIONAL ====================

// Configurar middleware de subida de archivos
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true
}));

// Middleware de compresión
app.use(compression());

// Configurar passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware para pasar datos comunes a las respuestas
app.use((req, res, next) => {
    // Para API responses en JSON
    res.apiResponse = (data, status = 200, message = '') => {
        const response = {
            success: status >= 200 && status < 300,
            message,
            data
        };
        return res.status(status).json(response);
    };

    res.apiError = (message, status = 400, errors = null) => {
        const response = {
            success: false,
            message,
            errors
        };
        return res.status(status).json(response);
    };

    next();
});

// ==================== CONFIGURACIÓN DE SWAGGER ====================

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PetPocket API',
            version: '1.0.0',
            description: 'API para gestión de veterinaria PetPocket - Sistema de citas, clientes, mascotas y servicios',
            contact: {
                name: 'PetPocket Team',
                email: 'support@petpocket.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            schemas: {
                Cita: {
                    type: 'object',
                    required: ['idCliente', 'idMascota', 'idServicio', 'fecha', 'hora'],
                    properties: {
                        idCita: {
                            type: 'integer',
                            description: 'ID único de la cita'
                        },
                        idCliente: {
                            type: 'integer',
                            description: 'ID del cliente'
                        },
                        idMascota: {
                            type: 'integer',
                            description: 'ID de la mascota'
                        },
                        idServicio: {
                            type: 'integer',
                            description: 'ID del servicio'
                        },
                        fecha: {
                            type: 'string',
                            format: 'date',
                            description: 'Fecha de la cita (YYYY-MM-DD)'
                        },
                        hora: {
                            type: 'string',
                            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
                            description: 'Hora de la cita (HH:MM)'
                        },
                        estadoCita: {
                            type: 'string',
                            enum: ['programada', 'confirmada', 'cancelada', 'completada'],
                            description: 'Estado actual de la cita'
                        },
                        motivo: {
                            type: 'string',
                            description: 'Motivo de la consulta'
                        },
                        sintomas: {
                            type: 'string',
                            description: 'Síntomas de la mascota'
                        },
                        diagnosticoPrevio: {
                            type: 'string',
                            description: 'Diagnóstico previo si existe'
                        },
                        tratamientosAnteriores: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Historial de tratamientos'
                        },
                        notasAdicionales: {
                            type: 'string',
                            description: 'Notas adicionales del veterinario'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            description: 'Mensaje de error'
                        },
                        error: {
                            type: 'string',
                            description: 'Detalle del error'
                        }
                    }
                }
            }
        }
    },
    apis: ['./src/infrastructure/http/router/*.js'] // Path a los archivos con anotaciones
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Ruta para la documentación de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PetPocket API Docs'
}));

// Ruta para obtener el JSON de Swagger
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ==================== RUTAS API ====================
// Importar y configurar rutas como API
app.use(require('../src/infrastructure/http/router/index'))
app.use('/pagina', require('../src/infrastructure/http/router/pagina.router'))
app.use('/cliente', require('../src/infrastructure/http/router/cliente.router'));
app.use('/auth', require('../src/infrastructure/http/router/auth.router'));
app.use('/user', require('../src/infrastructure/http/router/user.router'));
app.use('/rol', require('../src/infrastructure/http/router/rol.router'));
app.use('/detalle-rol', require('../src/infrastructure/http/router/detalleRol.router')); // NUEVO
app.use('/mascota', require('../src/infrastructure/http/router/mascota.router'));
app.use('/servicio', require('../src/infrastructure/http/router/servicio.router'));
app.use('/producto', require('../src/infrastructure/http/router/producto.router'));
app.use('/cita', require('../src/infrastructure/http/router/cita.router'));
app.use('/propietario', require('../src/infrastructure/http/router/propietario.router'));
app.use('/pago', require('../src/infrastructure/http/router/pago.router')); // NUEVO
app.use('/notificacion', require('../src/infrastructure/http/router/notificacion.router')); // NUEVO
app.use('/auditoria', require('../src/infrastructure/http/router/auditoria.router')); // NUEVO
app.use('/feedback', require('../src/infrastructure/http/router/feedback.router')); // NUEVO
app.use('/promocion', require('../src/infrastructure/http/router/promocion.router')); // NUEVO
app.use('/reserva', require('../src/infrastructure/http/router/reserva.router')); // NUEVO

// Configurar variables globales
app.use((req, res, next) => {
    app.locals.message = req.flash('message');
    app.locals.success = req.flash('success');
    app.locals.user = req.user || null;
    next();
});

// ==================== MANEJO DE ERRORES ====================

// Middleware de manejo de errores mejorado para API
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    logger.error(`Error: ${err.message}\nStack: ${err.stack}`);

    // Respuestas de error estandarizadas
    if (err.name === 'ValidationError') {
        return res.apiError('Validation error', 400, err.errors);
    }

    if (err.code === 'EBADCSRFTOKEN') {
        return res.apiError('CSRF token validation failed', 403);
    }

    // Error no manejado
    const errorResponse = {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };

    res.status(500).json(errorResponse);
});

// Middleware para rutas no encontradas (API)
app.use((req, res, next) => {
    logger.warn(`404 Not Found: ${req.originalUrl}`);
    res.apiError('Endpoint not found', 404);
});

// Exportar la aplicación
module.exports = app;
