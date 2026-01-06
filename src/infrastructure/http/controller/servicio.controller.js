const path = require('path');
const fs = require('fs');
const orm = require('../../Database/dataBase.orm');
const mongo = require('../../Database/dataBaseMongose');

const servicioCtl = {};

// =======================
// LISTAR ADMIN
// =======================
servicioCtl.listarAdmin = async (req, res) => {
  try {
    const servicios = await orm.servicio.findAll({
      order: [['idServicio', 'DESC']],
      raw: true
    });

    const serviciosMapeados = servicios.map(s => ({
      idServicio: s.idServicio,
      nombreServicio: s.nombre,           // <-- mapeo
      descripcionServicio: s.descripcion, // <-- mapeo
      precioServicio: s.precio,           // <-- mapeo
      estadoServicio: s.estadoServicio,
      imagen: s.imagen,
      citas: s.citas || 0
    }));

    res.json(serviciosMapeados);
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
    const servicios = await orm.servicio.findAll({
      where: { estadoServicio: 'activo' },
      order: [['idServicio', 'DESC']],
      raw: true
    });

    const serviciosMapeados = servicios.map(s => ({
      idServicio: s.idServicio,
      nombreServicio: s.nombre,           // <-- mapeo
      descripcionServicio: s.descripcion, // <-- mapeo
      precioServicio: s.precio,           // <-- mapeo
      estadoServicio: s.estadoServicio,
      imagen: s.imagen
    }));

    res.json(serviciosMapeados);
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
    const { nombre, descripcion, precio } = req.body;
    let imagenUrl = null;

    if (req.files && req.files.imagen) {
      const imagen = req.files.imagen;
      const uploadPath = path.join(__dirname, '../../../uploads/servicios', imagen.name);

      if (!fs.existsSync(path.dirname(uploadPath))) fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      await imagen.mv(uploadPath);
      imagenUrl = imagen.name;
    }

    const nuevo = await orm.servicio.create({
      nombre,
      descripcion,   // <-- cambio correcto
      precio,
      estadoServicio: 'activo',
      imagen: imagenUrl
    });

    await mongo.servicioModel.create({
      idServicioSql: nuevo.idServicio,
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

    res.status(201).json({
      idServicio: nuevo.idServicio,
      nombreServicio: nuevo.nombre,
      descripcionServicio: nuevo.descripcion,
      precioServicio: nuevo.precio,
      estadoServicio: nuevo.estadoServicio,
      imagen: nuevo.imagen
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
    const { nombre, descripcion, precio, estadoServicio } = req.body;

    const servicio = await orm.servicio.findByPk(id);
    if (!servicio) return res.status(404).json({ message: 'Servicio no encontrado' });

    let imagenUrl = servicio.imagen;
    if (req.files && req.files.imagen) {
      const imagen = req.files.imagen;
      const uploadPath = path.join(__dirname, '../../../uploads/servicios', imagen.name);
      if (!fs.existsSync(path.dirname(uploadPath))) fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      await imagen.mv(uploadPath);
      imagenUrl = imagen.name;
    }

    await orm.servicio.update(
      { nombre, descripcion, precio, estadoServicio, imagen: imagenUrl }, // <-- cambio correcto
      { where: { idServicio: id } }
    );

    await mongo.servicioModel.updateOne(
      { idServicioSql: id },
      { descripcionExtendida: descripcion, imagenUrl: imagenUrl }
    );

    res.json({
      idServicio: servicio.idServicio,
      nombreServicio: nombre,
      descripcionServicio: descripcion,
      precioServicio: precio,
      estadoServicio,
      imagen: imagenUrl
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

module.exports = servicioCtl;
