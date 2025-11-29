module.exports = (sequelize, Sequelize) => {
    const PaseDeBatallaEntrenador = sequelize.define("paseDeBatalla_entrenador", {
        nivelActual: {
            type: Sequelize.INTEGER,
        },
        experiencia: {
            type: Sequelize.INTEGER,
        }
    });
    return PaseDeBatallaEntrenador;
}