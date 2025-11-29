module.exports = (sequelize, Sequelize) => {
    const Entrenador = sequelize.define("entrenador", {
        nombre: {
            type: Sequelize.STRING,
        },
        correo: {
            type: Sequelize.STRING,
        },
        password: {
            type: Sequelize.STRING,
        },
        sexo: {
            type: Sequelize.STRING,
        },
        pokedolares: {
            type: Sequelize.INTEGER,
        },
        nivel: {
            type: Sequelize.INTEGER,
        },
        experiencia: {
            type: Sequelize.INTEGER,
        },
        combatesJugados: {
            type: Sequelize.INTEGER,
        },
        combatesGanados: {
            type: Sequelize.INTEGER,
        },
    });

    return Entrenador;
};
