const db = require('../models');
const axios = require('axios');
const POKE_BASE = 'https://pokeapi.co/api/v2';
const { sequelize } = db;

exports.atraparPokemon = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { entrenadorId, apodo, vidaMax, ataque, idPokedex } = req.body;
        const conteoPokemon = await db.pokemonEntrenador.count({
            where: { entrenadorId }
        });
        if (conteoPokemon >= 10) {
            return res.status(400).json({ message: 'El entrenador ya tiene 10 Pokémon atrapados.' });
        }
        let { movimientos } = req.body;
        if (movimientos && !Array.isArray(movimientos) && typeof movimientos === 'object') {
          movimientos = Object.values(movimientos);
        }
        if (!Array.isArray(movimientos)) movimientos = [];
        const movIds = [...new Set(movimientos.map(Number).filter(Number.isFinite))].slice(0, 4);
        const nuevoPokemon = await db.pokemonEntrenador.create({
            idPokedex,
            entrenadorId,
            apodo,
            vidaMax,
            vidaActual: vidaMax,
            ataque
        }, { transaction: t });
        if (movIds.length) {
              const rows = movIds.map(movId => ({
                pokemonEntrenadorId: nuevoPokemon.id,
                movimientoId: movId,
              }));
              await db.movimientoPokemon.bulkCreate(rows, {
                transaction: t,
                ignoreDuplicates: true,
              });
            }
        await t.commit();
        return res.status(201).json({ nuevoPokemon });
    } catch (error) {
        console.error('Error al atrapar Pokémon:', error);
        return res.status(500).json({ message: 'Error al atrapar Pokémon' });
    }
};

exports.liberarPokemon = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await db.pokemonEntrenador.destroy({
            where: { id }
        });
        if (eliminado) {
            return res.status(200).json({ message: 'Pokémon liberado' });
        }
        return res.status(404).json({ message: 'Pokémon no encontrado' });
    } catch (error) {
        console.error('Error al liberar Pokémon:', error);
        return res.status(500).json({ message: 'Error al liberar Pokémon' });
    }
};

exports.getPokemonDeEntrenador = async (req, res) => {
    try {
        const { entrenadorId } = req.params;
        const pokemonList = await db.pokemonEntrenador.findAll({
            where: { entrenadorId },
            raw: true
        });

        if (pokemonList.length === 0) {
            return res.status(200).json({ pokemon: [] });
        }

        const pokemonConMovimientos = await Promise.all(
            pokemonList.map(async (pokemon) => {
                const pokemonEntrenadorId = pokemon.id;

                const rows = await db.movimientoPokemon.findAll({
                    where: { pokemonEntrenadorId: pokemonEntrenadorId },
                    attributes: ['movimientoId'],
                    raw: true,
                });
                const moveIds = [...new Set(rows.map(r => Number(r.movimientoId)).filter(Number.isFinite))];

                const moves = await Promise.all(
                    moveIds.map(async (mid) => {
                        const mv = await axios.get(`${POKE_BASE}/move/${mid}`, { timeout: 8000 }).then(r => r.data);

                        const nameEs = (mv.names || []).find(n => n.language?.name === 'es')?.name || mv.name || String(mid);

                        const damageClass = mv.damage_class?.name || null;
                        const power = damageClass === 'status' ? 30 : (mv.power ?? 0);

                        const moveType = mv.type?.name || null;

                        const esEntry = (mv.flavor_text_entries || []).find(f => f.language?.name === 'es');
                        const anyEntry = (mv.flavor_text_entries || [])[0];
                        const description = cleanText(esEntry?.flavor_text || anyEntry?.flavor_text || '');

                        return {
                            id: mid,
                            name: nameEs,
                            power,
                            type: moveType,
                            description,
                        };
                    })
                );
                return {
                    ...pokemon,
                    movimientos: moves,
                };
            })
        );
        return res.status(200).json({ pokemon: pokemonConMovimientos });
    } catch (error) {
        console.error('Error al obtener Pokémon del entrenador:', error);
        return res.status(500).json({ message: 'Error al obtener Pokémon del entrenador' });
    }
};
function pickUniqueRandom(arr, k) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(k, a.length));
}

exports.generarPokemonSalvaje = async (req, res) => {
  const id = Math.floor(Math.random() * 1025) + 1;
  try {
    // Pide pokemon y species en paralelo
    const [pokemonRes, speciesRes] = await Promise.all([
      axios.get(`${POKE_BASE}/pokemon/${id}`, { timeout: 8000 }),
      axios.get(`${POKE_BASE}/pokemon-species/${id}`, { timeout: 8000 }),
    ]);

    const pokemon = pokemonRes.data;
    const species = speciesRes.data;

    // nombre, stats (hp/attack), tipos
    const name = pokemon.name;

    const hpOriginal = pokemon.stats.find(s => s.stat?.name === 'hp')?.base_stat ?? 0;
    const hp = hpOriginal * 5;
    const attack = pokemon.stats.find(s => s.stat?.name === 'attack')?.base_stat ?? 0;

    const types = (pokemon.types || []).map(t => t.type?.name).filter(Boolean);

    // movimientos: toma 4 al azar de la lista de pokemon.moves
    const allMoves = (pokemon.moves || []).map(m => ({
      name: m.move?.name,
      url: m.move?.url
    })).filter(m => m.name && m.url);

    const chosen = pickUniqueRandom(allMoves, 4);

    // Para cada movimiento, pide /move/{id} y aplica regla de potencia
    const detailedMoves = await Promise.all(
      chosen.map(async (m) => {
        const mv = await axios.get(m.url, { timeout: 8000 }).then(r => r.data);
        const nameEs =
        (mv.names || []).find(n => n.language?.name === 'es')?.name
        || m.name;
        const damageClass = mv.damage_class?.name || null;
        let power = (mv.power ?? 0);
        if (power === 0) {
            power = 30;
        }
        const moveType = mv.type?.name || null;

        return {
          id: mv.id,
          name: nameEs,
          power,
          type: moveType
        };
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
      moves: detailedMoves
    });

  } catch (err) {
    console.error('generarPokemonSalvaje error:', err?.message || err);
    return res.status(502).json({ msg: 'No se pudo generar el Pokémon salvaje' });
  }
};


const cleanText = (s) =>
  (s || '').replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

exports.getPokemonById = async (req, res) => {
  try {
    const { id } = req.params;
    const pe = await db.pokemonEntrenador.findByPk(id, { raw: true });
    if (!pe) return res.status(404).json({ msg: 'Pokémon del entrenador no encontrado' });

    const idPokedex = Number(pe.idPokedex ?? pe.pokeId);
    if (!Number.isFinite(idPokedex)) {
      return res.status(400).json({ msg: 'El registro no tiene idPokedex/pokeId válido' });
    }

    // 2) PokeAPI: /pokemon y /pokemon-species en paralelo
    const [pokemonRes, speciesRes] = await Promise.all([
      axios.get(`${POKE_BASE}/pokemon/${idPokedex}`, { timeout: 8000 }),
      axios.get(`${POKE_BASE}/pokemon-species/${idPokedex}`, { timeout: 8000 }),
    ]);
    const pokemon = pokemonRes.data;
    const species = speciesRes.data;

    const apodo = pe.apodo || pokemon.name;
    const hpMax = pe.vidaMax;
    const hpActual = pe.vidaActual;
    const attack = pe.ataque;
    const types = (pokemon.types || []).map((t) => t.type?.name).filter(Boolean);
    const capture_rate = species.capture_rate ?? null;

    // 3) BD: movimientos asociados a ese pokemonEntrenadorId
    const rows = await db.movimientoPokemon.findAll({
      where: { pokemonEntrenadorId: id },
      attributes: ['movimientoId'],
      raw: true,
    });
    const moveIds = [...new Set(rows.map(r => Number(r.movimientoId)).filter(Number.isFinite))];

    // 4) Para cada movimiento, /move/{id} → nombre ES, power, type, descripción ES
    const moves = await Promise.all(
      moveIds.map(async (mid) => {
        const mv = await axios.get(`${POKE_BASE}/move/${mid}`, { timeout: 8000 }).then(r => r.data);

        // nombre en español (fallback a mv.name)
        const nameEs = (mv.names || []).find(n => n.language?.name === 'es')?.name || mv.name || String(mid);

        // potencia con regla
        const damageClass = mv.damage_class?.name || null;
        const power = damageClass === 'status' ? 30 : (mv.power ?? 0);

        // tipo del movimiento
        const moveType = mv.type?.name || null;

        // descripción en español (si no hay, cualquier idioma)
        const esEntry = (mv.flavor_text_entries || []).find(f => f.language?.name === 'es');
        const anyEntry = (mv.flavor_text_entries || [])[0];
        const description = cleanText(esEntry?.flavor_text || anyEntry?.flavor_text || '');

        return {
          id: mid,
          name: nameEs,
          power,
          type: moveType,
          description,
        };
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
    console.error('obtenerInfoDeMiPokemon error:', err?.message || err);
    return res.status(502).json({ msg: 'No se pudo obtener la información del Pokémon' });
  }
};

exports.getInfoIniciales = async (req, res) => {
  try {
    const idTorterra = 389;
    const idInfernape = 392;
    const idEmpoleon = 395;

    const [torterraRes, infernapeRes, empoleonRes] = await Promise.all([
      axios.get(`${POKE_BASE}/pokemon/${idTorterra}`, { timeout: 8000 }),
      axios.get(`${POKE_BASE}/pokemon/${idInfernape}`, { timeout: 8000 }),
      axios.get(`${POKE_BASE}/pokemon/${idEmpoleon}`, { timeout: 8000 }),
    ]);
    const torterra = torterraRes.data;
    const infernape = infernapeRes.data;
    const empoleon = empoleonRes.data;

    const hpTorterra = (torterra.stats.find(s => s.stat?.name === 'hp')?.base_stat ?? 0) * 5;
    const attackTorterra = torterra.stats.find(s => s.stat?.name === 'attack')?.base_stat ?? 0;

    const hpInfernape = (infernape.stats.find(s => s.stat?.name === 'hp')?.base_stat ?? 0) * 5;
    const attackInfernape = infernape.stats.find(s => s.stat?.name === 'attack')?.base_stat ?? 0;

    const hpEmpoleon = (empoleon.stats.find(s => s.stat?.name === 'hp')?.base_stat ?? 0) * 5;
    const attackEmpoleon = empoleon.stats.find(s => s.stat?.name === 'attack')?.base_stat ?? 0;

    const torterraTypes = (torterra.types || []).map(t => t.type?.name).filter(Boolean);
    const infernapeTypes = (infernape.types || []).map(t => t.type?.name).filter(Boolean);
    const empoleonTypes = (empoleon.types || []).map(t => t.type?.name).filter(Boolean);

    return res.status(200).json({
      iniciales: [
        {
          id: idTorterra,
          nombre: torterra.name,
          hp: hpTorterra,
          ataque: attackTorterra,
          tipos: torterraTypes,
        },
        {
          id: idInfernape,
          nombre: infernape.name,
          hp: hpInfernape,
          ataque: attackInfernape,
          tipos: infernapeTypes,
        },
        {
          id: idEmpoleon,
          nombre: empoleon.name,
          hp: hpEmpoleon,
          ataque: attackEmpoleon,
          tipos: empoleonTypes,
        },
      ],
    });
  } catch (err) {
    console.error('getInfoIniciales error:', err?.message || err);
    return res.status(502).json({ msg: 'No se pudo obtener la información inicial' });
  }
};
exports.getAllMovesByPokedexId = async (req, res) => {
  try {
    const { pokedexId } = req.params;
    // 1) Traer el Pokémon para obtener su lista de movimientos
    const { data: pokemon } = await axios.get(`${POKE_BASE}/pokemon/${pokedexId}`, { timeout: 8000 });

    const moveRefs = (pokemon.moves || [])
      .map(m => ({ name: m.move?.name, url: m.move?.url }))
      .filter(m => m.name && m.url);

    if (!moveRefs.length) {
      return res.status(200).json({ pokedexId, count: 0, moves: [] });
    }

    // 2) Para cada movimiento: /move/{id} -> nombre ES, power (regla), tipo, descripción ES
    const moves = await Promise.all(
      moveRefs.map(async (m) => {
        const { data: mv } = await axios.get(m.url, { timeout: 8000 });

        // nombre en español (fallback al nombre base)
        const nameEs =
          (mv.names || []).find(n => n.language?.name === 'es')?.name
          || mv.name
          || m.name;

        // potencia: si damage_class === 'status' => 30, si no => mv.power || 0
        const damageClass = mv.damage_class?.name || null;
        const power = damageClass === 'status' ? 30 : (mv.power ?? 0);

        // tipo del movimiento (solo nombre)
        const type = mv.type?.name || null;

        // descripción en español (si no hay, usa la primera disponible)
        const esEntry = (mv.flavor_text_entries || []).find(f => f.language?.name === 'es');
        const anyEntry = (mv.flavor_text_entries || [])[0];
        const description = cleanText(esEntry?.flavor_text || anyEntry?.flavor_text || '');

        return { id: mv.id, name: nameEs, power, type, description };
      })
    );

    return res.status(200).json({
      pokedexId,
      count: moves.length,
      moves
    });
  } catch (err) {
    console.error('getAllMovesByPokedexId error:', err?.message || err);
    return res.status(502).json({ msg: 'No se pudo obtener los movimientos' });
  }
};
exports.terminarCombate = async (req, res) => {
    try{
      const {id, vidaActual, entrenadorId} = req.body;
      const pokemon = await db.pokemonEntrenador.findByPk(id);
      const entrenador = await db.entrenador.findByPk(entrenadorId);
      if(!entrenador){
          return res.status(404).json({msg: 'Entrenador no encontrado'});
        }
      if(!pokemon){
        return res.status(404).json({msg: 'Pokémon no encontrado'});
      }
      if (vidaActual <= 0) {
        entrenador.pokedolares = Math.max(0, entrenador.pokedolares - 200);
        pokemon.vidaActual = 1;
        await entrenador.save();
      } else {
        entrenador.pokedolares += 500;
        pokemon.vidaActual = vidaActual;
        await entrenador.save();
      }
      await pokemon.save();
      return res.status(200).json({msg: 'Combate terminado', pokedolares: entrenador.pokedolares, vidaActual: pokemon.vidaActual});
    } catch (error) {
      console.error('Error al terminar el combate:', error);
      return res.status(500).json({msg: 'Error al terminar el combate'});
    }
}