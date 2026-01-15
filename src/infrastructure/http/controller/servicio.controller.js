const path = require('path');
const fs = require('fs');
const orm = require('../../Database/dataBase.orm');
const sql = require('../../Database/dataBase.sql');
const mongo = require('../../Database/dataBaseMongose');

const servicioCtl = {};

// Función auxiliar para construir URL completa de imagen
const construirUrlImagen = (req, imagenUrl) => {
    if (!imagenUrl) return null;
    if (imagenUrl.startsWith('http')) return imagenUrl; 
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/servicios/${imagenUrl}`;
  };


  // =======================
  // LISTAR ADMIN
  // =======================
  servicioCtl.listarAdmin = async (req, res) => {
    try {
      // Usar consulta SQL directa para evitar problemas con columnas que no existen
      const [servicios] = await sql.promise().query(`
        SELECT 
          idServicio,
          nombreServicio,
          descripcionServicio,
          precioServicio,
          estadoServicio
        FROM servicios
        ORDER BY idServicio DESC
      `);

      // Obtener imágenes desde MongoDB si existen
      const serviciosConImagen = await Promise.all(servicios.map(async (s) => {
        try {
          const servicioMongo = await mongo.servicioModel.findOne({ 
            idServicioSql: s.idServicio.toString() 
          });
          return {
            idServicio: s.idServicio,
            nombreServicio: s.nombreServicio,
            descripcionServicio: s.descripcionServicio,
            precioServicio: s.precioServicio,
            estadoServicio: s.estadoServicio,
            imagen: construirUrlImagen(req, servicioMongo?.imagenUrl),
            citas: 0
          };
        } catch (error) {
          return {
            idServicio: s.idServicio,
            nombreServicio: s.nombreServicio,
            descripcionServicio: s.descripcionServicio,
            precioServicio: s.precioServicio,
            estadoServicio: s.estadoServicio,
            imagen: null,
            citas: 0
          };
        }
      }));

      res.json(serviciosConImagen);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al listar servicios' });
    }
  };

  // =======================
  // LISTAR PUBLICO
  // =======================
  servicioCtl.listarPublico = async (req, res) => {
    try {
      // Usar consulta SQL directa para evitar problemas con columnas que no existen
      const [servicios] = await sql.promise().query(`
        SELECT 
          idServicio,
          nombreServicio,
          descripcionServicio,
          precioServicio,
          estadoServicio
        FROM servicios
        WHERE estadoServicio = 'activo'
        ORDER BY idServicio DESC
      `);

      // Obtener imágenes desde MongoDB si existen
      const serviciosConImagen = await Promise.all(servicios.map(async (s) => {
        try {
          const servicioMongo = await mongo.servicioModel.findOne({ 
            idServicioSql: s.idServicio.toString() 
        });
        return {
          idServicio: s.idServicio,
          nombreServicio: s.nombreServicio,
          descripcionServicio: s.descripcionServicio,
          precioServicio: s.precioServicio,
          estadoServicio: s.estadoServicio,
          imagen: construirUrlImagen(req, servicioMongo?.imagenUrl)
        };
      } catch (error) {
        return {
          idServicio: s.idServicio,
          nombreServicio: s.nombreServicio,
          descripcionServicio: s.descripcionServicio,
          precioServicio: s.precioServicio,
          estadoServicio: s.estadoServicio,
          imagen: null
        };
      }
    }));

    res.json(serviciosConImagen);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al listar servicios públicos' });
  }
};

// =======================
// CREAR SERVICIO
// =======================
servicioCtl.crear = async (req, res) => {
  try {
    const { nombre, descripcion, precio, imagen } = req.body;
    let imagenUrl = null;

    // Si viene como archivo
    if (req.files && req.files.imagen) {
      const imagenFile = req.files.imagen;
      const uploadPath = path.join(__dirname, '../../../uploads/servicios', imagenFile.name);
      if (!fs.existsSync(path.dirname(uploadPath))) {
        fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      }
      await imagenFile.mv(uploadPath);
      imagenUrl = imagenFile.name;
    }

    // Si viene como URL externa
    if (!imagenUrl && imagen && imagen.startsWith('http')) {
      imagenUrl = imagen; // 🔹 guarda la URL directamente
    }

    // Insertar en MySQL (sin campo imagen, porque no existe en la tabla)
    const [resultado] = await sql.promise().query(`
      INSERT INTO servicios (nombreServicio, descripcionServicio, precioServicio, estadoServicio)
      VALUES (?, ?, ?, ?)
    `, [nombre, descripcion, precio, 'activo']);

    const idServicio = resultado.insertId;

    // Guardar en Mongo
    await mongo.servicioModel.create({
      idServicioSql: idServicio.toString(),
      descripcionExtendida: descripcion,
      imagenUrl: imagenUrl,
      requisitos: [],
      duracionMinutos: 0,
      equipoNecesario: [],
      instruccionesPrevias: '',
      instruccionesPosteriores: '',
      etiquetas: [],
      destacado: false
    });

    // Respuesta al frontend
    res.status(201).json({
      idServicio,
      nombreServicio: nombre,
      descripcionServicio: descripcion,
      precioServicio: precio,
      estadoServicio: 'activo',
      imagen: construirUrlImagen(req, imagenUrl)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear servicio', error: error.message });
  }
};


// =======================
// ACTUALIZAR SERVICIO
// =======================
servicioCtl.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, estadoServicio, imagen } = req.body;

    // 1️⃣ Verificar que el servicio existe en MySQL
    const [servicios] = await sql.promise().query(
      'SELECT * FROM servicios WHERE idServicio = ?',
      [id]
    );
    if (servicios.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // 2️⃣ Obtener imagen actual desde MongoDB
    let imagenUrl = null;
    try {
      const servicioMongo = await mongo.servicioModel.findOne({ idServicioSql: id.toString() });
      imagenUrl = servicioMongo?.imagenUrl || null;
    } catch (error) {
      console.error('Error al obtener imagen de MongoDB:', error);
    }

    // 3️⃣ Si viene como archivo
    if (req.files && req.files.imagen) {
      const imagenFile = req.files.imagen;
      const uploadPath = path.join(__dirname, '../../../uploads/servicios', imagenFile.name);
      if (!fs.existsSync(path.dirname(uploadPath))) {
        fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      }
      await imagenFile.mv(uploadPath);
      imagenUrl = imagenFile.name;
    }

    // 4️⃣ Si viene como URL externa en el body
    if (imagen && imagen.startsWith('http')) {
      imagenUrl = imagen; // 🔹 actualiza con la nueva URL enviada
    }

    // 5️⃣ Actualizar en MySQL
    await sql.promise().query(`
      UPDATE servicios 
      SET nombreServicio = ?, descripcionServicio = ?, precioServicio = ?, estadoServicio = ?
      WHERE idServicio = ?
    `, [nombre, descripcion, precio, estadoServicio, id]);

    // 6️⃣ Actualizar en MongoDB
    await mongo.servicioModel.updateOne(
      { idServicioSql: id.toString() },
      { $set: { descripcionExtendida: descripcion, imagenUrl: imagenUrl } }
    );

    // 7️⃣ Respuesta al frontend
    res.json({
      idServicio: parseInt(id),
      nombreServicio: nombre,
      descripcionServicio: descripcion,
      precioServicio: precio,
      estadoServicio,
      imagen: construirUrlImagen(req, imagenUrl)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar servicio', error: error.message });
  }
};


// =======================
// ELIMINAR SERVICIO
// =======================
servicioCtl.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await orm.servicio.destroy({ where: { idServicio: id } });
    await mongo.servicioModel.deleteOne({ idServicioSql: id });

    if (eliminado) res.json({ message: 'Servicio eliminado correctamente' });
    else res.status(404).json({ message: 'Servicio no encontrado' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar servicio', error: error.message });
  }
  
};
// =======================
// CAMBIAR ESTADO SERVICIO
// =======================
servicioCtl.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    let { estadoServicio } = req.body;

    console.log('ID:', id);
    console.log('BODY:', req.body);

    if (estadoServicio === undefined || estadoServicio === null) {
      return res.status(400).json({ message: 'estadoServicio es requerido' });
    }

    estadoServicio = estadoServicio.toLowerCase();

    // 1️⃣ Verificar existencia REAL
    const [servicio] = await sql.promise().query(
      'SELECT idServicio FROM servicios WHERE idServicio = ?',
      [id]
    );

    if (servicio.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // 2️⃣ Actualizar SIN affectedRows
    await sql.promise().query(
      'UPDATE servicios SET estadoServicio = ? WHERE idServicio = ?',
      [estadoServicio, id]
    );

    res.json({
      message: 'Estado actualizado correctamente',
      idServicio: Number(id),
      estadoServicio
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cambiar estado del servicio' });
  }
};


module.exports = servicioCtl;
