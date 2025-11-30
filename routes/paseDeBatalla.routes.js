module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/paseDeBatalla.controller");
    const { requireAuth } = require('../middleware/auth');
    router.use(requireAuth);
    router.get("/activo", controller.getPaseDeBatallaActivo);
    router.post("/crear", controller.crearPaseDeBatalla);
    app.use('/pase-de-batalla', router);
}