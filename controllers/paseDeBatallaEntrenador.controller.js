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
    res
      .status(500)
      .json({
        error:
          "Error al obtener información del pase de batalla del entrenador",
      });
  }
};
