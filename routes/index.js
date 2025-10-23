module.exports = app => {
    require('./entrenador.routes')(app);
    require('./auth.routes')(app);
}