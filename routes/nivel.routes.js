module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/nivel.controller");
    const { requireAuth } = require('../middleware/auth');

    router.use(requireAuth);

    router.get("/:paseDeBatallaId", controller.listarNivelesPorPaseDeBatalla);
    router.post("/", controller.crearNivel);
    router.put("/:id", controller.actualizarNivel);
    router.delete("/:id", controller.eliminarNivel);

    app.use('/nivel', router);
}