const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  dialect: "mysql",
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.entrenador = require("./entrenador.js")(sequelize, Sequelize);
db.pokemonEntrenador = require("./pokemonEntrenador.js")(sequelize, Sequelize);
db.movimientoPokemon = require("./movimientoPokemon.js")(sequelize, Sequelize);
db.objeto = require("./objeto.js")(sequelize, Sequelize);
db.EntrenadorObjeto = require("./entrenadorObjeto.js")(sequelize, Sequelize);
db.entrenadorPersonalizacion = require("./entrenadorPersonalizacion.js")(
  sequelize,
  Sequelize
);
db.nivel = require("./nivel.js")(sequelize, Sequelize);
db.paseDeBatalla = require("./paseDeBatalla.js")(sequelize, Sequelize);
db.paseDeBatallaEntrenador = require("./paseDeBatallaEntrenador.js")(
  sequelize,
  Sequelize
);
db.personalizacion = require("./personalizacion.js")(sequelize, Sequelize);

db.pokemonEntrenador.belongsTo(db.entrenador, {
  foreignKey: "entrenadorId",
  as: "entrenador",
});
db.entrenador.hasMany(db.pokemonEntrenador, {
  foreignKey: "entrenadorId",
  as: "pokemones",
});

db.movimientoPokemon.belongsTo(db.pokemonEntrenador, {
  foreignKey: "pokemonEntrenadorId",
  as: "pokemonEntrenador",
});
db.pokemonEntrenador.hasMany(db.movimientoPokemon, {
  foreignKey: "pokemonEntrenadorId",
  as: "movimientos",
});

db.objeto.belongsToMany(db.entrenador, {
  through: db.EntrenadorObjeto,
  as: "entrenadores",
  foreignKey: "objetoId",
  otherKey: "entrenadorId",
});

db.entrenador.belongsToMany(db.objeto, {
  through: db.EntrenadorObjeto,
  as: "objetos",
  foreignKey: "entrenadorId",
  otherKey: "objetoId",
});

db.EntrenadorObjeto.belongsTo(db.objeto, {
  foreignKey: "objetoId",
  as: "objeto",
});

db.EntrenadorObjeto.belongsTo(db.entrenador, {
  foreignKey: "entrenadorId",
  as: "entrenador",
});

db.nivel.belongsTo(db.paseDeBatalla, {
  foreignKey: "paseDeBatallaId",
  as: "paseDeBatalla",
});

db.paseDeBatalla.hasMany(db.nivel, {
  foreignKey: "paseDeBatallaId",
  as: "niveles",
});

db.paseDeBatalla.belongsToMany(db.entrenador, {
  through: db.paseDeBatallaEntrenador,
  as: "entrenadores",
  foreignKey: "paseDeBatallaId",
  otherKey: "entrenadorId",
});

db.entrenador.belongsToMany(db.paseDeBatalla, {
  through: db.paseDeBatallaEntrenador,
  as: "pasesDeBatalla",
  foreignKey: "entrenadorId",
  otherKey: "paseDeBatallaId",
});

db.paseDeBatallaEntrenador.belongsTo(db.entrenador, {
  foreignKey: "entrenadorId",
  as: "entrenador",
});

db.paseDeBatallaEntrenador.belongsTo(db.paseDeBatalla, {
  foreignKey: "paseDeBatallaId",
  as: "paseDeBatalla",
});

db.entrenador.belongsToMany(db.personalizacion, {
  through: db.entrenadorPersonalizacion,
  as: "personalizaciones",
  foreignKey: "entrenadorId",
  otherKey: "personalizacionId",
});

db.personalizacion.belongsToMany(db.entrenador, {
  through: db.entrenadorPersonalizacion,
  as: "entrenadores",
  foreignKey: "personalizacionId",
  otherKey: "entrenadorId",
});

db.entrenadorPersonalizacion.belongsTo(db.entrenador, {
  foreignKey: "entrenadorId",
  as: "entrenador",
});

db.entrenadorPersonalizacion.belongsTo(db.personalizacion, {
  foreignKey: "personalizacionId",
  as: "personalizacion",
});

module.exports = db;
