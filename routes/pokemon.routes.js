module.exports = app => {
    let router = require("express").Router();
    const controller = require("../controllers/pokemon.controller");
    const { requireAuth } = require('../middleware/auth');
    //router.use(requireAuth);
    router.get("/generar-salvaje", controller.generarPokemonSalvaje);
    router.get("/info-pokemon/:id", controller.getPokemonById);
    router.get("/iniciales", controller.getInfoIniciales);
    router.get("/movimientos/:pokedexId", controller.getAllMovesByPokedexId);
    router.get("/entrenador/:entrenadorId", controller.getPokemonDeEntrenador);
    router.post("/atrapar", controller.atraparPokemon);
    router.post("/terminar-combate", controller.terminarCombate);
    router.delete("/liberar/:id", controller.liberarPokemon);
    router.post("/curar-pokemon/:entrenadorId", controller.curarPokemonDeEntrenador);
    app.use('/pokemon', router);

}