module.exports = (app) => {
  const { requireAuth } = require("../middleware/auth");
  let router = require("express").Router();
  const controller = require("../controllers/entrenador.controller");

  router.use(requireAuth);
  router.post("/", controller.crearEntrenador);
  router.get("/:id/info", controller.getEntrenadorInfo);
  router.get("/ranking", controller.getGlobalRanking);
  router.get("/mas-usados", controller.getPokemonsMasUsados);

  app.use("/entrenador", router);
};
