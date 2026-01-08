require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const fileUpload = require('express-fileupload');
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
    toobusy.maxLag(200);
    toobusy.interval(500);
}

// Importar módulos locales
const {
    MYSQLHOST,
    MYSQLUSER,
    MYSQLPASSWORD,
    MYSQLDATABASE,
    MYSQLPORT,
} = require('../src/config/keys');
require('../src/lib/passport');

const app = express();

// ==================== CONFIGURACIÓN DE CORS ====================
const allowedOrigins = [
    'http://localhost:4200'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control'
    ],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware para manejar OPTIONS explícitamente
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
    }
    next();
});

// ==================== CONFIGURACIÓN BÁSICA ====================
app.set('port', process.env.PORT || 3000);

// ==================== LOGS ====================
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'app.log'), maxsize: 10485760, maxFiles: 5 }),
        new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) }),
    ]
});

console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));

app.use(morgan('dev', { stream: { write: message => logger.info(message.replace(/\n$/, '')) } }));

// ==================== SEGURIDAD ====================
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false
}));

app.use((req, res, next) => {
    if (toobusy()) return res.status(503).json({ error: 'Server too busy.' });
    next();
});

app.use(hpp());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 10 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: false
}));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Too many requests, please try again later.' }
}));

app.use(cookieParser(process.env.COOKIE_SECRET || 'petpocket_secret_key'));

// ==================== SESIONES ====================
app.use(session({
    store: new MySQLStore({
        host: MYSQLHOST,
        port: MYSQLPORT,
        user: MYSQLUSER,
        password: MYSQLPASSWORD,
        database: MYSQLDATABASE,
        createDatabaseTable: true
    }),
    secret: process.env.SESSION_SECRET || 'petpocket_session_secret',
    resave: false,
    saveUninitialized: false,
    name: 'secureSessionId',
    cookie: { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 24*60*60*1000 }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(compression());
app.use('/uploads', express.static(path.join(__dirname, '../src/uploads')));

// ==================== RUTAS API ====================
app.use('/api/servicios', require('../src/infrastructure/http/router/servicio.router'));
app.use('/cliente', require('../src/infrastructure/http/router/cliente.router'));
app.use('/auth', require('../src/infrastructure/http/router/auth.router'));
app.use('/mascota', require('../src/infrastructure/http/router/mascota.router'));
app.use('/cita', require('../src/infrastructure/http/router/cita.router'));
app.use('/producto', require('../src/infrastructure/http/router/producto.router'));
app.use('/configuracion', require('../src/infrastructure/http/router/configuracion.router'));
app.use('/usuario', require('../src/infrastructure/http/router/user.router'));
app.use('/notificacion', require('../src/infrastructure/http/router/notificacion.router'));

// ==================== ENDPOINT DE SALUD ====================
app.get('/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ status: 'ok', message: 'Backend funcionando correctamente', timestamp: new Date().toISOString() });
});

app.options('/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
});

// ==================== MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

module.exports = app;
