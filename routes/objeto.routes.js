module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/objeto.controller");
    const { requireAuth } = require('../middleware/auth');

    router.get("/mochila/:entrenadorId", controller.obtenerMochila);
    router.post("/usar-objeto", controller.usarObjeto);
    router.post("/comprar-objeto", controller.comprarObjeto);
    router.get("/", controller.listarObjetos);
    router.post("/", controller.crearObjeto);
    app.use('/objeto', router);
}