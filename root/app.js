require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('../src/config/keys');
require('../src/lib/passport');

const app = express();

/* ==================== CORS ==================== */
const allowedOrigins = ['http://localhost:4200'];

const corsOptions = {
    origin: (origin, cb) => cb(null, true),
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ==================== PUERTO ==================== */
app.set('port', process.env.PORT || 3000);

/* ==================== LOGS ==================== */
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
        new winston.transports.Console()
    ]
});

app.use(morgan('dev'));

/* ==================== SEGURIDAD ==================== */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(hpp());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

/* ==================== FILE UPLOAD ==================== */
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
}));

/* ==================== RATE LIMIT ==================== */
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500
}));

/* ==================== COOKIES Y SESIÓN ==================== */
app.use(cookieParser('petpocket_secret'));

app.use(session({
    store: new MySQLStore({
        host: MYSQLHOST,
        port: MYSQLPORT,
        user: MYSQLUSER,
        password: MYSQLPASSWORD,
        database: MYSQLDATABASE
    }),
    secret: 'petpocket_session',
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

/* ==================== HEALTH ==================== */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend funcionando' });
});

/* ==================== RUTAS API ==================== */
app.use('/api/servicios', require('../src/infrastructure/http/router/servicio.router'));
app.use('/api/clientes', require('../src/infrastructure/http/router/cliente.router'));
app.use('/api/auth', require('../src/infrastructure/http/router/auth.router'));
app.use('/api/mascotas', require('../src/infrastructure/http/router/mascota.router'));
app.use('/api/citas', require('../src/infrastructure/http/router/cita.router'));
app.use('/api/productos', require('../src/infrastructure/http/router/producto.router'));
app.use('/api/configuracion', require('../src/infrastructure/http/router/configuracion.router'));
app.use('/api/usuarios', require('../src/infrastructure/http/router/user.router'));
app.use('/api/notificaciones', require('../src/infrastructure/http/router/notificacion.router'));
app.use('/api/catalogos', require('../src/infrastructure/http/router/catalogos.router'));
/* 🔥 CATALOGO (EL QUE FALTABA) */
app.use('/api/catalogos', require('../src/infrastructure/http/router/catalogos.router'));

/* ==================== ERRORES ==================== */
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

module.exports = app;
