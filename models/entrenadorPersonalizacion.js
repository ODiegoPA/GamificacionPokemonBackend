module.exports = (sequelize, Sequelize) => {
    const EntrenadorPersonalizacion = sequelize.define("entrenador_personalizacion", {
        idFoto: {
            type: Sequelize.INTEGER,
        },
        estaActivo: {
            type: Sequelize.BOOLEAN,
        }
    });
    return EntrenadorPersonalizacion;
}