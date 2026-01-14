const { Tamano } = require('../../Database/dataBase.orm');

const tamanoCtrl = {};

tamanoCtrl.listar = async (req, res) => {
  try {
    const tamanos = await Tamano.findAll();
    res.json(tamanos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

tamanoCtrl.crear = async (req, res) => {
  try {
    const { nombre, activo } = req.body;
    const tamano = await Tamano.create({ nombre, activo });
    res.status(201).json(tamano);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

tamanoCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    const tamano = await Tamano.findByPk(id);
    if (!tamano) return res.status(404).json({ error: 'No encontrado' });
    tamano.nombre = nombre ?? tamano.nombre;
    if (activo !== undefined) tamano.activo = activo;
    await tamano.save();
    res.json(tamano);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

tamanoCtrl.desactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const tamano = await Tamano.findByPk(id);
    if (!tamano) return res.status(404).json({ error: 'No encontrado' });
    tamano.activo = false;
    await tamano.save();
    res.json({ message: 'Desactivado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = tamanoCtrl;
