module.exports = (sequelize, Sequelize) => {
    const PokemonEntrenador = sequelize.define("pokemon_entrenador", {
        apodo: {
            type: Sequelize.STRING,
        },
        vidaMax:{
            type: Sequelize.INTEGER,
        },
        vidaActual:{
            type: Sequelize.INTEGER,
        },
        Ataque:{
            type: Sequelize.INTEGER,
        },
    });

    return PokemonEntrenador;
};
