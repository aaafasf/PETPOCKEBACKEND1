const { mascota } = require('../../Database/dataBase.orm');

const misMascotasCtrl = {};

// Suponiendo que req.user.id existe (middleware auth)
misMascotasCtrl.listar = async (req, res) => {
  try {
    // Cambia esto según cómo guardes el id del usuario propietario
    const idPropietario = req.user?.id || req.query.idPropietario;
    if (!idPropietario) return res.status(400).json({ error: 'Propietario requerido' });
    const mascotas = await mascota.findAll({ where: { idPropietario } });
    res.json(mascotas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

misMascotasCtrl.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const m = await mascota.findByPk(id);
    if (!m) return res.status(404).json({ error: 'Mascota no encontrada' });
    Object.assign(m, datos);
    await m.save();
    res.json(m);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = misMascotasCtrl;
