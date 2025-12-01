module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/personalizacion.controller");
    const { requireAuth } = require('../middleware/auth');

    router.get("/", controller.getListadoPersonalizaciones);
    router.get("/:personalizacionId", controller.getPersonalizacionById);
    router.post("/", controller.createPersonalizacion);
    router.put("/:personalizacionId", controller.updatePersonalizacion);
    router.delete("/:personalizacionId", controller.deletePersonalizacion);
    app.use('/personalizacion', router);
}