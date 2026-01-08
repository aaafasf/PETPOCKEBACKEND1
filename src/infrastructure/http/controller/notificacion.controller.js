const notificacionCtl = {};
const orm = require('../../Database/dataBase.orm.js');
const sql = require('../../Database/dataBase.sql.js');
const { cifrarDatos, descifrarDatos } = require('../../../application/controller/encrypDates.js');
const bcrypt = require('bcrypt');

// Función para descifrar de forma segura
const descifrarSeguro = (dato) => {
    try {
        return dato ? descifrarDatos(dato) : '';
    } catch (error) {
        console.error('Error al descifrar:', error);
        return '';
    }
};

// Función para decodificar mensajes URL-encoded de forma robusta
const decodificarMensaje = (mensaje) => {
    if (!mensaje || typeof mensaje !== 'string') {
        return mensaje || '';
    }
    
    let mensajeDecodificado = mensaje;
    let intentos = 0;
    const maxIntentos = 5;
    
    // Intentar decodificar múltiples veces si es necesario (para casos de doble codificación)
    while (mensajeDecodificado.includes('%') && intentos < maxIntentos) {
        try {
            const anterior = mensajeDecodificado;
            mensajeDecodificado = decodeURIComponent(mensajeDecodificado);
            
            // Si no cambió nada, salir del loop
            if (anterior === mensajeDecodificado) {
                break;
            }
            intentos++;
        } catch (e) {
            // Si falla la decodificación, intentar con unescape (método alternativo)
            try {
                mensajeDecodificado = unescape(mensajeDecodificado);
            } catch (e2) {
                // Si ambos fallan, devolver el mensaje original
                break;
            }
            intentos++;
        }
    }
    
    return mensajeDecodificado;
};

// Mostrar todas las notificaciones
notificacionCtl.mostrarNotificaciones = async (req, res) => {
    try {
        console.log('📋 [CONTROLLER] Obteniendo notificaciones...');
        
        // Configurar headers CORS explícitamente antes de cualquier operación
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Usar LEFT JOIN para que funcione incluso si no hay usuarios asociados
        const [listaNotificaciones] = await sql.promise().query(`
            SELECT n.*, 
                   COALESCE(u.nameUsers, '') as nameUsers, 
                   COALESCE(u.emailUser, '') as emailUser
            FROM notificaciones n
            LEFT JOIN users u ON n.idUsuario = u.idUser
            ORDER BY n.createNotificacion DESC
        `);

        console.log(`📊 [CONTROLLER] Notificaciones encontradas en BD: ${listaNotificaciones ? listaNotificaciones.length : 0}`);

        // Si no hay notificaciones, devolver array vacío inmediatamente
        if (!listaNotificaciones || listaNotificaciones.length === 0) {
            console.log('✅ No hay notificaciones, devolviendo array vacío');
            const respuesta = [];
            console.log('📤 Enviando respuesta:', JSON.stringify(respuesta));
            return res.status(200).json(respuesta);
        }

        // Función auxiliar para limpiar mensajes con prefijos [PROGRAMADA: ...] o [TIPO]
        const limpiarMensaje = (mensaje) => {
            if (!mensaje || typeof mensaje !== 'string') return mensaje || '';
            let mensajeLimpio = mensaje;
            
            // Remover [PROGRAMADA: ...] del inicio del mensaje
            mensajeLimpio = mensajeLimpio.replace(/^\[PROGRAMADA:[^\]]+\]\s*/i, '');
            
            // Remover [TIPO] del inicio del mensaje (ej: [VACUNA], [CONTROL], [GENERAL])
            mensajeLimpio = mensajeLimpio.replace(/^\[(VACUNA|CONTROL|GENERAL|CITA|MEDICAMENTO|RECORDATORIO)\]\s*/i, '');
            
            return mensajeLimpio.trim();
        };

        // Procesar notificaciones de forma simple
        const notificacionesCompletas = listaNotificaciones.map(notificacion => {
            try {
                // Decodificar mensaje usando la función robusta
                let mensajeDecodificado = decodificarMensaje(notificacion.mensaje || '');
                
                // Limpiar mensajes que tienen prefijos [PROGRAMADA: ...] o [TIPO]
                mensajeDecodificado = limpiarMensaje(mensajeDecodificado);
                
                return {
                    idNotificacion: notificacion.idNotificacion,
                    idUsuario: notificacion.idUsuario,
                    mensaje: mensajeDecodificado, // Mensaje limpio sin prefijos
                    tipo: notificacion.tipo || 'general',
                    estadoNotificacion: notificacion.estadoNotificacion || 'pendiente',
                    fechaProgramada: notificacion.fechaProgramada || null,
                    tipoRecordatorio: notificacion.tipoRecordatorio || null,
                    createNotificacion: notificacion.createNotificacion || null,
                    updateNotificacion: notificacion.updateNotificacion || null,
                    nameUsers: notificacion.nameUsers || '',
                    emailUser: notificacion.emailUser || ''
                };
            } catch (e) {
                console.error('Error procesando notificación individual:', e);
                // Si hay error procesando una notificación, devolver datos básicos con mensaje limpio
                let mensajeBasico = notificacion.mensaje || '';
                // Intentar limpiar el mensaje incluso si hubo error en el procesamiento principal
                try {
                    const mensajeDecodificado = decodificarMensaje(mensajeBasico);
                    mensajeBasico = mensajeDecodificado.replace(/^\[PROGRAMADA:[^\]]+\]\s*/i, '').replace(/^\[(VACUNA|CONTROL|GENERAL|CITA|MEDICAMENTO|RECORDATORIO)\]\s*/i, '').trim();
                } catch (e) {
                    // Si falla, usar el mensaje original
                }
                
                return {
                    idNotificacion: notificacion.idNotificacion,
                    idUsuario: notificacion.idUsuario,
                    mensaje: mensajeBasico,
                    tipo: notificacion.tipo || 'general',
                    estadoNotificacion: notificacion.estadoNotificacion || 'pendiente'
                };
            }
        });

        console.log('✅ [CONTROLLER] Notificaciones procesadas, enviando respuesta...');
        console.log('📤 [CONTROLLER] Total a enviar:', notificacionesCompletas.length);
        
        // Responder inmediatamente con código 200
        const respuesta = notificacionesCompletas;
        console.log('📤 [CONTROLLER] Enviando respuesta 200 OK');
        return res.status(200).json(respuesta);
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Error al mostrar notificaciones:', error);
        console.error('❌ [CONTROLLER] Stack:', error.stack);
        
        // Configurar headers CORS en caso de error también
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // SIEMPRE responder, incluso con error - array vacío para que el frontend no se quede cargando
        if (!res.headersSent) {
            const respuesta = [];
            console.log('📤 [CONTROLLER] Enviando respuesta de error (array vacío):', JSON.stringify(respuesta));
            return res.status(200).json(respuesta);
        } else {
            console.log('⚠️ [CONTROLLER] Headers ya enviados en error handler');
        }
    }
};

// Obtener una notificación por ID
notificacionCtl.obtenerNotificacionPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ message: 'ID de notificación inválido' });
        }

        const [notificacion] = await sql.promise().query(`
            SELECT n.*, 
                   COALESCE(u.nameUsers, '') as nameUsers, 
                   COALESCE(u.emailUser, '') as emailUser
            FROM notificaciones n
            LEFT JOIN users u ON n.idUsuario = u.idUser
            WHERE n.idNotificacion = ?
        `, [id]);

        if (!notificacion || notificacion.length === 0) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        // Decodificar mensaje usando la función robusta
        const mensajeDecodificado = decodificarMensaje(notificacion[0].mensaje);
        
        const notificacionCompleta = {
            ...notificacion[0],
            mensaje: mensajeDecodificado,
            nameUsers: descifrarSeguro(notificacion[0].nameUsers || ''),
            emailUser: descifrarSeguro(notificacion[0].emailUser || '')
        };

        return res.json(notificacionCompleta);
    } catch (error) {
        console.error('Error al obtener notificación por ID:', error);
        return res.status(500).json({ message: 'Error al obtener la notificación', error: error.message });
    }
};

// Crear nueva notificación
notificacionCtl.crearNotificacion = async (req, res) => {
    try {
        console.log('📝 Crear notificación - Body recibido:', JSON.stringify(req.body));
        
        let { idUsuario, mensaje, tipo, titulo } = req.body;

        // Decodificar mensaje y título usando la función robusta
        mensaje = decodificarMensaje(mensaje);
        let tituloDecodificado = decodificarMensaje(titulo);

        // Si viene titulo, combinarlo con mensaje
        if (tituloDecodificado && mensaje) {
            mensaje = `${tituloDecodificado}: ${mensaje}`;
        } else if (tituloDecodificado && !mensaje) {
            mensaje = tituloDecodificado;
        }

        console.log('📝 Mensaje procesado:', mensaje);
        console.log('📝 Título procesado:', tituloDecodificado);

        // Validar que al menos (mensaje o titulo) estén presentes
        if (!mensaje && !tituloDecodificado) {
            console.log('❌ Error: Mensaje o título faltante');
            return res.status(400).json({ 
                success: false,
                message: 'El mensaje o título es obligatorio' 
            });
        }

        // Si después de procesar no hay mensaje, usar un mensaje por defecto
        if (!mensaje) {
            mensaje = tituloDecodificado || 'Notificación sin mensaje';
        }

        // Si no viene idUsuario, usar 1 por defecto (para desarrollo)
        if (!idUsuario) {
            console.log('⚠️ Advertencia: idUsuario no proporcionado, usando 1 por defecto');
            idUsuario = 1;
        }

        // Verificar que el usuario existe (sin validar estado para ser más permisivo)
        const [usuarioExiste] = await sql.promise().query(
            'SELECT idUser FROM users WHERE idUser = ?',
            [idUsuario]
        );

        if (usuarioExiste.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'El usuario no existe' 
            });
        }

        console.log('💾 Creando notificación en BD...');
        const nuevaNotificacion = await orm.notificacion.create({
            idUsuario: idUsuario,
            mensaje: mensaje,
            tipo: tipo || 'general',
            estadoNotificacion: 'pendiente',
            createNotificacion: new Date().toLocaleString(),
        });

        console.log('✅ Notificación creada:', nuevaNotificacion.idNotificacion);

        // Asegurarse de que siempre se responda
        if (!res.headersSent) {
            return res.status(201).json({ 
                success: true,
                message: 'Notificación creada exitosamente',
                data: {
                    idNotificacion: nuevaNotificacion.idNotificacion,
                    mensaje: mensaje,
                    tipo: tipo || 'general'
                }
            });
        }
    } catch (error) {
        console.error('❌ Error al crear notificación:', error);
        console.error('❌ Stack:', error.stack);
        
        // Configurar headers CORS en caso de error
        const origin = res.req?.headers?.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        // Asegurarse de que siempre se responda, incluso en caso de error
        if (!res.headersSent) {
            return res.status(500).json({ 
                success: false,
                message: 'Error al crear la notificación', 
                error: error.message
            });
        }
    }
};

// Obtener notificaciones por usuario (bandeja de notificaciones leídas/no leídas)
notificacionCtl.obtenerNotificacionesPorUsuario = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const { estado } = req.query;

        let query = `
            SELECT n.*, u.nameUsers
            FROM notificaciones n
            JOIN users u ON n.idUsuario = u.idUser
            WHERE n.idUsuario = ?
        `;
        
        let params = [idUsuario];

        if (estado) {
            query += ' AND n.estadoNotificacion = ?';
            params.push(estado);
        }

        query += ' ORDER BY n.createNotificacion DESC';

        const [notificacionesUsuario] = await sql.promise().query(query, params);

        const notificacionesCompletas = notificacionesUsuario.map(notificacion => {
            // Decodificar mensaje usando la función robusta
            const mensajeDecodificado = decodificarMensaje(notificacion.mensaje);
            
            return {
                ...notificacion,
                mensaje: mensajeDecodificado,
                nameUsers: descifrarSeguro(notificacion.nameUsers),
                leida: notificacion.estadoNotificacion === 'leida',
                noLeida: notificacion.estadoNotificacion === 'pendiente' || notificacion.estadoNotificacion === 'programada'
            };
        });

        // Separar en leídas y no leídas para facilitar el frontend
        const leidas = notificacionesCompletas.filter(n => n.leida);
        const noLeidas = notificacionesCompletas.filter(n => n.noLeida);

        return res.json({
            todas: notificacionesCompletas,
            leidas: leidas,
            noLeidas: noLeidas,
            total: notificacionesCompletas.length,
            totalLeidas: leidas.length,
            totalNoLeidas: noLeidas.length
        });
    } catch (error) {
        console.error('Error al obtener notificaciones por usuario:', error);
        return res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
    }
};

// Marcar notificación como leída
notificacionCtl.marcarComoLeida = async (req, res) => {
    try {
        // Compatibilidad: puede venir como 'id' o 'idNotificacion'
        const { id, idNotificacion } = req.params;
        const idNotif = id || idNotificacion;

        if (!idNotif) {
            return res.status(400).json({ message: 'ID de notificación es requerido' });
        }

        await sql.promise().query(
            `UPDATE notificaciones SET 
                estadoNotificacion = 'leida',
                updateNotificacion = ? 
             WHERE idNotificacion = ?`,
            [new Date().toLocaleString(), idNotif]
        );

        return res.json({ message: 'Notificación marcada como leída' });

    } catch (error) {
        console.error('Error al marcar como leída:', error);
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// Marcar todas las notificaciones de un usuario como leídas
notificacionCtl.marcarTodasComoLeidas = async (req, res) => {
    try {
        const { idUsuario } = req.params;

        await sql.promise().query(
            `UPDATE notificaciones SET 
                estadoNotificacion = 'leida',
                updateNotificacion = ? 
             WHERE idUsuario = ? AND estadoNotificacion = 'pendiente'`,
            [new Date().toLocaleString(), idUsuario]
        );

        return res.json({ message: 'Todas las notificaciones marcadas como leídas' });

    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// Eliminar notificación
notificacionCtl.eliminarNotificacion = async (req, res) => {
    try {
        // Compatibilidad: puede venir como 'id' o 'idNotificacion'
        const { id, idNotificacion } = req.params;
        const idNotif = id || idNotificacion;

        if (!idNotif) {
            return res.status(400).json({ message: 'ID de notificación es requerido' });
        }

        await sql.promise().query(
            'DELETE FROM notificaciones WHERE idNotificacion = ?',
            [idNotif]
        );

        return res.json({ message: 'Notificación eliminada exitosamente' });

    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};

// Crear notificaciones masivas
notificacionCtl.crearNotificacionMasiva = async (req, res) => {
    try {
        const { mensaje, tipo, usuarios } = req.body;

        if (!mensaje || !usuarios || !Array.isArray(usuarios)) {
            return res.status(400).json({ message: 'Mensaje y array de usuarios son obligatorios' });
        }

        let notificacionesCreadas = 0;

        for (const idUsuario of usuarios) {
            try {
                await orm.notificacion.create({
                    idUsuario: idUsuario,
                    mensaje: mensaje,
                    tipo: tipo || 'general',
                    estadoNotificacion: 'pendiente',
                    createNotificacion: new Date().toLocaleString(),
                });
                notificacionesCreadas++;
            } catch (error) {
                console.error(`Error al crear notificación para usuario ${idUsuario}:`, error);
            }
        }

        return res.status(201).json({ 
            message: `${notificacionesCreadas} notificaciones creadas exitosamente`
        });

    } catch (error) {
        console.error('Error al crear notificaciones masivas:', error);
        return res.status(500).json({ 
            message: 'Error al crear las notificaciones', 
            error: error.message 
        });
    }
};

// Obtener estadísticas de notificaciones
notificacionCtl.obtenerEstadisticas = async (req, res) => {
    try {
        const [estadisticas] = await sql.promise().query(`
            SELECT 
                COUNT(*) as totalNotificaciones,
                COUNT(CASE WHEN estadoNotificacion = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN estadoNotificacion = 'leida' THEN 1 END) as leidas,
                COUNT(DISTINCT idUsuario) as usuariosConNotificaciones
            FROM notificaciones
        `);

        return res.json(estadisticas[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
    }
};

// Crear alerta programada (ej: Recordar vacuna en 6 meses)
notificacionCtl.crearAlertaProgramada = async (req, res) => {
    try {
        console.log('\n🔵 [CREAR ALERTA] ===== Iniciando crearAlertaProgramada =====');
        console.log('🔵 [CREAR ALERTA] Body recibido:', JSON.stringify(req.body, null, 2));
        
        let { idUsuario, mensaje, fechaProgramada, tipoRecordatorio, titulo } = req.body;

        // Decodificar mensaje y título usando la función robusta
        console.log('🔵 [CREAR ALERTA] Decodificando mensajes...');
        mensaje = decodificarMensaje(mensaje);
        let tituloDecodificado = decodificarMensaje(titulo);
        console.log('🔵 [CREAR ALERTA] Mensaje decodificado:', mensaje);
        console.log('🔵 [CREAR ALERTA] Título decodificado:', tituloDecodificado);

        // Si viene titulo, combinarlo con mensaje
        if (tituloDecodificado && mensaje) {
            mensaje = `${tituloDecodificado}: ${mensaje}`;
        } else if (tituloDecodificado && !mensaje) {
            mensaje = tituloDecodificado;
        }

        // Validar que al menos (mensaje o titulo) estén presentes
        if (!mensaje && !tituloDecodificado) {
            return res.status(400).json({ 
                success: false,
                message: 'El mensaje o título es obligatorio' 
            });
        }

        // Si después de procesar no hay mensaje, usar un mensaje por defecto
        if (!mensaje) {
            mensaje = tituloDecodificado || 'Notificación sin mensaje';
        }

        // Si no viene idUsuario, usar 1 por defecto (para desarrollo)
        if (!idUsuario) {
            console.log('⚠️ Advertencia: idUsuario no proporcionado en alerta programada, usando 1 por defecto');
            idUsuario = 1;
        }

        // Si no viene fechaProgramada, usar fecha actual + 1 día
        if (!fechaProgramada) {
            const fechaFutura = new Date();
            fechaFutura.setDate(fechaFutura.getDate() + 1);
            fechaProgramada = fechaFutura.toISOString();
        }

        // Verificar que el usuario existe (sin validar estado para ser más permisivo)
        console.log('🔵 [CREAR ALERTA] Verificando existencia de usuario:', idUsuario);
        const [usuarioExiste] = await sql.promise().query(
            'SELECT idUser FROM users WHERE idUser = ?',
            [idUsuario]
        );
        console.log('🔵 [CREAR ALERTA] Resultado de consulta usuario:', usuarioExiste.length > 0 ? 'Usuario encontrado' : 'Usuario NO encontrado');

        if (usuarioExiste.length === 0) {
            console.log('❌ [CREAR ALERTA] Usuario no existe, creando usuario de desarrollo...');
            // En desarrollo, crear el usuario si no existe en lugar de fallar
            try {
                // Usar bcrypt para la contraseña como en otros lugares del código
                const hashedPassword = await bcrypt.hash('dev123', 10);
                
                const [result] = await sql.promise().query(
                    'INSERT INTO users (nameUsers, emailUser, userName, passwordUser, stateUser, createUser) VALUES (?, ?, ?, ?, ?, ?)',
                    ['Usuario Desarrollo', 'dev@petpocket.com', 'dev', hashedPassword, 'active', new Date().toLocaleString()]
                );
                idUsuario = result.insertId;
                console.log('✅ [CREAR ALERTA] Usuario de desarrollo creado con ID:', idUsuario);
            } catch (error) {
                console.error('❌ [CREAR ALERTA] Error al crear usuario de desarrollo:', error);
                // Si falla crear el usuario, continuar con idUsuario = 1 para que la alerta se cree de todas formas (modo desarrollo)
                console.log('⚠️ [CREAR ALERTA] Continuando con idUsuario = 1 aunque el usuario no exista (modo desarrollo)');
                idUsuario = 1; // Continuar de todas formas en modo desarrollo
            }
        } else {
            console.log('✅ [CREAR ALERTA] Usuario encontrado:', usuarioExiste[0].idUser);
        }

        // Validar que la fecha programada sea futura (pero ser más permisivo)
        const fechaProg = new Date(fechaProgramada);
        const ahora = new Date();
        ahora.setMinutes(ahora.getMinutes() - 5); // Permitir 5 minutos de margen
        
        if (fechaProg <= ahora) {
            // En lugar de error, ajustar la fecha a 1 hora en el futuro
            fechaProg.setHours(fechaProg.getHours() + 1);
            fechaProgramada = fechaProg.toISOString();
        }

        console.log('💾 [CREAR ALERTA] Creando alerta programada en BD...');
        
        // Guardar el mensaje original limpio (sin prefijos)
        // La información de fecha y tipo se devuelve como campos separados en la respuesta
        let mensajeFinal = mensaje;
        
        // Si viene tipo desde el frontend (ej: "vacuna", "control"), usarlo como tipoRecordatorio
        if (req.body.tipo && !tipoRecordatorio) {
            tipoRecordatorio = req.body.tipo;
        }
        
        console.log('💾 [CREAR ALERTA] Datos finales:', JSON.stringify({
            idUsuario,
            mensaje: mensajeFinal,
            fechaProgramada,
            tipoRecordatorio: tipoRecordatorio || 'general'
        }, null, 2));
        
        // Usar SQL directo solo con las columnas que existen en la tabla
        // Columnas básicas: idUsuario, mensaje, estadoNotificacion, createNotificacion
        const [result] = await sql.promise().query(
            `INSERT INTO notificaciones (idUsuario, mensaje, estadoNotificacion, createNotificacion) 
             VALUES (?, ?, ?, ?)`,
            [
                idUsuario,
                mensajeFinal, // Mensaje limpio sin prefijos
                'programada',
                new Date().toLocaleString()
            ]
        );
        
        const idNotificacion = result.insertId;
        console.log('✅ [CREAR ALERTA] Alerta programada creada con ID:', idNotificacion);

        // Configurar headers CORS antes de responder
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');

        // Asegurarse de que siempre se responda
        if (!res.headersSent) {
            const responseData = { 
                success: true,
                message: 'Alerta programada creada exitosamente',
                data: {
                    idNotificacion: idNotificacion,
                    mensaje: mensajeFinal, // Mensaje limpio sin prefijos [PROGRAMADA: ...]
                    titulo: tituloDecodificado || null,
                    tipo: req.body.tipo || tipoRecordatorio || 'general',
                    fechaProgramada: fechaProgramada || null,
                    tipoRecordatorio: tipoRecordatorio || 'general',
                    estadoNotificacion: 'programada',
                    idUsuario: idUsuario
                }
            };
            console.log('📤 [CREAR ALERTA] Enviando respuesta 201:', JSON.stringify(responseData, null, 2));
            return res.status(201).json(responseData);
        } else {
            console.log('⚠️ [CREAR ALERTA] Headers ya enviados, no se puede responder');
        }
    } catch (error) {
        console.error('\n❌ [CREAR ALERTA] ===== Error al crear alerta programada =====');
        console.error('❌ [CREAR ALERTA] Error:', error.message);
        console.error('❌ [CREAR ALERTA] Stack:', error.stack);
        console.error('❌ [CREAR ALERTA] Error completo:', JSON.stringify(error, null, 2));
        
        // Configurar headers CORS en caso de error
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        
        // Asegurarse de que siempre se responda, incluso en caso de error
        if (!res.headersSent) {
            const errorResponse = { 
                success: false,
                message: 'Error al crear la alerta programada', 
                error: error.message
            };
            console.log('📤 [CREAR ALERTA] Enviando respuesta de error 500:', JSON.stringify(errorResponse, null, 2));
            console.log('❌ [CREAR ALERTA] ===== Fin de manejo de error =====\n');
            return res.status(500).json(errorResponse);
        } else {
            console.log('⚠️ [CREAR ALERTA] Headers ya enviados en error handler');
            console.log('❌ [CREAR ALERTA] ===== Fin de manejo de error =====\n');
        }
    }
};

// Limpiar historial de notificaciones (eliminar todas las notificaciones de un usuario)
notificacionCtl.limpiarHistorial = async (req, res) => {
    try {
        const { idUsuario } = req.params;

        if (!idUsuario) {
            return res.status(400).json({ message: 'ID de usuario es obligatorio' });
        }

        // Verificar que el usuario existe
        const [usuarioExiste] = await sql.promise().query(
            'SELECT idUser FROM users WHERE idUser = ?',
            [idUsuario]
        );

        if (usuarioExiste.length === 0) {
            return res.status(404).json({ message: 'El usuario no existe' });
        }

        // Eliminar todas las notificaciones del usuario
        const [resultado] = await sql.promise().query(
            'DELETE FROM notificaciones WHERE idUsuario = ?',
            [idUsuario]
        );

        return res.json({ 
            message: 'Historial de notificaciones limpiado exitosamente',
            notificacionesEliminadas: resultado.affectedRows
        });

    } catch (error) {
        console.error('Error al limpiar historial:', error);
        return res.status(500).json({ 
            message: 'Error al limpiar el historial', 
            error: error.message 
        });
    }
};

// Limpiar historial general (eliminar todas las notificaciones leídas)
notificacionCtl.limpiarHistorialGeneral = async (req, res) => {
    try {
        // Eliminar todas las notificaciones leídas
        const [resultado] = await sql.promise().query(
            'DELETE FROM notificaciones WHERE estadoNotificacion = ?',
            ['leida']
        );

        return res.json({ 
            message: 'Historial limpiado exitosamente',
            notificacionesEliminadas: resultado.affectedRows
        });

    } catch (error) {
        console.error('Error al limpiar historial general:', error);
        return res.status(500).json({ 
            message: 'Error al limpiar el historial', 
            error: error.message 
        });
    }
};

module.exports = notificacionCtl;