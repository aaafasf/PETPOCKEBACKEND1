require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Importación única
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const fileUpload = require("express-fileupload");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const winston = require('winston');
const fs = require('fs');
const hpp = require('hpp');
const toobusy = require('toobusy-js');

// Configurar toobusy con umbral más alto para desarrollo
if (process.env.NODE_ENV !== 'production') {
    toobusy.maxLag(200); // Aumentar el umbral de lag permitido (default es 70ms)
    toobusy.interval(500); // Intervalo de verificación más largo
}


// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('../src/config/keys');
require('../src/lib/passport');

const app = express();

// ==================== CONFIGURACIÓN DE CORS ====================
// Configuración para permitir conexiones desde el frontend Angular
const allowedOrigins = [
    'http://localhost:4200', // Angular por defecto
 
];

// Si hay una variable de entorno para orígenes adicionales, agregarlos
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (mobile apps, Postman, etc.) en desarrollo
        if (!origin || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        // En producción, verificar que el origen esté permitido
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // En desarrollo, permitir todos
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Content-Length'],
    optionsSuccessStatus: 200,
    preflightContinue: false
};

app.use(cors(corsOptions)); // Aplicar CORS
app.options('*', cors(corsOptions));

// Middleware adicional para manejar OPTIONS explícitamente
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
        return res.status(200).end();
    }
    next();
});    

// ==================== CONFIGURACIÓN BÁSICA ====================
app.set('port', process.env.PORT || 3000);

// ==================== LOGS ====================
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'app.log'), maxsize: 10485760, maxFiles: 5 }),
        new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })
    ]
});

console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));

app.use(morgan('dev', { stream: { write: (message) => logger.info(message.replace(/\n$/, '')) } }));

// ==================== SEGURIDAD ====================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite cargar recursos desde el front
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false // Permite que las imágenes se carguen sin problemas
}));

// Middleware toobusy solo en producción o con umbral más alto
app.use((req, res, next) => {
    // Solo activar toobusy en producción o si está configurado
    if (process.env.NODE_ENV === 'production' && toobusy()) {
        return res.status(503).json({ error: 'Server too busy.' });
    }
    next();
});

app.use(hpp());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
// Middleware para subir archivos
app.use(fileUpload({
  createParentPath: true, // Crea la carpeta si no existe
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite 10MB
  abortOnLimit: true,
  useTempFiles: false
}));

// Aumentamos un poco el límite para pruebas locales
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Subimos a 500 para evitar bloqueos mientras desarrollas
    message: { error: 'Too many requests, please try again later.' }
}));

app.use(cookieParser(process.env.COOKIE_SECRET || 'petpocket_secret_key'));

// Sesiones
app.use(session({
    store: new MySQLStore({
        host: MYSQLHOST, port: MYSQLPORT, user: MYSQLUSER, 
        password: MYSQLPASSWORD, database: MYSQLDATABASE, createDatabaseTable: true
    }),
    secret: process.env.SESSION_SECRET || 'petpocket_session_secret',
    resave: false,
    saveUninitialized: false,
    name: 'secureSessionId',
    cookie: {
        httpOnly: true,
        secure: false, // Cambiado a false para que funcione en localhost sin HTTPS
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(compression());

// ==================== ARCHIVOS ESTÁTICOS CON CORS ====================
// Manejar OPTIONS para archivos estáticos
app.options('/uploads/*', cors(corsOptions));

// Middleware para servir archivos estáticos con headers CORS correctos
app.use('/uploads', (req, res, next) => {
    // Configurar headers CORS para archivos estáticos
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin || process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    // Headers adicionales para evitar bloqueo de recursos (OpaqueResponseBlocking)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    
    // Si es una petición OPTIONS, responder inmediatamente
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Continuar con express.static
    next();
}, express.static(path.join(__dirname, '../src/uploads'), {
    setHeaders: (res, filePath) => {
        // Headers específicos para imágenes
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
            res.setHeader('Content-Type', getContentType(filePath));
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año
            
            // Headers CORS adicionales en la respuesta del archivo
            const origin = res.req?.headers?.origin;
            if (allowedOrigins.includes(origin) || !origin || process.env.NODE_ENV !== 'production') {
                res.setHeader('Access-Control-Allow-Origin', origin || '*');
                res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
            }
        }
    }
}));

// Función auxiliar para determinar Content-Type
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.avif': 'image/avif'
    };
    return types[ext] || 'application/octet-stream';
}


// ==================== ENDPOINT DE SALUD (ANTES DE TODO) ====================
// Endpoint para verificar que el backend está corriendo - DEBE IR ANTES DE LAS RUTAS API
app.get('/health', (req, res) => {
    console.log('\n🏥 [HEALTH] ===== Petición GET /health recibida =====');
    console.log('🏥 [HEALTH] Origin:', req.headers.origin || 'Sin origen');
    console.log('🏥 [HEALTH] Headers:', JSON.stringify(req.headers, null, 2));
    
    const origin = req.headers.origin || '*';
    
    // Configurar TODOS los headers CORS explícitamente
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    const response = { 
        status: 'ok', 
        message: 'Backend funcionando correctamente',
        timestamp: new Date().toISOString()
    };
    
    console.log('✅ [HEALTH] Respondiendo con 200 OK');
    console.log('✅ [HEALTH] Response:', JSON.stringify(response));
    console.log('✅ [HEALTH] Headers enviados:', res.getHeaders());
    console.log('🏥 [HEALTH] ===== Fin de respuesta =====\n');
    
    return res.status(200).json(response);
});

// Manejar OPTIONS para /health ANTES del GET
app.options('/health', (req, res) => {
    console.log('\n🔄 [HEALTH] ===== Petición OPTIONS /health recibida (preflight) =====');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    console.log('✅ [HEALTH] Respondiendo a OPTIONS con 200 OK');
    console.log('🔄 [HEALTH] ===== Fin de respuesta OPTIONS =====\n');
    return res.status(200).end();
});

// ==================== RUTAS API ====================
// Todas las rutas bajo /api para consistencia
console.log('\n🔧 [APP] ===== Registrando Routers API =====');

// Routers con prefijo /api
app.use('/api/servicios', require('../src/infrastructure/http/router/servicio.router'));
app.use('/api/mascota', require('../src/infrastructure/http/router/mascota.router'));
app.use('/api/cliente', require('../src/infrastructure/http/router/cliente.router'));
app.use('/api/cita', require('../src/infrastructure/http/router/cita.router'));
app.use('/api/producto', require('../src/infrastructure/http/router/producto.router'));
app.use('/api/usuario', require('../src/infrastructure/http/router/user.router'));
app.use('/api/notificaciones', require('../src/infrastructure/http/router/notificacion.router'));
app.use('/api/configuracion', require('../src/infrastructure/http/router/configuracion.router'));

// Catálogos
app.use('/api/especies', require('../src/infrastructure/http/router/especie.router'));
app.use('/api/razas', require('../src/infrastructure/http/router/raza.router'));
app.use('/api/sexos', require('../src/infrastructure/http/router/sexo.router'));
app.use('/api/colores', require('../src/infrastructure/http/router/color.router'));
app.use('/api/tamanos', require('../src/infrastructure/http/router/tamano.router'));
app.use('/api/tipos-mascota', require('../src/infrastructure/http/router/estadoMascota.router'));

// Routers sin prefijo /api (auth debe estar sin /api por convención)
app.use('/auth', require('../src/infrastructure/http/router/auth.router'));

console.log('✅ [APP] Todos los routers registrados correctamente');
console.log('  ✓ /api/servicios');
console.log('  ✓ /api/mascota');
console.log('  ✓ /api/cliente');
console.log('  ✓ /api/cita');
console.log('  ✓ /api/producto');
console.log('  ✓ /api/usuario');
console.log('  ✓ /api/notificaciones');
console.log('  ✓ /api/configuracion');
console.log('  ✓ /api/especies');
console.log('  ✓ /api/razas');
console.log('  ✓ /api/sexos');
console.log('  ✓ /api/colores');
console.log('  ✓ /api/tamanos');
console.log('  ✓ /api/tipos-mascota');
console.log('  ✓ /auth');
console.log('  ✓ /api/notificaciones');
console.log('  ✓ /api/configuracion');
console.log('  ✓ /auth');
console.log('🔧 [APP] ===== Fin de registro de Routers =====\n');


// ==================== MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    if (err.stack) {
        logger.error(err.stack);
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

module.exports = app;