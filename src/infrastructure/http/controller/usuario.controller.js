const usuarioCtrl = {};
const orm = require('../../Database/dataBase.orm.js');
const { Op } = require('sequelize');
const sql = require('../../Database/dataBase.sql.js');
const { encrypt, decrypt } = require('../../../application/controller/encrypDates.js');
const bcrypt = require('bcrypt');

// Función para descifrar de forma segura
const descifrarSeguro = (dato) => {
    try {
        return dato ? decrypt(dato) : '';
    } catch (error) {
        console.error('Error al descifrar:', error);
        return '';
    }
};

// Mostrar todos los usuarios activos con sus roles
          usuarioCtrl.mostrarUsuarios = async (req, res) => {
  try {
    const usuarios = await orm.usuario.findAll({
      where: { stateUser: 'active' }
    });

    // Desencriptamos los datos antes de enviarlos
    const usuariosCompletos = usuarios.map(usuario => ({
      ...usuario.dataValues,
      nameUsers: decrypt(usuario.nameUsers),   // Desencriptamos el nombre
      phoneUser: decrypt(usuario.phoneUser),   // Desencriptamos teléfono
      emailUser: decrypt(usuario.emailUser),   // Desencriptamos email
      userName: decrypt(usuario.userName),     // Desencriptamos usuario
      passwordUser: '********', // Ocultar la contraseña
      roles: usuario.roles || 'Sin roles asignados'    // Si no tienes roles asignados
    }));

    return res.json(usuariosCompletos);
  } catch (error) {
    console.error('Error al mostrar usuarios:', error);
    return res.status(500).json({ message: 'Error al obtener los usuarios' });
  }
};

// Crear nuevo usuario
usuarioCtrl.crearUsuario = async (req, res) => {
    try {
        const { nameUsers, phoneUser, emailUser, userName, passwordUser, roles } = req.body;

        // Validación de campos requeridos
        if (!nameUsers || !emailUser || !userName || !passwordUser) {
            return res.status(400).json({ message: 'Nombre, email, usuario y contraseña son obligatorios' });
        }
                
        // Verificar si el usuario ya existe
        const usuarioExiste = await orm.usuario.findOne({
        where: {
        [Op.or]: [
           { userName: encrypt(userName) },
           { emailUser: encrypt(emailUser) }
          ]
         }
        });

if (usuarioExiste) {
  return res.status(400).json({
    message: 'Ya existe un usuario con este nombre de usuario o email'
  });
}


        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(passwordUser, 10);

        // Crear usuario en SQL
        const nuevoUsuario = await orm.usuario.create({
            nameUsers: encrypt(nameUsers),
            phoneUser: phoneUser? encrypt(phoneUser) : null,
            emailUser: encrypt(emailUser),
            userName: encrypt(userName),
            passwordUser: hashedPassword,
            stateUser: 'active',
            createUser: new Date().toLocaleString(),
            roles: roles,
        });


        return res.status(201).json({ 
            message: 'Usuario creado exitosamente',
            idUser: nuevoUsuario.idUser
        });

    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ 
            message: 'Error al crear el usuario', 
            error: error.message 
        });
    }
};

// Actualizar usuario
usuarioCtrl.actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nameUsers, phoneUser, emailUser, userName, passwordUser, roles } = req.body;

        // Validar campos básicos
        if (!nameUsers || !emailUser || !userName) {
            return res.status(400).json({ message: 'Nombre, email y usuario son obligatorios' });
        }

        // Verificar si existe el usuario
        const [usuarioExiste] = await sql.promise().query(
            'SELECT idUser FROM users WHERE idUser = ? AND stateUser = "active"',
            [id]
        );

        if (usuarioExiste.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si el nuevo userName o email ya existen (excluyendo el usuario actual)
        const [duplicado] = await sql.promise().query(
            'SELECT idUser FROM users WHERE (userName = ? OR emailUser = ?) AND idUser != ? AND stateUser = "active"',
            [encrypt(userName), encrypt(emailUser), id]
        );

        if (duplicado.length > 0) {
            return res.status(400).json({ message: 'Ya existe otro usuario con este nombre de usuario o email' });
        }

        // Preparar datos para actualizar
        let updateData = {
            nameUsers: encrypt(nameUsers),
            phoneUser: phoneUser? encrypt(phoneUser) : null,
            emailUser: encrypt(emailUser),
            userName: encrypt(userName),
            updateUser: new Date().toLocaleString()
        };

        // Si se proporciona nueva contraseña, encriptarla
        if (passwordUser) {
            updateData.passwordUser = await bcrypt.hash(passwordUser, 10);
        }

        // Actualizar usuario en SQL
        await sql.promise().query(
            `UPDATE users SET 
                nameUsers = ?, 
                phoneUser = ?, 
                emailUser = ?, 
                userName = ?, 
                passwordUser = ?,
                updateUser = ? 
             WHERE idUser = ?`,
            passwordUser ? 
                [updateData.nameUsers, updateData.phoneUser, updateData.emailUser, updateData.userName, updateData.passwordUser, updateData.updateUser, id] :
                [updateData.nameUsers, updateData.phoneUser, updateData.emailUser, updateData.userName, updateData.updateUser, id]
        );

        // Actualizar roles si se proporcionan
        if (roles && Array.isArray(roles)) {
            // Eliminar roles existentes
            await sql.promise().query(
                'DELETE FROM users WHERE idUser = ?',
                [id]
            );
            
            // Crear nuevas relaciones de roles
            for (const rolId of roles) {
                await orm.detalleRol.create({
                    idUser: id,
                    roleIdRol: rolId,
                    createDetalleRol: new Date().toLocaleString()
                });
            }
        }

        return res.json({ message: 'Usuario actualizado exitosamente' });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// Eliminar usuario
usuarioCtrl.eliminarUsuario = async (req, res) => {
  try {
    // Convertir id a número (asegurando que sea tipo entero)
    const { id } = req.params.id;
    const idUser = parseInt(id, 10); // Esto convierte el id a entero

    // Verificar si existe el usuario
    const usuario = await orm.usuario.findByPk(idUser);  // Usamos idNumber aquí

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar usuario
    await usuario.destroy();

    return res.json({
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// Obtener usuario por ID con sus roles
usuarioCtrl.obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [usuario] = await sql.promise().query(`
            SELECT u.* 
            FROM users u
            WHERE u.idUser = ? AND u.stateUser = "active"
        `, [id]);

        if (usuario.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener roles del usuario
        const [rolesUsuario] = await sql.promise().query(`
            SELECT r.*, dr.createDetalleRol
            FROM users dr
            JOIN roles r ON dr.roleIdRol = r.idRol
            WHERE dr.idUser = ? AND r.stateRol = 'activo'
        `, [id]);

        const usuarioCompleto = {
            ...usuario[0],
            nameUsers: decrypt(usuario[0].nameUsers),
            phoneUser: decrypt(usuario[0].phoneUser),
            emailUser: decrypt(usuario[0].emailUser),
            userName: decrypt(usuario[0].userName),
            // No incluir la contraseña
            passwordUser: '********', // Ocultar la contraseña
            roles: rolesUsuario.map(rol => ({
                ...rol,
                nameRol: decrypt(rol.nameRol),
                descriptionRol: decrypt(rol.descriptionRol)
            }))
        };

        return res.json(usuarioCompleto);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
};

// Buscar usuarios por término
usuarioCtrl.buscarUsuarios = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ message: 'Consulta debe tener al menos 2 caracteres' });
        }

        const [usuariosEncontrados] = await sql.promise().query(`
            SELECT u.*, GROUP_CONCAT(DISTINCT r.nameRol SEPARATOR ', ') as roles
            FROM users u
            LEFT JOIN userss dr ON u.idUser = dr.idUser
            LEFT JOIN roles r ON dr.roleIdRol = r.idRol AND r.stateRol = 'activo'
            WHERE u.stateUser = 'active' AND (
                u.nameUsers LIKE ? OR 
                u.emailUser LIKE ? OR 
                u.userName LIKE ?
            )
            GROUP BY u.idUser
            LIMIT 20
        `, [`%${q}%`, `%${q}%`, `%${q}%`]);

        const resultados = usuariosEncontrados.map(usuario => ({
            ...usuario,
            nameUsers: decrypt(usuario.nameUsers),
            phoneUser: decrypt(usuario.phoneUser),
            emailUser: decrypt(usuario.emailUser),
            userName: decrypt(usuario.userName),
            passwordUser: '********', // No mostrar la contraseña
            roles: usuario.roles || 'Sin roles'
        }));

        return res.json(resultados);
    } catch (error) {
        console.error('Error al buscar usuarios:', error);
        return res.status(500).json({ message: 'Error en la búsqueda', error: error.message });
    }
};

// Asignar rol a usuario
usuarioCtrl.asignarRol = async (req, res) => {
    try {
        const { usuarioId, rolId } = req.body;

        if (!usuarioId || !rolId) {
            return res.status(400).json({ message: 'Usuario y rol son obligatorios' });
        }

        // Verificar que el usuario y el rol existen
        const [usuario] = await sql.promise().query(
            'SELECT idUser FROM users WHERE idUser = ? AND stateUser = "active"',
            [usuarioId]
        );

        const [rol] = await sql.promise().query(
            'SELECT idRol FROM roles WHERE idRol = ? AND stateRol = "activo"',
            [rolId]
        );

        if (usuario.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (rol.length === 0) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Verificar si ya existe la relación
        const [relacionExiste] = await sql.promise().query(
            'SELECT idDetalleRol FROM users WHERE idUser = ? AND roleIdRol = ?',
            [usuarioId, rolId]
        );

        if (relacionExiste.length > 0) {
            return res.status(400).json({ message: 'El usuario ya tiene este rol asignado' });
        }

        // Crear nueva relación
        await orm.detalleRol.create({
            idUser: usuarioId,
            roleIdRol: rolId,
            createDetalleRol: new Date().toLocaleString()
        });

        return res.status(201).json({ message: 'Rol asignado exitosamente' });

    } catch (error) {
        console.error('Error al asignar rol:', error);
        return res.status(500).json({ message: 'Error al asignar rol', error: error.message });
    }
};

// Remover rol de usuario
usuarioCtrl.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Id de usuario requerido' });
    }

    // Verificar si el usuario existe
    const [usuario] = await sql.promise().query(
      'SELECT * FROM users WHERE idUser = ?',
      [id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Eliminar usuario
    await sql.promise().query('DELETE FROM users WHERE idUser = ?', [id]);

    return res.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message,
    });
  }
};

// Cambiar estado de usuario
usuarioCtrl.cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado || !['active', 'inactive', 'suspended'].includes(estado)) {
            return res.status(400).json({ message: 'Estado inválido. Use: active, inactive, suspended' });
        }

        await sql.promise().query(
            `UPDATE users SET 
                stateUser = ?, 
                updateUser = ? 
             WHERE idUser = ?`,
            [estado, new Date().toLocaleString(), id]
        );

        return res.json({ message: `Estado del usuario cambiado a ${estado} exitosamente` });

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        return res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
    }
};

// Obtener estadísticas de usuarios
usuarioCtrl.obtenerEstadisticas = async (req, res) => {
    try {
        const [estadisticas] = await sql.promise().query(`
            SELECT 
                COUNT(CASE WHEN stateUser = 'active' THEN 1 END) as usuariosActivos,
                COUNT(CASE WHEN stateUser = 'inactive' THEN 1 END) as usuariosInactivos,
                COUNT(CASE WHEN stateUser = 'suspended' THEN 1 END) as usuariosSuspendidos,
                COUNT(*) as totalUsuarios
            FROM users
        `);

        // Usuarios por rol
        const [usuariosPorRol] = await sql.promise().query(`
            SELECT r.nameRol, COUNT(dr.idUser) as cantidadUsuarios
            FROM roles r
            LEFT JOIN detallerols dr ON r.idRol = dr.roleIdRol
            LEFT JOIN users u ON dr.idUser = u.idUser AND u.stateUser = 'active'
            WHERE r.stateRol = 'activo'
            GROUP BY r.idRol, r.nameRol
            ORDER BY cantidadUsuarios DESC
        `);

        return res.json({
            estadisticas: estadisticas[0],
            usuariosPorRol: usuariosPorRol.map(item => ({
                ...item,
                nameRol: decrypt(item.nameRol)
            }))
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
    }
};

module.exports = usuarioCtrl;
