const db = require('../models');

exports.getPaseDeBatallaActivo = async (req, res) => {
    try{
        const pasesDeBatalla = await db.paseDeBatalla.findAll({
            where: { estaActivo: true }
        });
        res.json(pasesDeBatalla);
    } catch (error) {
        console.error('Error al obtener el pase de batalla activo:', error);
        res.status(500).json({ error: 'Error al obtener el pase de batalla activo' });
    }
};

exports.crearPaseDeBatalla = async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        const nuevoPaseDeBatalla = await db.paseDeBatalla.create({
            nombre,
            descripcion,
            estaActivo: true
        });
        res.status(201).json(nuevoPaseDeBatalla);
    } catch (error) {
        console.error('Error al crear el pase de batalla:', error);
        res.status(500).json({ error: 'Error al crear el pase de batalla' });
    }
};