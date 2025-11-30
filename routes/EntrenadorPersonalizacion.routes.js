module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/EntrenadorPersonalizacion.controller");
    const { requireAuth } = require('../middleware/auth');

    router.use(requireAuth);
    router.post("/:entrenadorId", controller.listarPersonalizacionesEntrenador);
    router.post("/", controller.asignarPersonalizacion);
    router.put("/cambiar-personalizacion", controller.cambiarEstadoPersonalizacion);
    router.post("/obtener-personalizaciones", controller.obtenerPersonalizacionPorTipo);
    app.use('/entrenador-personalizacion', router);
}