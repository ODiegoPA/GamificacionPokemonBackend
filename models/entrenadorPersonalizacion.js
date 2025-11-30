module.exports = (sequelize, Sequelize) => {
    const EntrenadorPersonalizacion = sequelize.define("entrenador_personalizacion", {
        estaActivo: {
            type: Sequelize.BOOLEAN,
        }
    });
    return EntrenadorPersonalizacion;
}