module.exports = (sequelize, Sequelize) => {
    const Objeto = sequelize.define("objeto", {
        nombre: {
            type: Sequelize.STRING,
        },
        descripcion: {
            type: Sequelize.STRING,
        },
        cura: {
            type: Sequelize.INTEGER,
        },
        ratio: {
            type: Sequelize.FLOAT,
        },
        precio: {
            type: Sequelize.INTEGER,
        },
        tipo: {
            type: Sequelize.STRING,
        }
    });

    return Objeto;
};
