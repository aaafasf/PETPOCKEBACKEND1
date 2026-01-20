const clienteCtl = {};
const orm = require('../../Database/dataBase.orm.js');
const sql = require('../../Database/dataBase.sql.js');
const mongo = require('../../Database/dataBaseMongose');
const { encrypt: cifrarDatos, decrypt: descifrarDatos} = require('../../../application/controller/encrypDates');

// Función para descifrar de forma segura
const descifrarSeguro = (dato) => {
  try {
    return dato ? descifrarDatos(dato) : '';
  } catch (error) {
    console.error('Error al descifrar:', error);
    return '';
  }
};

// Mostrar todos los clientes con datos desencriptados
clienteCtl.mostrarClientes = async (req, res) => {
    try {
        const [listaClientes] = await sql.promise().query('SELECT * FROM clientes WHERE stadoCliente = "activo"');
        
        const clientesCompletos = await Promise.all(
            listaClientes.map(async (cliente) => {
                // Obtener datos adicionales de MongoDB
                const clienteMongo = await mongo.clienteModel.findOne({ 
                    idClienteSql: cliente.idClientes 
                });

                return {
                    ...cliente,
                    cedulaCliente: descifrarSeguro(cliente.cedulaCliente),
                    nombreCliente: cliente.nombreCliente,
                    usernameCliente: descifrarSeguro(cliente.usernameCliente),
                    // La contraseña no se debería enviar desencriptada
                    detallesMongo: clienteMongo ? {
                        direccionCliente: descifrarSeguro(clienteMongo.direccionCliente),
                        telefonoCliente: descifrarSeguro(clienteMongo.telefonoCliente),
                        emailCliente: descifrarSeguro(clienteMongo.emailCliente),
                        tipoCliente: clienteMongo.tipoCliente
                    } : null
                };
            })
        );

        return res.json(clientesCompletos);
    } catch (error) {
        console.error('Error al mostrar clientes:', error);
        return res.status(500).json({ message: 'Error al obtener los clientes', error: error.message });
    }
};

// Crear nuevo cliente con encriptación
clienteCtl.crearCliente = async (req, res) => {
    try {
        const { cedulaCliente, nombreCliente, usernameCliente, passwordCliente, 
                direccionCliente, telefonoCliente, emailCliente, tipoCliente } = req.body;

        // Validación de campos requeridos
        if (!cedulaCliente || !nombreCliente || !usernameCliente || !passwordCliente) {
            return res.status(400).json({ message: 'Datos básicos del cliente son obligatorios' });
        }

        // Crear en SQL con datos encriptados
        const nuevoCliente = await orm.cliente.create({
            cedulaCliente: cifrarDatos(cedulaCliente),
            nombreCliente: cifrarDatos(nombreCliente),
            usernameCliente: cifrarDatos(usernameCliente),
            passwordCliente: cifrarDatos(passwordCliente), // En producción usa bcrypt para contraseñas
            stadoCliente: 'activo',
            createCliente: new Date().toLocaleString(),
        });

        // Crear en MongoDB con datos encriptados
        if (direccionCliente || telefonoCliente || emailCliente) {
            await mongo.clienteModel.create({
                direccionCliente: cifrarDatos(direccionCliente || ''),
                telefonoCliente: cifrarDatos(telefonoCliente || ''),
                emailCliente: cifrarDatos(emailCliente || ''),
                tipoCliente: tipoCliente || 'Regular',
                idClienteSql: nuevoCliente.idClientes
            });
        }

        return res.status(201).json({ 
            message: 'Cliente creado exitosamente',
            idCliente: nuevoCliente.idClientes
        });

    } catch (error) {
        console.error('Error al crear cliente:', error);
        return res.status(500).json({ 
            message: 'Error al crear el cliente', 
            error: error.message 
        });
    }
};

// Actualizar cliente con encriptación
clienteCtl.actualizarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { cedulaCliente, nombreCliente, usernameCliente, 
                direccionCliente, telefonoCliente, emailCliente } = req.body;

        // Validar campos
        if (!cedulaCliente || !nombreCliente || !usernameCliente) {
            return res.status(400).json({ message: 'Datos básicos son obligatorios' });
        }

        // Actualizar en SQL (datos principales)
        await sql.promise().query(
            `UPDATE clientes SET 
                cedulaCliente = ?, 
                nombreCliente = ?, 
                usernameCliente = ?, 
                updateCliente = ? 
             WHERE idClientes = ?`,
            [
                cifrarDatos(cedulaCliente),
                cifrarDatos(nombreCliente),
                cifrarDatos(usernameCliente),
                new Date().toLocaleString(),
                id
            ]
        );

        // Actualizar en MongoDB (datos adicionales)
        if (direccionCliente || telefonoCliente || emailCliente) {
            await mongo.clienteModel.updateOne(
                { idClienteSql: id },
                {
                    $set: {
                        direccionCliente: cifrarDatos(direccionCliente || ''),
                        telefonoCliente: cifrarDatos(telefonoCliente || ''),
                        emailCliente: cifrarDatos(emailCliente || ''),
                    }
                }
            );
        }

        return res.json({ message: 'Cliente actualizado exitosamente' });

    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// Eliminar (desactivar) cliente
clienteCtl.eliminarCliente = async (req, res) => {
    try {
        const { id } = req.params;

        await sql.promise().query(
            `UPDATE clientes SET 
                stadoCliente = 'inactivo', 
                updateCliente = ? 
             WHERE idClientes = ?`,
            [new Date().toLocaleString(), id]
        );

        return res.json({ message: 'Cliente desactivado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        return res.status(500).json({ message: 'Error al desactivar', error: error.message });
    }
};

module.exports = clienteCtl;
