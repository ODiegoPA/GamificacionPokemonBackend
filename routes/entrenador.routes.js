module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/entrenador.controller");

    router.post("/", controller.crearEntrenador);

    app.use('/entrenador', router);
}