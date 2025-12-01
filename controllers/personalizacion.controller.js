const db = require('../models');

exports.getListadoPersonalizaciones = async (req, res) => {
    try {
        const personalizaciones = await db.personalizacion.findAll();
        res.json(personalizaciones);
    } catch (error) {
        console.error('Error al obtener personalizaciones:', error);
        res.status(500).json({ error: 'Error al obtener personalizaciones' });
    }
};


exports.getPersonalizacionById = async (req, res) => {
    const { personalizacionId } = req.params;
    try {
        const personalizacion = await db.personalizacion.findByPk(personalizacionId);
        if (!personalizacion) {
            return res.status(404).json({ error: 'Personalización no encontrada' });
        }
        res.json(personalizacion);
    } catch (error) {
        console.error('Error al obtener personalización:', error);
        res.status(500).json({ error: 'Error al obtener personalización' });
    }
};

exports.createPersonalizacion = async (req, res) => {
    const { tipo, descripcion, idFoto, nombre } = req.body;
    try {
        const nuevaPersonalizacion = await db.personalizacion.create({
            tipo,
            nombre,
            descripcion,
            idFoto,
        });
        res.status(201).json(nuevaPersonalizacion);
    } catch (error) {
        console.error('Error al crear personalización:', error);
        res.status(500).json({ error: 'Error al crear personalización' });
    }
};

exports.updatePersonalizacion = async (req, res) => {
    const { personalizacionId } = req.params;
    const { tipo, descripcion, idFoto, nombre } = req.body;
    try {
        const personalizacion = await db.personalizacion.findByPk(personalizacionId);
        if (!personalizacion) {
            return res.status(404).json({ error: 'Personalización no encontrada' });
        }
        personalizacion.tipo = tipo;
        personalizacion.descripcion = descripcion;
        personalizacion.idFoto = idFoto;
        personalizacion.nombre = nombre;
        await personalizacion.save();
        res.json(personalizacion);
    } catch (error) {
        console.error('Error al actualizar personalización:', error);
        res.status(500).json({ error: 'Error al actualizar personalización' });
    }
};

exports.deletePersonalizacion = async (req, res) => {
    const { personalizacionId } = req.params;
    try {
        const personalizacion = await db.personalizacion.findByPk(personalizacionId);
        if (!personalizacion) {
            return res.status(404).json({ error: 'Personalización no encontrada' });
        }
        await personalizacion.destroy();
        res.json({ message: 'Personalización eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar personalización:', error);
        res.status(500).json({ error: 'Error al eliminar personalización' });
    }
};