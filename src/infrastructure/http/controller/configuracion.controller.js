const orm = require('../../../infrastructure/Database/dataBase.orm');
const Configuracion = orm.configuracion;

const configuracionCtl = {};

// =======================
// OBTENER CONFIGURACIÓN
// =======================
configuracionCtl.obtenerConfiguracion = async (req, res) => {
  try {
    const { idClinica } = req.query; // viene por query
    const configs = await Configuracion.findAll({ where: { idClinica }, raw: true });
    const datosClinica = {};

    configs.forEach(c => {
      switch (c.clave) {
        case 'nombreClinica': datosClinica.nombre = c.valor; break;
        case 'telefonoClinica': datosClinica.telefono = c.valor; break;
        case 'correoClinica': datosClinica.correo = c.valor; break;
        case 'direccionClinica': datosClinica.direccion = c.valor; break;
        case 'horariosClinica': datosClinica.horarios = c.valor; break;
        case 'logoClinica': datosClinica.logo = c.valor; break;
        case 'zonaHoraria': datosClinica.zonaHoraria = c.valor; break;
        case 'idioma': datosClinica.idioma = c.valor; break;
        case 'formatoFecha': datosClinica.formatoFecha = c.valor; break;
        case 'politicas': datosClinica.politicas = c.valor; break;
        case 'horasMinimasCancelacion': datosClinica.horasMinimasCancelacion = parseInt(c.valor); break;
        case 'limiteMascotas': datosClinica.limiteMascotas = parseInt(c.valor); break;
      }
    });

    res.json(datosClinica);
  } catch (error) {
    console.error('Error en obtenerConfiguracion:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

// =======================
// LISTAR CONFIGURACIONES
// =======================
configuracionCtl.listarConfiguraciones = async (req, res) => {
  try {
    const { idClinica } = req.query;
    const configs = await Configuracion.findAll({ where: { idClinica }, raw: true });
    res.json(configs);
  } catch (error) {
    console.error('Error en listarConfiguraciones:', error);
    res.status(500).json({ message: 'Error al listar configuraciones' });
  }
};

// =======================
// GUARDAR / ACTUALIZAR CONFIGURACIÓN GENERAL
// =======================
configuracionCtl.guardarConfiguracion = async (req, res) => {
  try {
    const datos = req.body;
    const { idClinica } = req.body;

    const claves = {
      nombre: 'nombreClinica',
      telefono: 'telefonoClinica',
      correo: 'correoClinica',
      direccion: 'direccionClinica',
      horarios: 'horariosClinica',
      logo: 'logoClinica',
      zonaHoraria: 'zonaHoraria',
      idioma: 'idioma',
      formatoFecha: 'formatoFecha',
      politicas: 'politicas',
      horasMinimasCancelacion: 'horasMinimasCancelacion',
      limiteMascotas: 'limiteMascotas'
    };

    for (const campo in claves) {
      const clave = claves[campo];
      const valor = datos[campo];
      const existente = await Configuracion.findOne({ where: { clave, idClinica } });
      if (existente) {
        await Configuracion.update({ valor }, { where: { clave, idClinica } });
      } else {
        await Configuracion.create({ clave, valor, tipo: 'clinica', idClinica });
      }
    }

    res.json({ message: 'Configuración guardada correctamente' });
  } catch (error) {
    console.error('Error en guardarConfiguracion:', error);
    res.status(500).json({ message: 'Error al guardar configuración' });
  }
};

// =======================
// ELIMINAR CONFIGURACIÓN POR CLAVE
// =======================
configuracionCtl.eliminarConfiguracion = async (req, res) => {
  try {
    const { clave } = req.params;
    const { idClinica } = req.query; // 🔹 Antes estaba en req.body, ahora query

    if (!idClinica) {
      return res.status(400).json({ message: 'idClinica es requerido' });
    }

    const eliminado = await Configuracion.destroy({ where: { clave, idClinica } });

    if (eliminado) {
      res.json({ message: `Configuración '${clave}' eliminada correctamente` });
    } else {
      res.status(404).json({ message: `Configuración '${clave}' no encontrada` });
    }
  } catch (error) {
    console.error('Error en eliminarConfiguracion:', error);
    res.status(500).json({ message: 'Error al eliminar configuración' });
  }
};


// =======================
// ACTUALIZAR CONFIGURACIÓN POR CLAVE
// =======================
configuracionCtl.actualizarConfiguracion = async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor, idClinica } = req.body;

    const existente = await Configuracion.findOne({ where: { clave, idClinica } });
    if (existente) {
      await Configuracion.update({ valor }, { where: { clave, idClinica } });
      res.json({ message: `Configuración '${clave}' actualizada correctamente` });
    } else {
      res.status(404).json({ message: `Configuración '${clave}' no encontrada` });
    }
  } catch (error) {
    console.error('Error en actualizarConfiguracion:', error);
    res.status(500).json({ message: 'Error al actualizar configuración' });
  }
};

module.exports = configuracionCtl;
