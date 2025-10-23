// controllers/entrenador.controller.js
const bcrypt = require('bcryptjs');
const db = require('../models');

const { sequelize } = db;
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

exports.crearEntrenador = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nombre, correo, password, sexo, apodo, vidaMax, ataque } = req.body;

    let { movimientos } = req.body;
    if (movimientos && !Array.isArray(movimientos) && typeof movimientos === 'object') {
      movimientos = Object.values(movimientos);
    }
    if (!Array.isArray(movimientos)) movimientos = [];
    const movIds = [...new Set(movimientos.map(Number).filter(Number.isFinite))].slice(0, 4);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const nuevoEntrenador = await db.entrenador.create({
      nombre,
      correo,
      password: hashed,
      sexo,
      pokedolares: 1000,
    }, { transaction: t });

    const pokemonInicial = await db.pokemonEntrenador.create({
      entrenadorId: nuevoEntrenador.id,
      apodo,
      vidaMax:vidaMax,
      vidaActual:vidaMax,
      ataque: ataque
    }, { transaction: t });

    if (movIds.length) {
      const rows = movIds.map(movId => ({
        pokemonEntrenadorId: pokemonInicial.id,
        movimientoId: movId,
      }));
      await db.movimientoPokemon.bulkCreate(rows, {
        transaction: t,
        ignoreDuplicates: true,
      });
    }

    await db.EntrenadorObjeto.bulkCreate([
      { entrenadorId: nuevoEntrenador.id, objetoId: 1, cantidad: 2 },
      { entrenadorId: nuevoEntrenador.id, objetoId: 2, cantidad: 5 },
    ], { transaction: t });

    await t.commit();

    return res.status(201).json({
      msg: 'Entrenador y Pokémon creados',
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
    if (t.finished !== 'commit') {
      try { await t.rollback(); } catch (_) {}
    }
    console.error('crearEntrenador error:', error);
    return res.status(500).json({ msg: 'Error al crear el entrenador' });
  }
};
