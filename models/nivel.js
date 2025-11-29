module.exports = (sequelize, Sequelize) => {
    const Nivel = sequelize.define("nivel", {
        orden: {
            type: Sequelize.INTEGER,
        },
        descripcion: {
            type: Sequelize.STRING,
        },
        tipo: {
            type: Sequelize.STRING,
        },
        idObjeto: {
            type: Sequelize.INTEGER,
        }
    });
    return Nivel;
};