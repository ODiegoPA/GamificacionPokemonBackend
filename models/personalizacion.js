module.exports = (sequelize, Sequelize) => {
    const Personalizacion = sequelize.define("personalizacion", {
        tipo: {
            type: Sequelize.STRING,
        },
        descripcion: {
            type: Sequelize.STRING,
        },
        idFoto: {
            type: Sequelize.INTEGER,
        },
        nombre: {
            type: Sequelize.STRING,
        }
    });

    return Personalizacion;
};