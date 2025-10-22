module.exports = (sequelize, Sequelize) => {
    const ObjetoEntrenador = sequelize.define("entrenador_objeto", {
        cantidad: {
            type: Sequelize.INTEGER,
        }
    });
    return ObjetoEntrenador;
};
