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
        ataque:{
            type: Sequelize.INTEGER,
        },
        idPokedex:{
            type: Sequelize.INTEGER,
        },
        combatesJugados:{
            type: Sequelize.INTEGER,
        },
        combatesGanados:{
            type: Sequelize.INTEGER,
        },
        limite:{
            type: Sequelize.INTEGER,
        }
    });

    return PokemonEntrenador;
};
