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


// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('../src/config/keys');
require('../src/lib/passport');

const app = express();

// ==================== CONFIGURACIÓN DE CORS ====================
// Optimizamos para que acepte peticiones de tu puerto 4200 sin bloqueos
const corsOptions = {
    origin: true, // Permite cualquier origen en desarrollo para evitar el bloqueo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // Aplicar CORS
app.options('*', cors(corsOptions));    

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
    contentSecurityPolicy: false 
}));

app.use((req, res, next) => {
    if (toobusy()) return res.status(503).json({ error: 'Server too busy.' });
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
app.use('/uploads', express.static(path.join(__dirname, '../src/uploads')));

// ==================== RUTAS API ====================
// Asegúrate de que estas rutas existan en tu carpeta /src
app.use('/api/servicios', require('../src/infrastructure/http/router/servicio.router'));
app.use('/cliente', require('../src/infrastructure/http/router/cliente.router'));
app.use('/auth', require('../src/infrastructure/http/router/auth.router'));
app.use('/mascota', require('../src/infrastructure/http/router/mascota.router'));
app.use('/cita', require('../src/infrastructure/http/router/cita.router'));
app.use('/producto', require('../src/infrastructure/http/router/producto.router'));
app.use('/configuracion', require('../src/infrastructure/http/router/configuracion.router'));


// ==================== MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

module.exports = app;