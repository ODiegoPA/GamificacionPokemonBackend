module.exports = app => {
    const { requireAuth } = require('../middleware/auth');
    let router = require("express").Router();
    const controller = require("../controllers/entrenador.controller");

    //router.use(requireAuth);
    router.post("/", controller.crearEntrenador);

    app.use('/entrenador', router);
}