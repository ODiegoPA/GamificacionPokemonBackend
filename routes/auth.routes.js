module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/auth.controller");

    router.post('/login', controller.login);
    router.post('/refresh', controller.refresh);

    router.get('/me', controller.me);
    app.use('/auth', router);
}
