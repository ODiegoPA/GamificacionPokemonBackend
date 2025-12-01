const db = require("../models");

exports.getInfoPaseDeBatallaEntrenador = async (req, res) => {
  const { entrenadorId, paseDeBatallaId } = req.params;

  try {
    const paseDeBatallaEntrenador = await db.paseDeBatallaEntrenador.findOne({
      where: { entrenadorId, paseDeBatallaId },
      include: [
        {
          model: db.entrenador,
          as: "entrenador",
        },
        {
          model: db.paseDeBatalla,
          as: "paseDeBatalla",
          include: [
            {
              model: db.nivel,
              as: "niveles",
            },
          ],
        },
      ],
    });
    res.json(paseDeBatallaEntrenador);
  } catch (error) {
    console.error(
      "Error al obtener información del pase de batalla del entrenador:",
      error
    );
    res.status(500).json({
      error: "Error al obtener información del pase de batalla del entrenador",
    });
  }
};

exports.reclamarRecompensa = async (req, res) => {
  const { entrenadorId, paseDeBatallaId } = req.params;
  const { orden } = req.body;
  const t = await db.sequelize.transaction();
  try {
    if (!entrenadorId)
      return res.status(400).json({ error: "entrenadorId requerido" });
    if (orden === undefined || orden === null)
      return res.status(400).json({ error: "orden requerido en body" });

    const entrenador = await db.entrenador.findByPk(entrenadorId, {
      transaction: t,
    });
    if (!entrenador) {
      await t.rollback();
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    // Buscar la relación paseDeBatallaEntrenador (filtrar por paseDeBatallaId si se pasó)
    const where = { entrenadorId };
    if (paseDeBatallaId) where.paseDeBatallaId = paseDeBatallaId;

    const paseRel = await db.paseDeBatallaEntrenador.findOne({
      where,
      include: [
        {
          model: db.paseDeBatalla,
          as: "paseDeBatalla",
          include: [{ model: db.nivel, as: "niveles" }],
        },
      ],
      transaction: t,
    });
    if (!paseRel) {
      await t.rollback();
      return res
        .status(404)
        .json({
          error: "Relación de pase de batalla no encontrada para el entrenador",
        });
    }

    const nivel = (
      (paseRel.paseDeBatalla && paseRel.paseDeBatalla.niveles) ||
      []
    ).find((n) => Number(n.orden) === Number(orden));
    if (!nivel) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Nivel no encontrado en el pase de batalla" });
    }

    // Verificar que el entrenador tenga el nivel requerido en el pase
    const nivelActual = paseRel.nivelActual || 0;
    if (Number(nivelActual) < Number(orden)) {
      await t.rollback();
      return res
        .status(400)
        .json({
          error:
            "El entrenador no ha alcanzado este nivel en el pase de batalla",
        });
    }

    // Procesar recompensa según tipo
    const tipo = (nivel.tipo || "").toString().toLowerCase();
    const cantidad = Number(nivel.cantidad || 0);
    const idObjeto = nivel.idObjeto;

    if (tipo === "objeto") {
      if (!idObjeto) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "Nivel sin idObjeto para tipo objeto" });
      }
      // buscar relación entrenadorObjeto
      let eo = await db.EntrenadorObjeto.findOne({
        where: { entrenadorId, objetoId: idObjeto },
        transaction: t,
      });
      if (eo) {
        eo.cantidad = (Number(eo.cantidad) || 0) + cantidad;
        await eo.save({ transaction: t });
      } else {
        eo = await db.EntrenadorObjeto.create(
          { entrenadorId, objetoId: idObjeto, cantidad: cantidad },
          { transaction: t }
        );
      }

      await t.commit();
      return res.json({
        message: "Recompensa de objeto reclamada",
        tipo: "objeto",
        objetoId: idObjeto,
        cantidad: eo.cantidad,
      });
    }

    if (tipo === "personalizacion") {
      if (!idObjeto) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "Nivel sin idObjeto para tipo personalizacion" });
      }
      // crear relación entrenadorPersonalizacion si no existe, sin activar
      const existing = await db.entrenadorPersonalizacion.findOne({
        where: { entrenadorId, personalizacionId: idObjeto },
        transaction: t,
      });
      if (existing) {
        await t.commit();
        return res.json({
          message: "Personalización ya adquirida",
          personalizacionId: idObjeto,
        });
      }

      const nueva = await db.entrenadorPersonalizacion.create(
        { entrenadorId, personalizacionId: idObjeto, estaActivo: false },
        { transaction: t }
      );
      await t.commit();
      return res.json({
        message: "Personalización añadida (no activa)",
        personalizacion: nueva,
      });
    }

    if (tipo === "moneda" || tipo === "pokedolares" || tipo === "dinero") {
      // aumentar pokedolares del entrenador
      entrenador.pokedolares = (Number(entrenador.pokedolares) || 0) + cantidad;
      await entrenador.save({ transaction: t });
      await t.commit();
      return res.json({
        message: "Pokedolares añadidos",
        cantidad: cantidad,
        pokedolares: entrenador.pokedolares,
      });
    }

    await t.rollback();
    return res.status(400).json({ error: "Tipo de recompensa no reconocido" });
  } catch (error) {
    console.error("Error en reclamarRecompensa:", error);
    try {
      await t.rollback();
    } catch (_) {}
    return res.status(500).json({ error: "Error al reclamar recompensa" });
  }
};
