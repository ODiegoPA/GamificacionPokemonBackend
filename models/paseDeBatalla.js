module.exports = (sequelize, Sequelize) => {
    const PaseDeBatalla = sequelize.define("paseDeBatalla",{
        nombre: {
            type: Sequelize.STRING,
        },
        descripcion: {
            type: Sequelize.STRING,
        },
    })
    return PaseDeBatalla;
};