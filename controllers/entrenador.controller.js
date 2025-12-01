const bcrypt = require("bcryptjs");
const db = require("../models");
const axios = require("axios");
const POKE_BASE = "https://pokeapi.co/api/v2";

const { sequelize } = db;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

exports.crearEntrenador = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nombre, correo, password, sexo, apodo, idPokedex } = req.body;
    const pokemonRes = await axios.get(`${POKE_BASE}/pokemon/${idPokedex}`, {
      timeout: 8000,
    });
    const pokemon = pokemonRes.data;
    const hpOriginal =
      pokemon.stats.find((s) => s.stat?.name === "hp")?.base_stat ?? 0;
    const attack =
      pokemon.stats.find((s) => s.stat?.name === "attack")?.base_stat ?? 0;
    const hp = hpOriginal * 5;

    let { movimientos } = req.body;
    if (
      movimientos &&
      !Array.isArray(movimientos) &&
      typeof movimientos === "object"
    ) {
      movimientos = Object.values(movimientos);
    }
    if (!Array.isArray(movimientos)) movimientos = [];
    const movIds = [
      ...new Set(movimientos.map(Number).filter(Number.isFinite)),
    ].slice(0, 4);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const nuevoEntrenador = await db.entrenador.create(
      {
        nombre,
        correo,
        password: hashed,
        sexo,
        pokedolares: 1000,
        nivel: 1,
        experiencia: 0,
        combatesJugados: 0,
        combatesGanados: 0,
      },
      { transaction: t }
    );

    const pokemonInicial = await db.pokemonEntrenador.create(
      {
        entrenadorId: nuevoEntrenador.id,
        apodo,
        vidaMax: hp,
        vidaActual: hp,
        ataque: attack,
        idPokedex,
        combatesJugados: 0,
        combatesGanados: 0,
        limite:1000
      },
      { transaction: t }
    );
    if (movIds.length) {
      const rows = movIds.map((movId) => ({
        pokemonEntrenadorId: pokemonInicial.id,
        movimientoId: movId,
      }));
      await db.movimientoPokemon.bulkCreate(rows, {
        transaction: t,
        ignoreDuplicates: true,
      });
    }

    await db.EntrenadorObjeto.bulkCreate(
      [
        { entrenadorId: nuevoEntrenador.id, objetoId: 1, cantidad: 2 },
        { entrenadorId: nuevoEntrenador.id, objetoId: 2, cantidad: 5 },
      ],
      { transaction: t }
    );

    // Asignar pase de batalla inicial (id = 1) al entrenador: nivel 1, experiencia 0
    const paseAsignado = await db.paseDeBatallaEntrenador.create(
      {
        entrenadorId: nuevoEntrenador.id,
        paseDeBatallaId: 1,
        nivelActual: 1,
        experiencia: 0,
      },
      { transaction: t }
    );

    const sexoUpper = (sexo || "").toString().toUpperCase();
    const personalizacionId =
      sexoUpper === "M" ? 1 : sexoUpper === "F" ? 2 : null;
    let personalizacionAsignada = null;
    if (personalizacionId) {
      personalizacionAsignada = await db.entrenadorPersonalizacion.create(
        {
          entrenadorId: nuevoEntrenador.id,
          personalizacionId,
          estaActivo: true,
        },
        { transaction: t }
      );
    }

    await t.commit();

    return res.status(201).json({
      msg: "Entrenador y Pokémon creados",
      entrenador: {
        id: nuevoEntrenador.id,
        nombre: nuevoEntrenador.nombre,
        correo: nuevoEntrenador.correo,
        sexo: nuevoEntrenador.sexo,
        pokedolares: nuevoEntrenador.pokedolares,
      },
      pokemon: {
        id: pokemonInicial.id,
        apodo: pokemonInicial.apodo,
        vidaMax: pokemonInicial.vidaMax,
        vidaActual: pokemonInicial.vidaActual,
        ataque: pokemonInicial.ataque,
        movimientos: movIds,
      },
    });
  } catch (error) {
    if (t.finished !== "commit") {
      try {
        await t.rollback();
      } catch (_) {}
    }
    console.error("crearEntrenador error:", error);
    return res.status(500).json({ msg: "Error al crear el entrenador" });
  }
};

// Obtener información de un entrenador y su posición en el ranking
exports.getEntrenadorInfo = async (req, res) => {
  try {
    const entrenadorId =
      req.params.id || req.body.entrenadorId || req.query.entrenadorId;
    if (!entrenadorId)
      return res.status(400).json({ error: "entrenadorId requerido" });

    const entrenador = await db.entrenador.findByPk(entrenadorId, {
      attributes: [
        "id",
        "nombre",
        "sexo",
        "pokedolares",
        "nivel",
        "experiencia",
        "combatesJugados",
        "combatesGanados",
      ],
    });
    if (!entrenador)
      return res.status(404).json({ error: "Entrenador no encontrado" });

    const ej = entrenador.combatesJugados || 0;
    const eg = entrenador.combatesGanados || 0;
    const losses = Math.max(0, ej - eg);
    const kd = losses > 0 ? +(eg / losses).toFixed(2) : eg;

    const { Op } = db.Sequelize;
    const betterCount = await db.entrenador.count({
      where: { combatesGanados: { [Op.gt]: eg } },
    });
    const rank = betterCount + 1;

    return res.json({ entrenador, kd, rank });
  } catch (error) {
    console.error("getEntrenadorInfo error:", error);
    return res
      .status(500)
      .json({ error: "Error al obtener información del entrenador" });
  }
};

// Obtener ranking global (lista de entrenadores ordenada)
exports.getGlobalRanking = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const offset = parseInt(req.query.offset || "0", 10);

    const entrenadores = await db.entrenador.findAll({
      attributes: [
        "id",
        "nombre",
        "sexo",
        "pokedolares",
        "nivel",
        "experiencia",
        "combatesJugados",
        "combatesGanados",
      ],
      order: [
        ["combatesGanados", "DESC"],
        ["nivel", "DESC"],
      ],
      limit,
      offset,
    });

    const resultado = entrenadores.map((e) => {
      const ej = e.combatesJugados || 0;
      const eg = e.combatesGanados || 0;
      const losses = Math.max(0, ej - eg);
      const kd = losses > 0 ? +(eg / losses).toFixed(2) : eg;
      return { entrenador: e, kd };
    });

    return res.json({ total: resultado.length, rows: resultado });
  } catch (error) {
    console.error("getGlobalRanking error:", error);
    return res.status(500).json({ error: "Error al obtener ranking global" });
  }
};
