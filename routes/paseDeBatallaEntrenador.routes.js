module.exports = (app) => {
  let router = require("express").Router();
  const controller = require("../controllers/paseDeBatallaEntrenador.controller");
  const { requireAuth } = require("../middleware/auth");

  router.use(requireAuth);
  router.get(
    "/entrenador/:entrenadorId/pase-de-batalla/:paseDeBatallaId",
    controller.getInfoPaseDeBatallaEntrenador
  );
  router.post(
    "/entrenador/:entrenadorId/pase-de-batalla/:paseDeBatallaId/reclamar",
    controller.reclamarRecompensa
  );
  app.use("/pase-de-batalla-entrenador", router);
};
