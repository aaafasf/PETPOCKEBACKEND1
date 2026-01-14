const { Raza, Especie } = require('../../Database/dataBase.orm');

const razaCtrl = {};

razaCtrl.listar = async (req, res) => {
  try {
    const razas = await Raza.findAll({ include: Especie });
    res.json(razas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar razas' });
  }
};

razaCtrl.crear = async (req, res) => {
  try {
    const { nombre, idEspecie } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    if (!idEspecie) {
      return res.status(400).json({ error: 'idEspecie es obligatorio' });
    }

    const especie = await Especie.findByPk(idEspecie);
    if (!especie) {
      return res.status(400).json({ error: 'La especie no existe' });
    }

    const raza = await Raza.create({ nombre, idEspecie });
    res.status(201).json(raza);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al crear raza' });
  }
};

razaCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, idEspecie, activo } = req.body;

    const raza = await Raza.findByPk(id);
    if (!raza) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    if (nombre !== undefined) raza.nombre = nombre;
    if (idEspecie !== undefined) raza.idEspecie = idEspecie;
    if (activo !== undefined) raza.activo = activo;

    await raza.save();
    res.json(raza);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar raza' });
  }
};

razaCtrl.desactivar = async (req, res) => {
  try {
    const { id } = req.params;
    const raza = await Raza.findByPk(id);
    if (!raza) return res.status(404).json({ error: 'No encontrada' });

    raza.activo = false;
    await raza.save();

    res.json({ message: 'Raza desactivada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desactivar' });
  }
};

module.exports = razaCtrl;
