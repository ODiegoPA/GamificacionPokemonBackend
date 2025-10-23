module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/auth.controller");

    router.post('/login', controller.login);
    router.post('/refresh', controller.refresh);

    router.get('/me', controller.me);
    //router.get('/admin/only', controller.adminOnly);
    app.use('/auth', router);
}
