const notificacionCtl = {};
const orm = require('../../Database/dataBase.orm.js');
const sql = require('../../Database/dataBase.sql.js');
const { encrypt, decrypt } = require('../../../application/controller/encrypDates.js');

// Alias para mantener compatibilidad con el código existente
const cifrarDatos = encrypt;
const descifrarDatos = decrypt;

// Función para descifrar de forma segura
const descifrarSeguro = (dato) => {
    try {
        if (!dato) return '';
        // Si el dato ya está descifrado (no es un string cifrado), retornarlo tal cual
        if (typeof dato !== 'string' || dato.length < 10) {
            return dato;
        }
        return descifrarDatos(dato) || dato;
    } catch (error) {
        console.error('Error al descifrar:', error);
        // Si falla el descifrado, retornar el dato original
        return dato || '';
    }
};

// Mostrar todas las notificaciones
notificacionCtl.mostrarNotificaciones = async (req, res) => {
    try {
        console.log('[NOTIFICACIONES] Obteniendo todas las notificaciones');

        // Verificar conexión a la base de datos
        if (!sql || !sql.promise) {
            console.error('[NOTIFICACIONES] Error: Conexión a la base de datos no disponible');
            return res.status(500).json({
                success: false,
                message: 'Error de conexión a la base de datos',
                error: 'No se pudo establecer conexión con la base de datos',
                details: 'Verifica que la base de datos esté corriendo y configurada correctamente'
            });
        }

        let listaNotificaciones;
        try {
            [listaNotificaciones] = await sql.promise().query(`
                SELECT n.*, u.nameUsers, u.emailUser
                FROM notificaciones n
                JOIN users u ON n.idUsuario = u.idUser
                ORDER BY n.createNotificacion DESC
            `);
        } catch (queryError) {
            console.error('[NOTIFICACIONES] Error al ejecutar query:', queryError);
            return res.status(500).json({
                success: false,
                message: 'Error al consultar notificaciones',
                error: queryError.message,
                details: 'Error al ejecutar la consulta SQL',
                sqlError: queryError.code || 'UNKNOWN',
                sqlState: queryError.sqlState || 'UNKNOWN'
            });
        }

        console.log(`[NOTIFICACIONES] Notificaciones encontradas: ${(listaNotificaciones || []).length}`);

        const notificacionesCompletas = (listaNotificaciones || []).map(notificacion => {
            try {
                return {
                    ...notificacion,
                    nameUsers: descifrarSeguro(notificacion.nameUsers),
                    emailUser: descifrarSeguro(notificacion.emailUser),
                    leida: notificacion.estadoNotificacion === 'leida',
                    noLeida: notificacion.estadoNotificacion === 'pendiente' || notificacion.estadoNotificacion === 'programada'
                };
            } catch (mapError) {
                console.error('[NOTIFICACIONES] Error al procesar notificación:', mapError);
                return {
                    ...notificacion,
                    nameUsers: 'Error al descifrar',
                    emailUser: 'Error al descifrar',
                    leida: notificacion.estadoNotificacion === 'leida',
                    noLeida: notificacion.estadoNotificacion === 'pendiente' || notificacion.estadoNotificacion === 'programada'
                };
            }
        });

        // Retornar directamente el array para compatibilidad con frontend
        // El frontend espera un array directamente, no un objeto con {success, data}
        return res.json(notificacionesCompletas);
    } catch (error) {
        console.error('[NOTIFICACIONES] Error general al mostrar notificaciones:', error);
        console.error('[NOTIFICACIONES] Stack trace:', error.stack);
        return res.status(500).json({ 
            success: false,
            message: 'Error al obtener las notificaciones', 
            error: error.message,
            details: 'Error inesperado al procesar la solicitud',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Crear nueva notificación (compatible con frontend)
notificacionCtl.crearNotificacion = async (req, res) => {
    try {
        const { idUsuario, mensaje, tipo, titulo, fechaProgramada, tipoRecordatorio, idMascota } = req.body;

        console.log('[NOTIFICACIONES] Creando notificación:', { idUsuario, titulo, mensaje, tipo, fechaProgramada, tipoRecordatorio, idMascota });

        // Obtener idUsuario de la sesión si no viene en el body
        let usuarioId = idUsuario;
        if (!usuarioId && req.user && req.user.idUser) {
            usuarioId = req.user.idUser;
            console.log('[NOTIFICACIONES] Usando idUsuario de sesión:', usuarioId);
        }

        // Si aún no hay idUsuario, usar un valor por defecto
        if (!usuarioId) {
            usuarioId = 1;
            console.warn('[NOTIFICACIONES] No se proporcionó idUsuario, usando valor por defecto:', usuarioId);
            console.warn('[NOTIFICACIONES] En producción, asegúrate de enviar idUsuario o tener sesión activa');
        }

        if (!mensaje) {
            console.error('[NOTIFICACIONES] Error: mensaje vacío');
            return res.status(400).json({ 
                success: false,
                message: 'El mensaje es obligatorio',
                error: 'El campo mensaje no puede estar vacío'
            });
        }

        console.log('[NOTIFICACIONES] Verificando existencia del usuario:', usuarioId);

        // Verificar que el usuario existe
        let usuarioExiste;
        try {
            [usuarioExiste] = await sql.promise().query(
                'SELECT idUser, stateUser, nameUsers FROM users WHERE idUser = ?',
                [usuarioId]
            );
            console.log('[NOTIFICACIONES] Resultado de consulta usuario:', usuarioExiste);
        } catch (dbError) {
            console.error('[NOTIFICACIONES] Error al consultar usuario:', dbError);
            console.error('[NOTIFICACIONES] Error completo:', JSON.stringify(dbError, null, 2));
            return res.status(500).json({
                success: false,
                message: 'Error al verificar el usuario',
                error: dbError.message,
                details: 'Error al ejecutar consulta en la base de datos',
                sqlError: dbError.code || 'UNKNOWN'
            });
        }

        if (usuarioExiste.length === 0) {
            console.error(`[NOTIFICACIONES] Usuario con ID ${usuarioId} no existe en la base de datos`);
            // Intentar obtener el primer usuario activo disponible
            try {
                const [usuariosActivos] = await sql.promise().query(
                    'SELECT idUser FROM users WHERE stateUser = "active" LIMIT 1'
                );
                console.log('[NOTIFICACIONES] Usuarios activos encontrados:', usuariosActivos);
                if (usuariosActivos.length > 0) {
                    const nuevoUsuarioId = usuariosActivos[0].idUser;
                    console.warn(`[NOTIFICACIONES] Usando primer usuario activo encontrado: ${nuevoUsuarioId}`);
                    usuarioId = nuevoUsuarioId;
                    // Actualizar la consulta con el nuevo usuario
                    [usuarioExiste] = await sql.promise().query(
                        'SELECT idUser, stateUser FROM users WHERE idUser = ?',
                        [usuarioId]
                    );
                } else {
                    console.error('[NOTIFICACIONES] No hay usuarios activos en la base de datos');
                    return res.status(404).json({ 
                        success: false,
                        message: 'No hay usuarios disponibles',
                        error: `El usuario con ID ${usuarioId} no existe y no hay usuarios activos en el sistema`,
                        details: 'Por favor, crea un usuario primero o verifica la base de datos'
                    });
                }
            } catch (fallbackError) {
                console.error('[NOTIFICACIONES] Error al buscar usuario activo alternativo:', fallbackError);
                return res.status(404).json({ 
                    success: false,
                    message: 'El usuario no existe',
                    error: `No existe un usuario con ID: ${usuarioId}`,
                    details: 'Por favor, verifica que el usuario exista en la base de datos'
                });
            }
        } else if (usuarioExiste[0].stateUser !== 'active') {
            console.warn(`[NOTIFICACIONES] Usuario ${usuarioId} existe pero está inactivo (state: ${usuarioExiste[0].stateUser})`);
            // Intentar obtener un usuario activo alternativo
            try {
                const [usuariosActivos] = await sql.promise().query(
                    'SELECT idUser FROM users WHERE stateUser = "active" LIMIT 1'
                );
                console.log('[NOTIFICACIONES] Usuarios activos encontrados:', usuariosActivos);
                if (usuariosActivos.length > 0) {
                    usuarioId = usuariosActivos[0].idUser;
                    console.warn(`[NOTIFICACIONES] Usuario original inactivo, usando usuario activo: ${usuarioId}`);
                    // Actualizar la consulta con el nuevo usuario
                    [usuarioExiste] = await sql.promise().query(
                        'SELECT idUser, stateUser FROM users WHERE idUser = ?',
                        [usuarioId]
                    );
                } else {
                    console.error('[NOTIFICACIONES] No hay usuarios activos disponibles');
                    return res.status(404).json({ 
                        success: false,
                        message: 'El usuario está inactivo',
                        error: `El usuario con ID ${usuarioId} existe pero está inactivo`,
                        details: 'No hay usuarios activos disponibles en el sistema'
                    });
                }
            } catch (fallbackError) {
                console.error('[NOTIFICACIONES] Error al buscar usuario activo alternativo:', fallbackError);
                return res.status(404).json({ 
                    success: false,
                    message: 'El usuario está inactivo',
                    error: `El usuario con ID ${usuarioId} existe pero su estado es: ${usuarioExiste[0].stateUser}`,
                    details: 'El usuario debe estar activo para crear notificaciones'
                });
            }
        }

        console.log('[NOTIFICACIONES] Usuario válido confirmado:', usuarioId);

        // Determinar tipo y estado
        const tipoNotificacion = tipo || 'recordatorio';
        const tieneFecha = fechaProgramada && new Date(fechaProgramada).getTime() > Date.now();
        const estadoNotificacion = tieneFecha ? 'programada' : 'pendiente';

        console.log('[NOTIFICACIONES] Datos de la notificación a crear:', {
            usuarioId,
            titulo,
            mensaje,
            tipoNotificacion,
            estadoNotificacion,
            idMascota,
            fechaProgramada: fechaProgramada || 'sin fecha',
            tipoRecordatorio: tipoRecordatorio || 'sin tipo recordatorio'
        });

        // Preparar datos para crear
        // Solo insertar los campos que existen en la tabla notificaciones
        const datosNotificacion = {
            idUsuario: usuarioId,
            mensaje: mensaje,              // Solo el mensaje
            estadoNotificacion: estadoNotificacion,
            createNotificacion: new Date().toLocaleString(),
        };

        console.log('[NOTIFICACIONES] Datos finales que se insertarán:', JSON.stringify(datosNotificacion, null, 2));

        console.log('[NOTIFICACIONES] Intentando crear notificación con ORM...');
        let nuevaNotificacion;
        try {
            nuevaNotificacion = await orm.notificacion.create(datosNotificacion);
            console.log('[NOTIFICACIONES] Notificación creada exitosamente en BD:', nuevaNotificacion.idNotificacion);
        } catch (createError) {
            console.error('[NOTIFICACIONES] Error al crear notificación con ORM:', createError);
            console.error('[NOTIFICACIONES] Error completo:', JSON.stringify(createError, null, 2));
            return res.status(500).json({
                success: false,
                message: 'Error al crear la notificación en la base de datos',
                error: createError.message,
                details: 'Error al insertar la notificación. Verifica que la tabla notificaciones exista y tenga la estructura correcta.',
                sqlError: createError.original?.sqlMessage || createError.message
            });
        }

        return res.status(201).json({ 
            success: true,
            message: estadoNotificacion === 'programada' ? 'Alerta programada creada exitosamente' : 'Notificación creada exitosamente',
            data: {
                idNotificacion: nuevaNotificacion.idNotificacion,
                titulo: titulo,
                tipo: tipoNotificacion,
                estado: estadoNotificacion,
                usuarioId: usuarioId,
                idMascota: idMascota
            }
        });

    } catch (error) {
        console.error('[NOTIFICACIONES] Error al crear notificación:', error);
        console.error('[NOTIFICACIONES] Stack:', error.stack);
        return res.status(500).json({ 
            success: false,
            message: 'Error al crear la notificación', 
            error: error.message,
            details: 'Error inesperado al procesar la solicitud'
        });
    }
};

// Obtener notificaciones por usuario (bandeja de notificaciones leídas/no leídas)
notificacionCtl.obtenerNotificacionesPorUsuario = async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const { estado } = req.query;

        console.log(`[NOTIFICACIONES] Obteniendo notificaciones para usuario: ${idUsuario}, estado: ${estado || 'todos'}`);

        // Validar que idUsuario sea un número
        if (!idUsuario || isNaN(idUsuario)) {
            console.error(`[NOTIFICACIONES] ID de usuario inválido: ${idUsuario}`);
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido',
                error: 'El ID de usuario debe ser un número válido',
                details: `ID recibido: ${idUsuario}`
            });
        }

        // Verificar conexión a la base de datos
        if (!sql || !sql.promise) {
            console.error('[NOTIFICACIONES] Error: Conexión a la base de datos no disponible');
            return res.status(500).json({
                success: false,
                message: 'Error de conexión a la base de datos',
                error: 'No se pudo establecer conexión con la base de datos',
                details: 'Verifica que la base de datos esté corriendo y configurada correctamente'
            });
        }

        // Verificar que el usuario existe
        let usuarioExiste;
        try {
            [usuarioExiste] = await sql.promise().query(
                'SELECT idUser FROM users WHERE idUser = ?',
                [idUsuario]
            );
        } catch (dbError) {
            console.error('[NOTIFICACIONES] Error al consultar usuario:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar el usuario',
                error: dbError.message,
                details: 'Error al ejecutar consulta en la base de datos',
                sqlError: dbError.code || 'UNKNOWN'
            });
        }

        if (usuarioExiste.length === 0) {
            console.warn(`[NOTIFICACIONES] Usuario ${idUsuario} no encontrado`);
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
                error: `No existe un usuario con ID: ${idUsuario}`,
                details: 'Verifica que el ID del usuario sea correcto'
            });
        }

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

        console.log(`[NOTIFICACIONES] Ejecutando query: ${query.substring(0, 100)}...`);
        
        let notificacionesUsuario;
        try {
            [notificacionesUsuario] = await sql.promise().query(query, params);
        } catch (queryError) {
            console.error('[NOTIFICACIONES] Error al ejecutar query de notificaciones:', queryError);
            return res.status(500).json({
                success: false,
                message: 'Error al consultar notificaciones',
                error: queryError.message,
                details: 'Error al ejecutar la consulta SQL',
                sqlError: queryError.code || 'UNKNOWN',
                sqlState: queryError.sqlState || 'UNKNOWN'
            });
        }

        console.log(`[NOTIFICACIONES] Notificaciones encontradas: ${notificacionesUsuario.length}`);

        const notificacionesCompletas = (notificacionesUsuario || []).map(notificacion => {
            try {
                return {
                    ...notificacion,
                    nameUsers: descifrarSeguro(notificacion.nameUsers),
                    leida: notificacion.estadoNotificacion === 'leida',
                    noLeida: notificacion.estadoNotificacion === 'pendiente' || notificacion.estadoNotificacion === 'programada'
                };
            } catch (mapError) {
                console.error('[NOTIFICACIONES] Error al procesar notificación:', mapError);
                return {
                    ...notificacion,
                    nameUsers: 'Error al descifrar',
                    leida: notificacion.estadoNotificacion === 'leida',
                    noLeida: notificacion.estadoNotificacion === 'pendiente' || notificacion.estadoNotificacion === 'programada'
                };
            }
        });

        // Separar en leídas y no leídas para facilitar el frontend
        const leidas = notificacionesCompletas.filter(n => n.leida);
        const noLeidas = notificacionesCompletas.filter(n => n.noLeida);

        console.log(`[NOTIFICACIONES] Respuesta exitosa - Total: ${notificacionesCompletas.length}, Leídas: ${leidas.length}, No leídas: ${noLeidas.length}`);

        return res.json({
            success: true,
            data: {
                todas: notificacionesCompletas,
                leidas: leidas,
                noLeidas: noLeidas,
                total: notificacionesCompletas.length,
                totalLeidas: leidas.length,
                totalNoLeidas: noLeidas.length
            }
        });
    } catch (error) {
        console.error('[NOTIFICACIONES] Error general al obtener notificaciones por usuario:', error);
        console.error('[NOTIFICACIONES] Stack trace:', error.stack);
        return res.status(500).json({ 
            success: false,
            message: 'Error al obtener notificaciones',
            error: error.message,
            details: 'Error inesperado al procesar la solicitud',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Marcar notificación como leída
notificacionCtl.marcarComoLeida = async (req, res) => {
    try {
        const { idNotificacion } = req.params;

        await sql.promise().query(
            `UPDATE notificaciones SET 
                estadoNotificacion = 'leida',
                updateNotificacion = ? 
             WHERE idNotificacion = ?`,
            [new Date().toLocaleString(), idNotificacion]
        );

        return res.json({ 
            success: true,
            message: 'Notificación marcada como leída' 
        });

    } catch (error) {
        console.error('Error al marcar como leída:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error al actualizar', 
            error: error.message 
        });
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

        return res.json({ 
            success: true,
            message: 'Todas las notificaciones marcadas como leídas' 
        });

    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error al actualizar', 
            error: error.message 
        });
    }
};

// Eliminar notificación
notificacionCtl.eliminarNotificacion = async (req, res) => {
    try {
        // Intentar obtener idNotificacion de params, body o query
        let idNotificacion = req.params.idNotificacion || req.body.idNotificacion || req.query.idNotificacion;

        console.log('[NOTIFICACIONES] Eliminando notificación');
        console.log('[NOTIFICACIONES] Params:', req.params);
        console.log('[NOTIFICACIONES] Body:', req.body);
        console.log('[NOTIFICACIONES] Query:', req.query);
        console.log('[NOTIFICACIONES] ID obtenido:', idNotificacion);

        // Validar que el ID existe y es válido
        if (!idNotificacion || idNotificacion === 'undefined' || idNotificacion === 'null' || idNotificacion === undefined || idNotificacion === null) {
            console.error('[NOTIFICACIONES] ID de notificación inválido o no proporcionado:', idNotificacion);
            return res.status(400).json({
                success: false,
                message: 'ID de notificación inválido',
                error: 'El ID de notificación es requerido y debe ser un número válido',
                details: `ID recibido: ${idNotificacion}. Verifica que el ID se esté enviando correctamente desde el frontend.`
            });
        }

        // Validar que sea un número
        const idNum = parseInt(idNotificacion);
        if (isNaN(idNum) || idNum < 1) {
            console.error('[NOTIFICACIONES] ID de notificación no es un número válido:', idNotificacion);
            return res.status(400).json({
                success: false,
                message: 'ID de notificación inválido',
                error: 'El ID de notificación debe ser un número entero positivo',
                details: `ID recibido: ${idNotificacion}`
            });
        }

        // Verificar que la notificación existe antes de intentar eliminarla
        console.log('[NOTIFICACIONES] Verificando existencia de notificación:', idNum);
        let notificacionExiste;
        try {
            [notificacionExiste] = await sql.promise().query(
                'SELECT idNotificacion, idUsuario FROM notificaciones WHERE idNotificacion = ?',
                [idNum]
            );
            console.log('[NOTIFICACIONES] Resultado de verificación:', notificacionExiste);
        } catch (dbError) {
            console.error('[NOTIFICACIONES] Error al verificar notificación:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar la notificación',
                error: dbError.message,
                details: 'Error al ejecutar consulta en la base de datos',
                sqlError: dbError.code || 'UNKNOWN'
            });
        }

        if (notificacionExiste.length === 0) {
            console.warn(`[NOTIFICACIONES] Notificación con ID ${idNum} no existe`);
            return res.status(404).json({
                success: false,
                message: 'Notificación no encontrada',
                error: `No existe una notificación con ID: ${idNum}`,
                details: 'Verifica que el ID de la notificación sea correcto'
            });
        }

        console.log('[NOTIFICACIONES] Notificación encontrada, procediendo a eliminar...');

        // Eliminar la notificación
        try {
            const [resultado] = await sql.promise().query(
                'DELETE FROM notificaciones WHERE idNotificacion = ?',
                [idNum]
            );

            console.log('[NOTIFICACIONES] Notificación eliminada exitosamente. Filas afectadas:', resultado.affectedRows);

            if (resultado.affectedRows === 0) {
                console.warn('[NOTIFICACIONES] No se eliminó ninguna fila (posiblemente ya fue eliminada)');
                return res.status(404).json({
                    success: false,
                    message: 'Notificación no encontrada',
                    error: 'La notificación no pudo ser eliminada. Puede que ya haya sido eliminada.',
                    details: `ID: ${idNum}`
                });
            }

            return res.json({
                success: true,
                message: 'Notificación eliminada exitosamente',
                data: {
                    idNotificacion: idNum,
                    eliminada: true
                }
            });
        } catch (deleteError) {
            console.error('[NOTIFICACIONES] Error al ejecutar DELETE:', deleteError);
            console.error('[NOTIFICACIONES] Error completo:', JSON.stringify(deleteError, null, 2));
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar la notificación',
                error: deleteError.message,
                details: 'Error al ejecutar la consulta DELETE en la base de datos',
                sqlError: deleteError.code || 'UNKNOWN'
            });
        }

    } catch (error) {
        console.error('[NOTIFICACIONES] Error general al eliminar notificación:', error);
        console.error('[NOTIFICACIONES] Stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la notificación',
            error: error.message,
            details: 'Error inesperado al procesar la solicitud',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Crear notificaciones masivas
notificacionCtl.crearNotificacionMasiva = async (req, res) => {
    try {
        const { mensaje, tipo, usuarios } = req.body;

        if (!mensaje || !usuarios || !Array.isArray(usuarios)) {
            return res.status(400).json({ 
                success: false,
                message: 'Mensaje y array de usuarios son obligatorios' 
            });
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
            success: true,
            message: `${notificacionesCreadas} notificaciones creadas exitosamente`,
            data: {
                notificacionesCreadas: notificacionesCreadas,
                totalSolicitadas: usuarios.length
            }
        });

    } catch (error) {
        console.error('Error al crear notificaciones masivas:', error);
        return res.status(500).json({ 
            success: false,
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

        return res.json({
            success: true,
            data: estadisticas[0]
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error al obtener estadísticas', 
            error: error.message 
        });
    }
};

// Crear alerta programada (ej: Recordar vacuna en 6 meses) - fechaProgramada es opcional
notificacionCtl.crearAlertaProgramada = async (req, res) => {
    try {
        const { idUsuario, mensaje, fechaProgramada, tipoRecordatorio, tipo, titulo } = req.body;

        console.log('[NOTIFICACIONES] Creando alerta programada:', { idUsuario, mensaje, fechaProgramada, tipoRecordatorio, tipo, titulo });

        // Validar campos obligatorios
        if (!idUsuario || !mensaje) {
            console.error('[NOTIFICACIONES] Faltan campos obligatorios');
            return res.status(400).json({ 
                success: false,
                message: 'Campos obligatorios faltantes',
                error: 'Usuario y mensaje son obligatorios',
                details: {
                    idUsuario: idUsuario ? 'OK' : 'FALTANTE',
                    mensaje: mensaje ? 'OK' : 'FALTANTE',
                    fechaProgramada: fechaProgramada ? 'OK' : 'OPCIONAL'
                }
            });
        }

        // Si hay fechaProgramada, validarla
        let fechaProg = null;
        if (fechaProgramada) {
            fechaProg = new Date(fechaProgramada);
            if (isNaN(fechaProg.getTime())) {
                console.error('[NOTIFICACIONES] Fecha inválida:', fechaProgramada);
                return res.status(400).json({
                    success: false,
                    message: 'Fecha inválida',
                    error: 'La fecha programada no tiene un formato válido',
                    details: `Fecha recibida: ${fechaProgramada}. Use formato ISO 8601 (ej: 2024-07-01T00:00:00.000Z)`
                });
            }

            // Validar que la fecha programada sea futura
            const ahora = new Date();
            if (fechaProg <= ahora) {
                console.error('[NOTIFICACIONES] Fecha no es futura:', fechaProgramada);
                return res.status(400).json({ 
                    success: false,
                    message: 'La fecha programada debe ser futura',
                    error: 'La fecha debe ser posterior a la fecha actual',
                    details: `Fecha recibida: ${fechaProgramada}, Fecha actual: ${ahora.toISOString()}`
                });
            }
        }

        // Verificar conexión a la base de datos
        if (!sql || !sql.promise) {
            console.error('[NOTIFICACIONES] Error: Conexión a la base de datos no disponible');
            return res.status(500).json({
                success: false,
                message: 'Error de conexión a la base de datos',
                error: 'No se pudo establecer conexión con la base de datos'
            });
        }

        // Verificar que el usuario existe
        let usuarioExiste;
        try {
            [usuarioExiste] = await sql.promise().query(
                'SELECT idUser FROM users WHERE idUser = ? AND stateUser = "active"',
                [idUsuario]
            );
        } catch (dbError) {
            console.error('[NOTIFICACIONES] Error al consultar usuario:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar el usuario',
                error: dbError.message,
                details: 'Error al ejecutar consulta en la base de datos',
                sqlError: dbError.code || 'UNKNOWN'
            });
        }

        if (usuarioExiste.length === 0) {
            console.warn(`[NOTIFICACIONES] Usuario ${idUsuario} no encontrado o inactivo`);
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado o inactivo',
                error: `No existe un usuario activo con ID: ${idUsuario}`,
                details: 'Verifica que el ID del usuario sea correcto y que el usuario esté activo'
            });
        }

        // Determinar el mensaje completo (incluye título si existe)
        const mensajeCompleto = titulo ? `${titulo}: ${mensaje}` : mensaje;

        // Crear la alerta - si hay fechaProgramada es programada, sino es pendiente
        let nuevaAlerta;
        try {
            const datosNotificacion = {
                idUsuario: idUsuario,
                mensaje: mensajeCompleto,
                tipo: tipo || 'recordatorio',
                estadoNotificacion: fechaProg ? 'programada' : 'pendiente',
                createNotificacion: new Date().toLocaleString(),
            };

            // Solo agregar fechaProgramada si existe
            if (fechaProg) {
                datosNotificacion.fechaProgramada = fechaProgramada;
            }

            // Solo agregar tipoRecordatorio si existe
            if (tipoRecordatorio) {
                datosNotificacion.tipoRecordatorio = tipoRecordatorio;
            }

            nuevaAlerta = await orm.notificacion.create(datosNotificacion);
            console.log('[NOTIFICACIONES] Alerta creada exitosamente:', nuevaAlerta.idNotificacion);
        } catch (createError) {
            console.error('[NOTIFICACIONES] Error al crear alerta:', createError);
            return res.status(500).json({
                success: false,
                message: 'Error al crear la alerta',
                error: createError.message,
                details: 'Error al insertar la notificación en la base de datos',
                sqlError: createError.code || 'UNKNOWN'
            });
        }

        return res.status(201).json({ 
            success: true,
            message: fechaProg ? 'Alerta programada creada exitosamente' : 'Notificación creada exitosamente',
            data: {
                idNotificacion: nuevaAlerta.idNotificacion,
                fechaProgramada: fechaProg ? fechaProgramada : null,
                tipoRecordatorio: tipoRecordatorio || null,
                estado: fechaProg ? 'programada' : 'pendiente'
            }
        });

    } catch (error) {
        console.error('[NOTIFICACIONES] Error general al crear alerta programada:', error);
        console.error('[NOTIFICACIONES] Stack trace:', error.stack);
        return res.status(500).json({ 
            success: false,
            message: 'Error al crear la alerta programada', 
            error: error.message,
            details: 'Error inesperado al procesar la solicitud',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Obtener una notificación individual por ID (para modal/vista)
notificacionCtl.obtenerNotificacionPorId = async (req, res) => {
    try {
        const { idNotificacion } = req.params;

        if (!idNotificacion) {
            return res.status(400).json({ 
                success: false,
                message: 'ID de notificación es obligatorio' 
            });
        }

        const [notificaciones] = await sql.promise().query(`
            SELECT n.*, u.nameUsers, u.emailUser
            FROM notificaciones n
            JOIN users u ON n.idUsuario = u.idUser
            WHERE n.idNotificacion = ?
        `, [idNotificacion]);

        if (notificaciones.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Notificación no encontrada' 
            });
        }

        const notificacion = notificaciones[0];
        const notificacionCompleta = {
            ...notificacion,
            nameUsers: descifrarSeguro(notificacion.nameUsers),
            emailUser: descifrarSeguro(notificacion.emailUser),
            leida: notificacion.estadoNotificacion === 'leida',
            noLeida: notificacion.estadoNotificacion === 'pendiente' || notificacion.estadoNotificacion === 'programada'
        };

        return res.json({
            success: true,
            data: notificacionCompleta
        });

    } catch (error) {
        console.error('Error al obtener notificación por ID:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error al obtener la notificación', 
            error: error.message 
        });
    }
};

// Limpiar historial de notificaciones (eliminar todas las notificaciones de un usuario)
notificacionCtl.limpiarHistorial = async (req, res) => {
    try {
        // Intentar obtener idUsuario de params, body o query
        let idUsuario = req.params.idUsuario || req.body.idUsuario || req.query.idUsuario;

        console.log('[NOTIFICACIONES] Limpiando historial de notificaciones');
        console.log('[NOTIFICACIONES] Params:', req.params);
        console.log('[NOTIFICACIONES] Body:', req.body);
        console.log('[NOTIFICACIONES] Query:', req.query);
        console.log('[NOTIFICACIONES] ID usuario obtenido:', idUsuario);

        // Si no viene en params, intentar obtenerlo de la sesión o usar el usuario por defecto
        if (!idUsuario || idUsuario === 'undefined' || idUsuario === 'null' || idUsuario === undefined || idUsuario === null) {
            if (req.user && req.user.idUser) {
                idUsuario = req.user.idUser;
                console.log('[NOTIFICACIONES] Usando idUsuario de sesión:', idUsuario);
            } else {
                // Para desarrollo, intentar usar el primer usuario activo
                try {
                    const [usuariosActivos] = await sql.promise().query(
                        'SELECT idUser FROM users WHERE stateUser = "active" LIMIT 1'
                    );
                    if (usuariosActivos.length > 0) {
                        idUsuario = usuariosActivos[0].idUser;
                        console.warn('[NOTIFICACIONES] No se proporcionó idUsuario, usando primer usuario activo:', idUsuario);
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: 'ID de usuario es obligatorio',
                            error: 'No se proporcionó idUsuario y no hay usuarios activos disponibles',
                            details: 'Envia el idUsuario en los parámetros, body o query, o asegúrate de tener sesión activa'
                        });
                    }
                } catch (error) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID de usuario es obligatorio',
                        error: 'No se pudo obtener un usuario válido',
                        details: 'Envia el idUsuario en los parámetros, body o query'
                    });
                }
            }
        }

        // Validar que sea un número
        const idNum = parseInt(idUsuario);
        if (isNaN(idNum) || idNum < 1) {
            console.error('[NOTIFICACIONES] ID de usuario no es un número válido:', idUsuario);
            return res.status(400).json({
                success: false,
                message: 'ID de usuario inválido',
                error: 'El ID de usuario debe ser un número entero positivo',
                details: `ID recibido: ${idUsuario}`
            });
        }

        console.log('[NOTIFICACIONES] Verificando existencia del usuario:', idNum);

        // Verificar que el usuario existe
        let usuarioExiste;
        try {
            [usuarioExiste] = await sql.promise().query(
                'SELECT idUser, stateUser FROM users WHERE idUser = ?',
                [idNum]
            );
            console.log('[NOTIFICACIONES] Resultado de verificación usuario:', usuarioExiste);
        } catch (dbError) {
            console.error('[NOTIFICACIONES] Error al verificar usuario:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error al verificar el usuario',
                error: dbError.message,
                details: 'Error al ejecutar consulta en la base de datos',
                sqlError: dbError.code || 'UNKNOWN'
            });
        }

        if (usuarioExiste.length === 0) {
            console.warn(`[NOTIFICACIONES] Usuario con ID ${idNum} no existe`);
            return res.status(404).json({
                success: false,
                message: 'El usuario no existe',
                error: `No existe un usuario con ID: ${idNum}`,
                details: 'Verifica que el ID del usuario sea correcto'
            });
        }

        // Contar notificaciones antes de eliminar
        let notificacionesAntes;
        try {
            [notificacionesAntes] = await sql.promise().query(
                'SELECT COUNT(*) as total FROM notificaciones WHERE idUsuario = ?',
                [idNum]
            );
            const totalAntes = notificacionesAntes[0].total;
            console.log(`[NOTIFICACIONES] Notificaciones encontradas para usuario ${idNum}: ${totalAntes}`);
        } catch (countError) {
            console.error('[NOTIFICACIONES] Error al contar notificaciones:', countError);
        }

        console.log('[NOTIFICACIONES] Eliminando todas las notificaciones del usuario:', idNum);

        // Eliminar todas las notificaciones del usuario
        let resultado;
        try {
            [resultado] = await sql.promise().query(
                'DELETE FROM notificaciones WHERE idUsuario = ?',
                [idNum]
            );
            console.log('[NOTIFICACIONES] Historial limpiado exitosamente. Filas afectadas:', resultado.affectedRows);
        } catch (deleteError) {
            console.error('[NOTIFICACIONES] Error al ejecutar DELETE para limpiar historial:', deleteError);
            console.error('[NOTIFICACIONES] Error completo:', JSON.stringify(deleteError, null, 2));
            return res.status(500).json({
                success: false,
                message: 'Error al limpiar el historial',
                error: deleteError.message,
                details: 'Error al ejecutar la consulta DELETE en la base de datos',
                sqlError: deleteError.code || 'UNKNOWN'
            });
        }

        return res.json({
            success: true,
            message: 'Historial de notificaciones limpiado exitosamente',
            data: {
                idUsuario: idNum,
                notificacionesEliminadas: resultado.affectedRows
            }
        });

    } catch (error) {
        console.error('[NOTIFICACIONES] Error general al limpiar historial:', error);
        console.error('[NOTIFICACIONES] Stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Error al limpiar el historial',
            error: error.message,
            details: 'Error inesperado al procesar la solicitud',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = notificacionCtl;