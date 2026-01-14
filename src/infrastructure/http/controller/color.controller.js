const { Color } = require('../../Database/dataBase.orm');

const colorCtrl = {};

colorCtrl.listar = async (req, res) => {
  try {
    const colores = await Color.findAll();
    res.json(colores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

colorCtrl.crear = async (req, res) => {
  try {
    const { nombre, activo } = req.body;
    const color = await Color.create({ nombre, activo });
    res.status(201).json(color);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

colorCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    const color = await Color.findByPk(id);
    if (!color) return res.status(404).json({ error: 'No encontrado' });
    color.nombre = nombre ?? color.nombre;
    if (activo !== undefined) color.activo = activo;
    await color.save();
    res.json(color);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

colorCtrl.desactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const color = await Color.findByPk(id);
    if (!color) return res.status(404).json({ error: 'No encontrado' });
    color.activo = false;
    await color.save();
    res.json({ message: 'Desactivado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = colorCtrl;
