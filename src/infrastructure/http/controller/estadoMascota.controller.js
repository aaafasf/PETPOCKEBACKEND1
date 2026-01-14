const { EstadoMascota } = require('../../Database/dataBase.orm');

const estadoMascotaCtrl = {};

estadoMascotaCtrl.listar = async (req, res) => {
  try {
    const estados = await EstadoMascota.findAll();
    res.json(estados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

estadoMascotaCtrl.crear = async (req, res) => {
  try {
    const { nombre, activo } = req.body;
    const estado = await EstadoMascota.create({ nombre, activo });
    res.status(201).json(estado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

estadoMascotaCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    const estado = await EstadoMascota.findByPk(id);
    if (!estado) return res.status(404).json({ error: 'No encontrado' });
    estado.nombre = nombre ?? estado.nombre;
    if (activo !== undefined) estado.activo = activo;
    await estado.save();
    res.json(estado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

estadoMascotaCtrl.desactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const estado = await EstadoMascota.findByPk(id);
    if (!estado) return res.status(404).json({ error: 'No encontrado' });
    estado.activo = false;
    await estado.save();
    res.json({ message: 'Desactivado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = estadoMascotaCtrl;
