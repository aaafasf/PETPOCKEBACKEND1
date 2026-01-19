const Catalogo = require('../../../domain/models/sql/catalogos.model');


exports.listar = async (req, res) => {
    try {
        const data = await catalogosModel.listar();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al listar catálogos' });
    }
};

exports.crear = async (req, res) => {
    try {
        const { nombre, descripcion, estado } = req.body;
        await catalogosModel.crear({ nombre, descripcion, estado });
        res.status(201).json({ message: 'Catálogo creado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear catálogo' });
    }
};

exports.actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, estado } = req.body;
        await catalogosModel.actualizar(id, { nombre, descripcion, estado });
        res.json({ message: 'Catálogo actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar catálogo' });
    }
};

exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        await catalogosModel.eliminar(id);
        res.json({ message: 'Catálogo eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar catálogo' });
    }
};
