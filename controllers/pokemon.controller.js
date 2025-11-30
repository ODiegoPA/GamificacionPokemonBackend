const db = require("../models");
const axios = require("axios");
const { sequelize } = db;

const POKE_BASE = "https://pokeapi.co/api/v2";
const TIMEOUT_MS = 8000;

const poke = axios.create({ baseURL: POKE_BASE, timeout: TIMEOUT_MS });

const cleanText = (s) =>
  (s || "")
    .replace(/\f/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const typeIdFromUrl = (url) => {
  const m = String(url || "").match(/\/type\/(\d+)\/?$/);
  return m ? Number(m[1]) : null;
};

const getStat = (pokemon, statName) =>
  pokemon?.stats?.find((s) => s.stat?.name === statName)?.base_stat ?? 0;

const mapTypes = (pokemon) =>
  (pokemon.types || [])
    .map((t) => ({ id: typeIdFromUrl(t.type?.url), name: t.type?.name }))
    .filter((t) => t.name);

const uniqueFiniteNumbers = (arr) => [
  ...new Set(arr.map(Number).filter(Number.isFinite)),
];

const normalizeMovimientos = (movimientos) => {
  let m = movimientos;
  if (m && !Array.isArray(m) && typeof m === "object") m = Object.values(m);
  if (!Array.isArray(m)) m = [];
  return uniqueFiniteNumbers(m).slice(0, 4);
};

const pickUniqueRandom = (arr, k) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(k, a.length));
};

const fetchPokemonAndSpecies = async (id) => {
  const [pokemonRes, speciesRes] = await Promise.all([
    poke.get(`/pokemon/${id}`),
    poke.get(`/pokemon-species/${id}`),
  ]);
  return { pokemon: pokemonRes.data, species: speciesRes.data };
};

const fetchMoveByRef = async (ref) => {
  if (Number.isFinite(Number(ref))) {
    return (await poke.get(`/move/${ref}`)).data;
  }
  if (typeof ref === "string" && ref.startsWith("http")) {
    return (await axios.get(ref, { timeout: TIMEOUT_MS })).data;
  }
  return (await poke.get(String(ref))).data;
};

const spanishName = (entity) =>
  (entity?.names || []).find((n) => n.language?.name === "es")?.name ||
  entity?.name;

const movePower = (mv) => {
  const damageClass = mv?.damage_class?.name || null;
  return damageClass === "status" ? 30 : mv?.power ?? 0;
};

const moveDescriptionEs = (mv) => {
  const esEntry = (mv?.flavor_text_entries || []).find(
    (f) => f.language?.name === "es"
  );
  const anyEntry = (mv?.flavor_text_entries || [])[0];
  return cleanText(esEntry?.flavor_text || anyEntry?.flavor_text || "");
};

const moveDTOTypeObj = (mv, fallbackName) => ({
  id: mv?.id,
  name: spanishName(mv) || mv?.name || fallbackName,
  power: movePower(mv),
  type: {
    id: typeIdFromUrl(mv?.type?.url),
    name: mv?.type?.name || null,
  },
  description: moveDescriptionEs(mv),
});

exports.atraparPokemon = async (req, res) => {
  try {
    const { entrenadorId, apodo, vidaMax, ataque, idPokedex } = req.body;

    const conteoPokemon = await db.pokemonEntrenador.count({
      where: { entrenadorId },
    });
    if (conteoPokemon >= 10) {
      return res
        .status(400)
        .json({ message: "El entrenador ya tiene 10 Pokémon atrapados." });
    }

    const movIds = normalizeMovimientos(req.body.movimientos);

    const nuevoPokemon = await sequelize.transaction(async (t) => {
      const pe = await db.pokemonEntrenador.create(
        {
          idPokedex,
          entrenadorId,
          apodo,
          vidaMax,
          vidaActual: vidaMax,
          ataque,
        },
        { transaction: t }
      );

      if (movIds.length) {
        await db.movimientoPokemon.bulkCreate(
          movIds.map((movimientoId) => ({
            pokemonEntrenadorId: pe.id,
            movimientoId,
          })),
          { transaction: t, ignoreDuplicates: true }
        );
      }

      return pe;
    });

    return res.status(201).json({ nuevoPokemon });
  } catch (error) {
    console.error("Error al atrapar Pokémon:", error);
    return res.status(500).json({ message: "Error al atrapar Pokémon" });
  }
};

exports.liberarPokemon = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await db.pokemonEntrenador.destroy({ where: { id } });
    if (eliminado) return res.status(200).json({ message: "Pokémon liberado" });
    return res.status(404).json({ message: "Pokémon no encontrado" });
  } catch (error) {
    console.error("Error al liberar Pokémon:", error);
    return res.status(500).json({ message: "Error al liberar Pokémon" });
  }
};

exports.getPokemonDeEntrenador = async (req, res) => {
  try {
    const { entrenadorId } = req.params;

    const pokemonList = await db.pokemonEntrenador.findAll({
      where: { entrenadorId },
      raw: true,
    });

    if (!pokemonList.length) {
      return res.status(200).json({ pokemon: [] });
    }

    const peIds = pokemonList.map((p) => p.id);
    const pokedexIds = uniqueFiniteNumbers(
      pokemonList.map((p) => Number(p.idPokedex ?? p.pokeId))
    );

    const movRows = await db.movimientoPokemon.findAll({
      where: { pokemonEntrenadorId: peIds },
      attributes: ["pokemonEntrenadorId", "movimientoId"],
      raw: true,
    });

    const peMoves = new Map();
    for (const r of movRows) {
      const peId = Number(r.pokemonEntrenadorId);
      const mid = Number(r.movimientoId);
      if (!Number.isFinite(peId) || !Number.isFinite(mid)) continue;
      if (!peMoves.has(peId)) peMoves.set(peId, new Set());
      peMoves.get(peId).add(mid);
    }

    const pokeCache = new Map();
    await Promise.all(
      pokedexIds.map(async (pid) => {
        const { pokemon, species } = await fetchPokemonAndSpecies(pid);
        pokeCache.set(pid, {
          name: pokemon.name,
          types: mapTypes(pokemon),
          capture_rate: species.capture_rate ?? null,
        });
      })
    );

    const allMoveIds = uniqueFiniteNumbers(movRows.map((r) => r.movimientoId));
    const moveCache = new Map();
    await Promise.all(
      allMoveIds.map(async (mid) => {
        const mv = await fetchMoveByRef(mid);
        moveCache.set(Number(mid), moveDTOTypeObj(mv, String(mid)));
      })
    );

    const result = pokemonList.map((pe) => {
      const idPokedex = Number(pe.idPokedex ?? pe.pokeId);
      const pokeInfo = pokeCache.get(idPokedex) || {
        name: pe.apodo || "",
        types: [],
        capture_rate: null,
      };

      const moveIds = [...(peMoves.get(pe.id) || [])];
      const moves = moveIds.map((mid) => moveCache.get(mid)).filter(Boolean);

      return {
        id: pe.id,
        idPokedex,
        apodo: pe.apodo || pokeInfo.name,
        hpMax: pe.vidaMax,
        hpActual: pe.vidaActual,
        attack: pe.ataque,
        types: pokeInfo.types,
        capture_rate: pokeInfo.capture_rate,
        moves,
      };
    });

    return res.status(200).json({ pokemon: result });
  } catch (error) {
    console.error("Error al obtener Pokémon del entrenador:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener Pokémon del entrenador" });
  }
};

exports.generarPokemonSalvaje = async (req, res) => {
  const id = Math.floor(Math.random() * 1025) + 1;
  try {
    const { pokemon, species } = await fetchPokemonAndSpecies(id);

    const name = pokemon.name;
    const hp = getStat(pokemon, "hp") * 5;
    const attack = getStat(pokemon, "attack");
    const types = mapTypes(pokemon);

    const allMoves = (pokemon.moves || [])
      .map((m) => ({ name: m.move?.name, url: m.move?.url }))
      .filter((m) => m.name && m.url);

    const chosen = pickUniqueRandom(allMoves, 4);
    const detailedMoves = await Promise.all(
      chosen.map(async (m) => {
        const mv = await fetchMoveByRef(m.url);
        const dto = moveDTOTypeObj(mv, m.name);
        return { id: dto.id, name: dto.name, power: dto.power, type: dto.type };
      })
    );

    const capture_rate = species.capture_rate ?? null;

    return res.status(200).json({
      id,
      name,
      hp,
      attack,
      types,
      capture_rate,
      moves: detailedMoves,
    });
  } catch (err) {
    console.error("generarPokemonSalvaje error:", err?.message || err);
    return res
      .status(502)
      .json({ msg: "No se pudo generar el Pokémon salvaje" });
  }
};

exports.getPokemonById = async (req, res) => {
  try {
    const { id } = req.params;
    const pe = await db.pokemonEntrenador.findByPk(id, { raw: true });
    if (!pe)
      return res
        .status(404)
        .json({ msg: "Pokémon del entrenador no encontrado" });

    const idPokedex = Number(pe.idPokedex ?? pe.pokeId);
    if (!Number.isFinite(idPokedex)) {
      return res
        .status(400)
        .json({ msg: "El registro no tiene idPokedex/pokeId válido" });
    }

    const { pokemon, species } = await fetchPokemonAndSpecies(idPokedex);

    const apodo = pe.apodo || pokemon.name;
    const hpMax = pe.vidaMax;
    const hpActual = pe.vidaActual;
    const attack = pe.ataque;
    const types = mapTypes(pokemon);
    const capture_rate = species.capture_rate ?? null;

    const rows = await db.movimientoPokemon.findAll({
      where: { pokemonEntrenadorId: id },
      attributes: ["movimientoId"],
      raw: true,
    });
    const moveIds = uniqueFiniteNumbers(rows.map((r) => r.movimientoId));

    const moves = await Promise.all(
      moveIds.map(async (mid) => {
        const mv = await fetchMoveByRef(mid);
        return moveDTOTypeObj(mv, String(mid));
      })
    );

    return res.status(200).json({
      id,
      idPokedex,
      apodo,
      hpMax,
      hpActual,
      attack,
      types,
      capture_rate,
      moves,
    });
  } catch (err) {
    console.error("obtenerInfoDeMiPokemon error:", err?.message || err);
    return res
      .status(502)
      .json({ msg: "No se pudo obtener la información del Pokémon" });
  }
};

exports.getInfoIniciales = async (_req, res) => {
  try {
    const STARTERS = [389, 392, 395]; // Torterra, Infernape, Empoleon

    const iniciales = await Promise.all(
      STARTERS.map(async (starterId) => {
        const { pokemon } = await fetchPokemonAndSpecies(starterId);
        return {
          id: starterId,
          nombre: pokemon.name,
          hp: getStat(pokemon, "hp") * 5,
          ataque: getStat(pokemon, "attack"),
          tipos: mapTypes(pokemon),
        };
      })
    );

    return res.status(200).json({ iniciales });
  } catch (err) {
    console.error("getInfoIniciales error:", err?.message || err);
    return res
      .status(502)
      .json({ msg: "No se pudo obtener la información inicial" });
  }
};

exports.getAllMovesByPokedexId = async (req, res) => {
  try {
    const { pokedexId } = req.params;
    const { data: pokemon } = await poke.get(`/pokemon/${pokedexId}`);

    const moveRefs = (pokemon.moves || [])
      .map((m) => ({ name: m.move?.name, url: m.move?.url }))
      .filter((m) => m.name && m.url);

    if (!moveRefs.length) {
      return res.status(200).json({ pokedexId, count: 0, moves: [] });
    }

    const moves = await Promise.all(
      moveRefs.map(async (m) => {
        const mv = await fetchMoveByRef(m.url);
        const dto = moveDTOTypeObj(mv, m.name);
        return {
          id: dto.id,
          name: dto.name,
          power: dto.power,
          type: dto.type,
          description: dto.description,
        };
      })
    );

    return res.status(200).json({ pokedexId, count: moves.length, moves });
  } catch (err) {
    console.error("getAllMovesByPokedexId error:", err?.message || err);
    return res.status(502).json({ msg: "No se pudo obtener los movimientos" });
  }
};

exports.terminarCombate = async (req, res) => {
  try {
    const { id, vidaActual, entrenadorId } = req.body;

    const [pokemon, entrenador] = await Promise.all([
      db.pokemonEntrenador.findByPk(id),
      db.entrenador.findByPk(entrenadorId),
    ]);

    if (!entrenador)
      return res.status(404).json({ msg: "Entrenador no encontrado" });
    if (!pokemon) return res.status(404).json({ msg: "Pokémon no encontrado" });

    if (vidaActual <= 0) {
      entrenador.pokedolares = Math.max(0, entrenador.pokedolares - 200);
      pokemon.vidaActual = 1;
    } else {
      entrenador.pokedolares += 500;
      pokemon.vidaActual = vidaActual;
    }

    await Promise.all([entrenador.save(), pokemon.save()]);

    return res.status(200).json({
      msg: "Combate terminado",
      pokedolares: entrenador.pokedolares,
      vidaActual: pokemon.vidaActual,
    });
  } catch (error) {
    console.error("Error al terminar el combate:", error);
    return res.status(500).json({ msg: "Error al terminar el combate" });
  }
};
exports.curarPokemonDeEntrenador = async (req, res) => {
  try {
    const { entrenadorId } = req.params;

    const pokemonList = await db.pokemonEntrenador.findAll({
      where: { entrenadorId },
    });
    if (!pokemonList.length) {
      return res
        .status(200)
        .json({ message: "El entrenador no tiene Pokémon para curar." });
    }
    await Promise.all(
      pokemonList.map((pokemon) => {
        pokemon.vidaActual = pokemon.vidaMax;
        return pokemon.save();
      })
    );
    return res
      .status(200)
      .json({ message: "Todos los Pokémon han sido curados." });
  } catch (error) {
    console.error("Error al curar Pokémon del entrenador:", error);
    return res
      .status(500)
      .json({ message: "Error al curar Pokémon del entrenador" });
  }
};

// Obtener stats de los Pokémon de un entrenador: lista de pokémon con sus batallas y KD, y resumen del entrenador
exports.getEntrenadorPokemonStats = async (req, res) => {
  try {
    const { entrenadorId } = req.params;
    if (!entrenadorId)
      return res.status(400).json({ error: "entrenadorId requerido" });

    const entrenador = await db.entrenador.findByPk(entrenadorId, {
      attributes: ["id", "nombre", "combatesJugados", "combatesGanados"],
    });
    if (!entrenador)
      return res.status(404).json({ error: "Entrenador no encontrado" });

    const pokes = await db.pokemonEntrenador.findAll({
      where: { entrenadorId },
      attributes: [
        "id",
        "apodo",
        "idPokedex",
        "combatesJugados",
        "combatesGanados",
      ],
    });

    // Obtener nombres desde PokeAPI para los idPokedex presentes
    const pokedexIds = uniqueFiniteNumbers(
      pokes.map((p) => Number(p.idPokedex ?? p.pokeId))
    );
    const pokeNameMap = new Map();
    await Promise.all(
      pokedexIds.map(async (pid) => {
        try {
          const { pokemon } = await fetchPokemonAndSpecies(pid);
          pokeNameMap.set(pid, pokemon.name);
        } catch (err) {
          pokeNameMap.set(pid, null);
        }
      })
    );

    const pokemons = pokes.map((p) => {
      const pj = p.combatesJugados || 0;
      const pg = p.combatesGanados || 0;
      const losses = Math.max(0, pj - pg);
      const kd = losses > 0 ? +(pg / losses).toFixed(2) : pg;
      const idPokedex = Number(p.idPokedex ?? p.pokeId) || null;
      const nombre = idPokedex
        ? pokeNameMap.get(idPokedex) || p.apodo || null
        : p.apodo;
      return {
        id: p.id,
        apodo: p.apodo,
        nombre,
        idPokedex: idPokedex,
        combatesJugados: pj,
        combatesGanados: pg,
        kd,
      };
    });

    const ej = entrenador.combatesJugados || 0;
    const eg = entrenador.combatesGanados || 0;
    const losses = Math.max(0, ej - eg);
    const kdEntrenador = losses > 0 ? +(eg / losses).toFixed(2) : eg;

    return res.json({
      entrenador: {
        id: entrenador.id,
        nombre: entrenador.nombre,
        combatesJugados: ej,
        combatesGanados: eg,
        kd: kdEntrenador,
      },
      pokemons,
    });
  } catch (error) {
    console.error("getEntrenadorPokemonStats error:", error);
    return res.status(500).json({
      error: "Error al obtener estadísticas de Pokémon del entrenador",
    });
  }
};

exports.getGlobalPokemonRanking = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const offset = parseInt(req.query.offset || "0", 10);

    const rows = await db.pokemonEntrenador.findAll({
      attributes: [
        "id",
        "apodo",
        "idPokedex",
        "combatesJugados",
        "combatesGanados",
        "entrenadorId",
      ],
      include: [
        {
          model: db.entrenador,
          as: "entrenador",
          attributes: ["id", "nombre"],
        },
      ],
      order: [
        ["combatesGanados", "DESC"],
        ["combatesJugados", "DESC"],
      ],
      limit,
      offset,
    });

    const pokedexIds = uniqueFiniteNumbers(
      rows.map((r) => Number(r.idPokedex ?? r.pokeId))
    );
    const pokeNameMap = new Map();
    await Promise.all(
      pokedexIds.map(async (pid) => {
        try {
          const { pokemon } = await fetchPokemonAndSpecies(pid);
          pokeNameMap.set(pid, pokemon.name);
        } catch (err) {
          pokeNameMap.set(pid, null);
        }
      })
    );

    const result = rows.map((p) => {
      const pj = p.combatesJugados || 0;
      const pg = p.combatesGanados || 0;
      const losses = Math.max(0, pj - pg);
      const kd = losses > 0 ? +(pg / losses).toFixed(2) : pg;
      const idPokedex = Number(p.idPokedex ?? p.pokeId) || null;
      const nombre = idPokedex
        ? pokeNameMap.get(idPokedex) || p.apodo || null
        : p.apodo;
      return {
        id: p.id,
        apodo: p.apodo,
        nombre,
        idPokedex: idPokedex,
        combatesJugados: pj,
        combatesGanados: pg,
        kd,
        entrenador: p.entrenador
          ? { id: p.entrenador.id, nombre: p.entrenador.nombre }
          : null,
      };
    });

    return res.json({ total: result.length, rows: result });
  } catch (error) {
    console.error("getGlobalPokemonRanking error:", error);
    return res
      .status(500)
      .json({ error: "Error al obtener ranking global de Pokémon" });
  }
};

exports.getMostUsedPokemon = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const offset = parseInt(req.query.offset || "0", 10);

    const rows = await db.pokemonEntrenador.findAll({
      attributes: [
        "id",
        "apodo",
        "idPokedex",
        "vidaMax",
        "vidaActual",
        "ataque",
        "combatesJugados",
        "combatesGanados",
        "limite",
        "entrenadorId",
      ],
      include: [
        {
          model: db.entrenador,
          as: "entrenador",
          attributes: ["id", "nombre"],
        },
      ],
      order: [
        ["combatesJugados", "DESC"],
        ["combatesGanados", "DESC"],
      ],
      limit,
      offset,
    });

    const peIds = rows.map((r) => r.id);
    const pokedexIds = uniqueFiniteNumbers(
      rows.map((r) => Number(r.idPokedex ?? r.pokeId))
    );

    // Fetch pokemon names & types from PokeAPI
    const pokeInfoMap = new Map();
    await Promise.all(
      pokedexIds.map(async (pid) => {
        try {
          const { pokemon, species } = await fetchPokemonAndSpecies(pid);
          pokeInfoMap.set(pid, {
            name: pokemon.name,
            types: mapTypes(pokemon),
            capture_rate: species.capture_rate ?? null,
          });
        } catch (err) {
          pokeInfoMap.set(pid, null);
        }
      })
    );

    // Fetch move associations for these pokemonEntrenador ids
    const movRows = await db.movimientoPokemon.findAll({
      where: { pokemonEntrenadorId: peIds },
      attributes: ["pokemonEntrenadorId", "movimientoId"],
      raw: true,
    });

    const allMoveIds = uniqueFiniteNumbers(movRows.map((r) => r.movimientoId));
    const moveCache = new Map();
    await Promise.all(
      allMoveIds.map(async (mid) => {
        try {
          const mv = await fetchMoveByRef(mid);
          moveCache.set(Number(mid), moveDTOTypeObj(mv, String(mid)));
        } catch (err) {
          moveCache.set(Number(mid), null);
        }
      })
    );

    // Map moves per pokemonEntrenador
    const peMoves = new Map();
    for (const r of movRows) {
      const peId = Number(r.pokemonEntrenadorId);
      const mid = Number(r.movimientoId);
      if (!peMoves.has(peId)) peMoves.set(peId, new Set());
      peMoves.get(peId).add(mid);
    }

    const result = rows.map((p) => {
      const pj = p.combatesJugados || 0;
      const pg = p.combatesGanados || 0;
      const losses = Math.max(0, pj - pg);
      const kd = losses > 0 ? +(pg / losses).toFixed(2) : pg;
      const idPokedex = Number(p.idPokedex ?? p.pokeId) || null;
      const pokeInfo = idPokedex ? pokeInfoMap.get(idPokedex) || {} : {};

      const moveIds = [...(peMoves.get(p.id) || [])];
      const moves = moveIds.map((mid) => moveCache.get(mid)).filter(Boolean);

      return {
        id: p.id,
        apodo: p.apodo,
        nombre: pokeInfo.name || p.apodo || null,
        idPokedex: idPokedex,
        hpMax: p.vidaMax,
        hpActual: p.vidaActual,
        attack: p.ataque,
        types: pokeInfo.types || [],
        capture_rate: pokeInfo.capture_rate ?? null,
        limite: p.limite,
        moves,
        combatesJugados: pj,
        combatesGanados: pg,
        kd,
        entrenador: p.entrenador
          ? { id: p.entrenador.id, nombre: p.entrenador.nombre }
          : null,
      };
    });

    return res.json({ total: result.length, rows: result });
  } catch (error) {
    console.error("getMostUsedPokemon error:", error);
    return res
      .status(500)
      .json({ error: "Error al obtener Pokémon más usados" });
  }
};
