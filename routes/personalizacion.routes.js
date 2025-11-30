module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/personalizacion.controller");
    const { requireAuth } = require('../middleware/auth');

    router.use(requireAuth);
    router.get("/", controller.getListadoPersonalizaciones);
    router.get("/:id", controller.getPersonalizacionById);
    router.post("/", controller.createPersonalizacion);
    router.put("/:id", controller.updatePersonalizacion);
    router.delete("/:id", controller.deletePersonalizacion);
    app.use('/personalizacion', router);
}