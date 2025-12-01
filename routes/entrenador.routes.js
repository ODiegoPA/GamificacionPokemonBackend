module.exports = (app) => {
  const { requireAuth } = require("../middleware/auth");
  let router = require("express").Router();
  const controller = require("../controllers/entrenador.controller");

  router.post("/", controller.crearEntrenador);
  router.get("/:id/info", requireAuth, controller.getEntrenadorInfo);
  router.get("/ranking", requireAuth, controller.getGlobalRanking);

  app.use("/entrenador", router);
};
