const path = require('path');
const fs = require('fs');
const orm = require('../../../infrastructure/Database/dataBase.orm');
const Configuracion = orm.configuracion;

const configuracionCtl = {};

// =======================
// OBTENER CONFIGURACIÓN
// =======================
configuracionCtl.obtenerConfiguracion = async (req, res) => {
  try {
    const config = await Configuracion.findOne({ raw: true });
    res.json(config || {});
  } catch (error) {
    console.error('Error en obtenerConfiguracion:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

// =======================
// LISTAR TODAS LAS CONFIGURACIONES
// =======================
configuracionCtl.listarConfiguraciones = async (req, res) => {
  try {
    const configs = await Configuracion.findAll({ raw: true });
    res.json(configs);
  } catch (error) {
    console.error('Error en listarConfiguraciones:', error);
    res.status(500).json({ message: 'Error al listar configuraciones' });
  }
};

// =======================
// GUARDAR O ACTUALIZAR CONFIGURACIÓN
// =======================
configuracionCtl.guardarConfiguracion = async (req, res) => {
  try {
    console.log('===== GUARDAR CONFIGURACION =====');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);

    // Copiar body y convertir objetos a strings para MySQL
    // Normalizar datos: aseguramos que sean strings o números
const data = {};
for (const key in req.body) {
  if (req.body.hasOwnProperty(key)) {
    let value = req.body[key];
    // Convertir números a enteros si es necesario
    if (key === 'horasMinimasCancelacion' || key === 'limiteMascotas') {
      value = parseInt(value) || 0;
    } else {
      value = value?.toString() || '';
    }
    data[key] = value;
  }
}

    // Manejo de archivo logo
    if (req.files && req.files.logo) {
      const logo = req.files.logo;
      console.log('Archivo recibido:', logo.name);
      const uploadPath = path.join(__dirname, '../../../uploads', logo.name);

      if (!fs.existsSync(path.dirname(uploadPath))) {
        fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      }

      await logo.mv(uploadPath);
      data.logo = logo.name;
    }

    // Revisar si ya existe configuración
    let config = await Configuracion.findOne();

    if (config) {
      await Configuracion.update(data, { where: { id: config.id } });
      console.log('Configuración actualizada correctamente en DB');
    } else {
      await Configuracion.create(data);
      console.log('Configuración creada correctamente en DB');
    }

    res.json({ message: 'Configuración guardada correctamente' });
  } catch (error) {
    console.error('Error en guardarConfiguracion:', error);
    res.status(500).json({ message: 'Error al guardar configuración' });
  }
};

module.exports = configuracionCtl;
