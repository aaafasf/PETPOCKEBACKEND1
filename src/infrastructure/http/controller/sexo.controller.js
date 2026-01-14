const { Sexo } = require('../../Database/dataBase.orm');

const sexoCtrl = {};

sexoCtrl.listar = async (req, res) => {
  try {
    const sexos = await Sexo.findAll();
    res.json(sexos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

sexoCtrl.crear = async (req, res) => {
  try {
    const { nombre, activo } = req.body;
    const sexo = await Sexo.create({ nombre, activo });
    res.status(201).json(sexo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

sexoCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    const sexo = await Sexo.findByPk(id);
    if (!sexo) return res.status(404).json({ error: 'No encontrado' });
    sexo.nombre = nombre ?? sexo.nombre;
    if (activo !== undefined) sexo.activo = activo;
    await sexo.save();
    res.json(sexo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

sexoCtrl.desactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const sexo = await Sexo.findByPk(id);
    if (!sexo) return res.status(404).json({ error: 'No encontrado' });
    sexo.activo = false;
    await sexo.save();
    res.json({ message: 'Desactivado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = sexoCtrl;
