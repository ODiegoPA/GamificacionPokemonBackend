const db = require("../models");

exports.listarPersonalizacionesEntrenador = async (req, res) => {
  const { entrenadorId } = req.params;
  const { tipo } = req.body;
  try {
    const personalizaciones = await db.entrenadorPersonalizacion.findAll({
      where: { entrenadorId },
      include: [
        {
          model: db.personalizacion,
          as: "personalizacion",
          where: tipo ? { tipo } : {},
        },
      ],
    });
    res.json(personalizaciones);
  } catch (error) {
    console.error("Error al obtener personalizaciones del entrenador:", error);
    res
      .status(500)
      .json({ error: "Error al obtener personalizaciones del entrenador" });
  }
};

exports.asignarPersonalizacion = async (req, res) => {
  const { entrenadorId, personalizacionId } = req.body;
  try {
    const nuevaAsignacion = await db.entrenadorPersonalizacion.create({
      entrenadorId,
      personalizacionId,
      estaActivo: false,
    });
    res.status(201).json(nuevaAsignacion);
  } catch (error) {
    console.error("Error al asignar personalización al entrenador:", error);
    res
      .status(500)
      .json({ error: "Error al asignar personalización al entrenador" });
  }
};

exports.cambiarEstadoPersonalizacion = async (req, res) => {
  const { entrenadorId, personalizacionId, nuevaPersonalizacionId } = req.body;
  try {
    const personalizacionEntrenador =
      await db.entrenadorPersonalizacion.findOne({
        where: { entrenadorId, personalizacionId, estaActivo: true },
      });

    if (personalizacionEntrenador) {
      personalizacionEntrenador.estaActivo = false;
      await personalizacionEntrenador.save();
      return res.json({
        msg: "Personalización desactivada",
        personalizacionEntrenador,
      });
    }

    const nuevaAsignacion = await db.entrenadorPersonalizacion.findOne({
      where: { entrenadorId, personalizacionId: nuevaPersonalizacionId },
    });

    if (!nuevaAsignacion) {
      return res
        .status(404)
        .json({
          error: "La nueva personalización no existe para este entrenador",
        });
    }

    nuevaAsignacion.estaActivo = true;
    await nuevaAsignacion.save();

    const resultado = await db.entrenadorPersonalizacion.findOne({
      where: { id: nuevaAsignacion.id },
      include: [{ model: db.personalizacion, as: "personalizacion" }],
    });

    return res.json({
      msg: "Personalización activada",
      personalizacionEntrenador: resultado,
    });
  } catch (error) {
    console.error("Error al cambiar estado de personalización:", error);
    res
      .status(500)
      .json({ error: "Error al cambiar estado de personalización" });
  }
};


exports.obtenerPersonalizacionPorTipo = async (req, res) => {
  const entrenadorId = req.body.entrenadorId;
  const tipo = req.body.tipo;

  if (!entrenadorId || !tipo) {
    return res.status(400).json({ error: 'Faltan parámetros: entrenadorId y tipo son requeridos' });
  }

  try {
    // Todas las personalizaciones del tipo
    const todas = await db.personalizacion.findAll({ where: { tipo } });

    // Las personalizaciones que el entrenador ya tiene (join table), incluyendo estado
    const compradasEntries = await db.entrenadorPersonalizacion.findAll({
      where: { entrenadorId },
      include: [{ model: db.personalizacion, as: 'personalizacion', where: { tipo } }]
    });

    const compradas = compradasEntries.map(ep => {
      const p = ep.personalizacion ? ep.personalizacion.get({ plain: true }) : null;
      return p ? { ...p, estaActivo: ep.estaActivo } : null;
    }).filter(Boolean);

    const compradasIds = new Set(compradas.map(p => p.id));

    const faltantes = todas.filter(p => !compradasIds.has(p.id));

    return res.json({ compradas, faltantes });
  } catch (error) {
    console.error('Error obtenerPersonalizacionPorTipo:', error);
    return res.status(500).json({ error: 'Error al obtener personalizaciones por tipo' });
  }
};