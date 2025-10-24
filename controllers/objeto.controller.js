const db = require('../models');

exports.listarObjetos = async (req, res) => {
  try {
    const objetos = await db.objeto.findAll();
    res.json(objetos);
  } catch (error) {
    console.error('Error al listar objetos:', error);
    res.status(500).json({ error: 'Error al listar objetos' });
  }
};
exports.comprarObjeto = async (req, res) => {
    const { entrenadorId, objetoId, cantidad } = req.body;
    try {
        const objeto = await db.objeto.findByPk(objetoId);
        if (!objeto) {
            return res.status(404).json({ error: 'Objeto no encontrado' });
        }
        const entrenador = await db.entrenador.findByPk(entrenadorId);
        if (!entrenador) {
            return res.status(404).json({ error: 'Entrenador no encontrado' });
        }
        if (entrenador.pokedolares < objeto.precio * cantidad) {
            return res.status(400).json({ error: 'Fondos insuficientes' });
        }
        const objetoEntrenador = await db.EntrenadorObjeto.findOne({
            where: { entrenadorId, objetoId },
        });
        if (objetoEntrenador) {
            objetoEntrenador.cantidad += cantidad;
            await objetoEntrenador.save();
        } else {
            await db.objetoEntrenador.create({
                entrenadorId,
                objetoId,
                cantidad,
            });
        }
        res.json({ msg: 'Objeto comprado exitosamente', objeto, cantidad: objetoEntrenador ? objetoEntrenador.cantidad : cantidad });
    } catch (error) {
        console.error('Error al comprar objeto:', error);
        res.status(500).json({ error: 'Error al comprar objeto' });
    }
};
exports.usarObjeto = async (req, res) => {
    const { entrenadorId, objetoId } = req.body;
    try {
        const objetoEntrenador = await db.EntrenadorObjeto.findOne({
            where: { entrenadorId, objetoId },
            include: [
                {
                    model: db.objeto,
                    as: 'objeto',
                    attributes: ['nombre', 'descripcion', 'ratio', 'cura', 'tipo'],
                }
            ],
        });
        if (!objetoEntrenador) {
            return res.status(404).json({ error: 'Objeto no encontrado en la mochila' });
        }
        let cantidad = objetoEntrenador.cantidad;
        if (cantidad === 1) {
            await objetoEntrenador.destroy();
        } else {
            objetoEntrenador.cantidad -= 1;
            await objetoEntrenador.save();
        }
        res.json({ msg: 'Objeto usado exitosamente', objetoEntrenador});
    } catch (error) {
        console.error('Error al usar objeto:', error);
        res.status(500).json({ error: 'Error al usar objeto' });
    }
};
exports.obtenerMochila = async (req, res) => {
    const { entrenadorId } = req.params;
    try {
        const objetos = await db.EntrenadorObjeto.findAll({
            where: { entrenadorId },
            include: [
                {
                    model: db.objeto,
                    as: 'objeto',
                    attributes: ['nombre', 'descripcion', 'ratio', 'cura', 'tipo'],
                }
            ],
        });
        res.json(objetos);
    } catch (error) {
        console.error('Error al obtener mochila:', error);
        res.status(500).json({ error: 'Error al obtener mochila' });
    }
};
exports.crearObjeto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, tipo, cura, ratio } = req.body;
    const nuevoObjeto = await db.objeto.create({
      nombre,
      descripcion,
      precio,
      tipo,
      cura,
      ratio
    });
    res.status(201).json(nuevoObjeto);
  } catch (error) {
    console.error('Error al crear objeto:', error);
    res.status(500).json({ error: 'Error al crear objeto' });
  }
};