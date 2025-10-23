module.exports = (sequelize, Sequelize) => {
    const MovimientoPokemon = sequelize.define("movimiento_pokemon", {
        movimientoId: {
            type: Sequelize.STRING,
        }
    });

    return MovimientoPokemon;
}