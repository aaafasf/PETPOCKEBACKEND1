const mascotaCtl = {};
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

// Mostrar todas las mascotas activas con datos híbridos
mascotaCtl.mostrarMascotas = async (req, res) => {  
    try {
        const [listaMascotas] = await sql.promise().query(`
            SELECT m.*, p.nombrePropietario, p.emailPropietario 
            FROM mascotas m
            JOIN propietarios p ON m.idPropietario = p.idPropietario
            ORDER BY m.createMascota DESC
        `);

        const mascotasCompletas = await Promise.all(
            listaMascotas.map(async (mascota) => {
                // Obtener datos adicionales de MongoDB
                const mascotaMongo = await mongo.mascotaModel.findOne({ 
                    idMascotaSql: mascota.idMascota.toString()
                });

                return {
                    ...mascota,
                    nombreMascota: descifrarSeguro(mascota.nombreMascota),
                    especie: descifrarSeguro(mascota.especie),
                    raza: descifrarSeguro(mascota.raza),
                    sexo: descifrarSeguro(mascota.sexo),
                    propietario: {
                        nombre: descifrarSeguro(mascota.nombrePropietario),
                        email: descifrarSeguro(mascota.emailPropietario)
                    },
                    detallesMongo: mascotaMongo ? {
                        observaciones: mascotaMongo.observaciones,
                        vacunas: mascotaMongo.vacunas,
                        pesoKg: mascotaMongo.pesoKg,
                        color: mascotaMongo.color,
                        razaDetallada: mascotaMongo.raza,
                        esterilizado: mascotaMongo.esterilizado,
                        alergias: mascotaMongo.alergias,
                        chipIdentificacion: mascotaMongo.chipIdentificacion,
                        ultimaVisita: mascotaMongo.ultimaVisita
                    } : null
                };
            })
        );

        return res.json(mascotasCompletas);
    } catch (error) {
        console.error('Error al mostrar mascotas:', error);
        return res.status(500).json({ message: 'Error al obtener las mascotas', error: error.message });
    }
};

// Crear nueva mascota
mascotaCtl.crearMascota = async (req, res) => {
    try {
        const { 
            nombreMascota, especie, raza, edad, sexo, idPropietario,
            observaciones, vacunas, pesoKg, color, esterilizado, alergias, chipIdentificacion 
        } = req.body;

        // Validación de campos requeridos
        if (!nombreMascota || !especie || !idPropietario) {
            return res.status(400).json({ message: 'Nombre, especie y propietario son obligatorios' });
        }

        // Crear en SQL con datos encriptados
        const nuevaMascota = await orm.mascota.create({
            nombreMascota: cifrarDatos(nombreMascota),
            especie: cifrarDatos(especie),
            raza: cifrarDatos(raza || ''),
            edad: edad || 0,
            sexo: cifrarDatos(sexo || ''),
            idPropietario: idPropietario,
            createMascota: new Date().toLocaleString(),
        });

        // Crear en MongoDB con datos adicionales
        await mongo.mascotaModel.create({
            idMascotaSql: nuevaMascota.idMascota.toString(),
            idPropietario: idPropietario.toString(),
            observaciones: observaciones || '',
            vacunas: vacunas || [],
            pesoKg: pesoKg || null,
            color: color || '',
            raza: raza || '',
            esterilizado: esterilizado || false,
            alergias: alergias || [],
            chipIdentificacion: chipIdentificacion || ''
        });

        return res.status(201).json({ 
            message: 'Mascota creada exitosamente',
            idMascota: nuevaMascota.idMascota
        });

    } catch (error) {
        console.error('Error al crear mascota:', error);
        return res.status(500).json({ 
            message: 'Error al crear la mascota', 
            error: error.message 
        });
    }
};

// Obtener mascotas por propietario
mascotaCtl.obtenerMascotasPorPropietario = async (req, res) => {
    try {
        const { idPropietario } = req.params;

        const [listaMascotas] = await sql.promise().query(`
            SELECT m.*, p.nombrePropietario, p.emailPropietario 
            FROM mascotas m
            JOIN propietarios p ON m.idPropietario = p.idPropietario
            WHERE m.idPropietario = ?
            ORDER BY m.createMascota DESC
        `, [idPropietario]);

        const mascotasCompletas = await Promise.all(
            listaMascotas.map(async (mascota) => {
                // Obtener datos adicionales de MongoDB
                const mascotaMongo = await mongo.mascotaModel.findOne({ 
                    idMascotaSql: mascota.idMascota.toString()
                });

                return {
                    ...mascota,
                    nombreMascota: descifrarSeguro(mascota.nombreMascota),
                    especie: descifrarSeguro(mascota.especie),
                    raza: descifrarSeguro(mascota.raza),
                    sexo: descifrarSeguro(mascota.sexo),
                    propietario: {
                        nombre: descifrarSeguro(mascota.nombrePropietario),
                        email: descifrarSeguro(mascota.emailPropietario)
                    },
                    detallesMongo: mascotaMongo ? {
                        observaciones: mascotaMongo.observaciones,
                        vacunas: mascotaMongo.vacunas,
                        pesoKg: mascotaMongo.pesoKg,
                        color: mascotaMongo.color,
                        razaDetallada: mascotaMongo.raza,
                        esterilizado: mascotaMongo.esterilizado,
                        alergias: mascotaMongo.alergias,
                        chipIdentificacion: mascotaMongo.chipIdentificacion,
                        ultimaVisita: mascotaMongo.ultimaVisita
                    } : null
                };
            })
        );

        return res.json(mascotasCompletas);
    } catch (error) {
        console.error('Error al obtener mascotas del propietario:', error);
        return res.status(500).json({ message: 'Error al obtener las mascotas', error: error.message });
    }
};

// Obtener una mascota por ID
mascotaCtl.obtenerMascotaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const [listaMascotas] = await sql.promise().query(`
            SELECT m.*, p.nombrePropietario, p.emailPropietario 
            FROM mascotas m
            JOIN propietarios p ON m.idPropietario = p.idPropietario
            WHERE m.idMascota = ?
        `, [id]);

        if (!listaMascotas || listaMascotas.length === 0) {
            return res.status(404).json({ message: 'Mascota no encontrada' });
        }

        const mascota = listaMascotas[0];

        // Obtener datos adicionales de MongoDB
        const mascotaMongo = await mongo.mascotaModel.findOne({ 
            idMascotaSql: mascota.idMascota.toString()
        });

        const mascotaCompleta = {
            ...mascota,
            nombreMascota: descifrarSeguro(mascota.nombreMascota),
            especie: descifrarSeguro(mascota.especie),
            raza: descifrarSeguro(mascota.raza),
            sexo: descifrarSeguro(mascota.sexo),
            propietario: {
                nombre: descifrarSeguro(mascota.nombrePropietario),
                email: descifrarSeguro(mascota.emailPropietario)
            },
            detallesMongo: mascotaMongo ? {
                observaciones: mascotaMongo.observaciones,
                vacunas: mascotaMongo.vacunas,
                pesoKg: mascotaMongo.pesoKg,
                color: mascotaMongo.color,
                razaDetallada: mascotaMongo.raza,
                esterilizado: mascotaMongo.esterilizado,
                alergias: mascotaMongo.alergias,
                chipIdentificacion: mascotaMongo.chipIdentificacion,
                ultimaVisita: mascotaMongo.ultimaVisita
            } : null
        };

        return res.json(mascotaCompleta);
    } catch (error) {
        console.error('Error al obtener mascota:', error);
        return res.status(500).json({ message: 'Error al obtener la mascota', error: error.message });
    }
};

// Actualizar mascota
mascotaCtl.actualizarMascota = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombreMascota, especie, raza, edad, sexo,
            observaciones, vacunas, pesoKg, color, esterilizado, alergias, chipIdentificacion 
        } = req.body;

        // Actualizar en SQL
        await sql.promise().query(
            `UPDATE mascotas SET 
                nombreMascota = ?, 
                especie = ?, 
                raza = ?, 
                edad = ?, 
                sexo = ?,
                updateMascota = ? 
             WHERE idMascota = ?`,
            [
                cifrarDatos(nombreMascota),
                cifrarDatos(especie),
                cifrarDatos(raza || ''),
                edad || 0,
                cifrarDatos(sexo || ''),
                new Date().toLocaleString(),
                id
            ]
        );

        // Actualizar en MongoDB
        await mongo.mascotaModel.updateOne(
            { idMascotaSql: id },
            {
                $set: {
                    observaciones: observaciones || '',
                    vacunas: vacunas || [],
                    pesoKg: pesoKg || null,
                    color: color || '',
                    raza: raza || '',
                    esterilizado: esterilizado || false,
                    alergias: alergias || [],
                    chipIdentificacion: chipIdentificacion || ''
                }
            },
            { upsert: true }
        );

        return res.json({ message: 'Mascota actualizada exitosamente' });

    } catch (error) {
        console.error('Error al actualizar mascota:', error);
        return res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// Eliminar mascota
mascotaCtl.eliminarMascota = async (req, res) => {
    try {
        const { id } = req.params;

        // Eliminar de MongoDB
        await mongo.mascotaModel.deleteOne({ idMascotaSql: id.toString() });

        // Eliminar de SQL
        await sql.promise().query('DELETE FROM mascotas WHERE idMascota = ?', [id]);

        return res.json({ message: 'Mascota eliminada exitosamente' });

    } catch (error) {
        console.error('Error al eliminar mascota:', error);
        return res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};

module.exports = mascotaCtl;