const db = require('../models');

exports.listarNivelesPorPaseDeBatalla = async (req, res) => {
    const { paseDeBatallaId } = req.params;
    try {
        const niveles = await db.nivel.findAll({
            where: { paseDeBatallaId }
        });
        res.json(niveles);
    } catch (error) {
        console.error('Error al listar niveles:', error);
        res.status(500).json({ error: 'Error al listar niveles' });
    }
};

exports.crearNivel = async (req, res) => {
    const { orden, descripcion, tipo, idObjeto, paseDeBatallaId } = req.body;
    try {
        const nuevoNivel = await db.nivel.create({
            orden,
            descripcion,
            tipo,
            idObjeto,
            paseDeBatallaId
        });
        res.status(201).json(nuevoNivel);
    } catch (error) {
        console.error('Error al crear nivel:', error);
        res.status(500).json({ error: 'Error al crear nivel' });
    }
};

exports.actualizarNivel = async (req, res) => {
    const { nivelId } = req.params;
    const { orden, descripcion, tipo, idObjeto } = req.body;
    try {
        const nivel = await db.nivel.findByPk(nivelId);
        if (!nivel) {
            return res.status(404).json({ error: 'Nivel no encontrado' });
        }
        nivel.orden = orden;
        nivel.descripcion = descripcion;
        nivel.tipo = tipo;
        nivel.idObjeto = idObjeto;
        await nivel.save();
        res.json(nivel);
    } catch (error) {
        console.error('Error al actualizar nivel:', error);
        res.status(500).json({ error: 'Error al actualizar nivel' });
    }
};

exports.eliminarNivel = async (req, res) => {
    const { nivelId } = req.params;
    try {
        const nivel = await db.nivel.findByPk(nivelId);
        if (!nivel) {
            return res.status(404).json({ error: 'Nivel no encontrado' });
        }
        await nivel.destroy();
        res.json({ message: 'Nivel eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar nivel:', error);
        res.status(500).json({ error: 'Error al eliminar nivel' });
    }
};

