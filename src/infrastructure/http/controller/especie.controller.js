const { Especie } = require('../../Database/dataBase.orm');

const especieCtrl = {};

especieCtrl.listar = async (req, res) => {
  try {
    const especies = await Especie.findAll();
    res.json(especies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

especieCtrl.crear = async (req, res) => {
  try {
    console.log('POST /api/especies body:', JSON.stringify(req.body));
    const { nombre, activo } = req.body;
    const especie = await Especie.create({ nombre, activo });
    res.status(201).json(especie);
  } catch (err) {
    console.error('Error al crear especie:', err);
    res.status(400).json({ error: err.message });
  }
};

especieCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    const especie = await Especie.findByPk(id);
    if (!especie) return res.status(404).json({ error: 'No encontrada' });
    especie.nombre = nombre ?? especie.nombre;
    if (activo !== undefined) especie.activo = activo;
    await especie.save();
    res.json(especie);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

especieCtrl.desactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const especie = await Especie.findByPk(id);
    if (!especie) return res.status(404).json({ error: 'No encontrada' });
    especie.activo = false;
    await especie.save();
    res.json({ message: 'Desactivada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = especieCtrl;
