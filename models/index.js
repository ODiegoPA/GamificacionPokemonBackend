const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        port: dbConfig.PORT,
        dialect: "mysql",
    }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.entrenador = require("./entrenador.js")(sequelize, Sequelize);
db.pokemonEntrenador = require("./pokemonEntrenador.js")(sequelize, Sequelize);
db.movimientoPokemon = require("./movimientoPokemon.js")(sequelize, Sequelize);
db.objeto = require("./objeto.js")(sequelize, Sequelize);
db.EntrenadorObjeto = require("./entrenadorObjeto.js")(sequelize, Sequelize);

db.pokemonEntrenador.belongsTo(db.entrenador, {
    foreignKey: 'entrenadorId',
    as: 'entrenador'
});
db.entrenador.hasMany(db.pokemonEntrenador, {
    foreignKey: 'entrenadorId',
    as: 'pokemones'
});

db.movimientoPokemon.belongsTo(db.pokemonEntrenador, {
    foreignKey: 'pokemonEntrenadorId',
    as: 'pokemonEntrenador'
});
db.pokemonEntrenador.hasMany(db.movimientoPokemon, {
    foreignKey: 'pokemonEntrenadorId',
    as: 'movimientos'
});

db.objeto.belongsToMany(db.pokemonEntrenador, {
  through: db.EntrenadorObjeto,
  as: 'pokemonEntrenadores',
  foreignKey: 'objetoId',
  otherKey: 'pokemonEntrenadorId',
});

db.pokemonEntrenador.belongsToMany(db.objeto, {
  through: db.EntrenadorObjeto,
  as: 'objetos',
  foreignKey: 'pokemonEntrenadorId',
  otherKey: 'objetoId',
});

module.exports = db;
