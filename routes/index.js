module.exports = app => {
    require('./entrenador.routes')(app);
    require('./auth.routes')(app);
    require('./pokemon.routes')(app);
    require('./objeto.routes')(app);
    require('./paseDeBatalla.routes')(app);
    require('./nivel.routes')(app);
}