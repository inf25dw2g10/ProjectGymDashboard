const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { Op }  = require('sequelize');
const { Utilizador, PlanoTreino, AvaliacaoFisica } = require('../../models');
const { ensureAnyAuth, ensureRole } = require('../middleware/auth');

/**
 * Devolve o Set de clienteIds no âmbito de um treinador.
 * Âmbito = tem plano profissional OU avaliação profissional com este treinador.
 */
async function idsClientesDoTreinador(treinadorId) {
  const [planos, avaliacoes] = await Promise.all([
    PlanoTreino.findAll({
      where: { treinadorId, tipo: 'profissional', clienteId: { [Op.ne]: null } },
      attributes: ['clienteId']
    }),
    AvaliacaoFisica.findAll({
      where: { treinadorId, tipo: 'profissional' },
      attributes: ['clienteId']
    })
  ]);
  const ids = new Set();
  planos.forEach((p) => ids.add(p.clienteId));
  avaliacoes.forEach((a) => ids.add(a.clienteId));
  return ids;
}

/* ─── GET /users ─────────────────────────────────────────────── */

router.get('/', ensureAnyAuth, ensureRole('admin', 'treinador'), async (req, res) => {
  try {
    const clienteIdQuery   = req.query.cliente_id;
    const treinadorIdQuery = req.query.treinador_id;
    let where = {};

    // Filtro treinador_id (só admin)
    if (treinadorIdQuery !== undefined && treinadorIdQuery !== null && String(treinadorIdQuery).trim() !== '') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ erro: 'Filtro treinador_id só pode ser usado por admin.' });
      }
      const treinadorIdFiltro = Number(treinadorIdQuery);
      if (!Number.isInteger(treinadorIdFiltro) || treinadorIdFiltro <= 0) {
        return res.status(400).json({ erro: 'treinador_id inválido.' });
      }
      const ids = await idsClientesDoTreinador(treinadorIdFiltro);
      if (ids.size === 0) return res.status(200).json([]);
      where = { id: { [Op.in]: [...ids] }, role: 'cliente' };
    }

    // Scope para treinador
    // Guardamos idsDoTreinador aqui para reutilizar no enriquecimento com 'temTreinador' no fim
    let idsDoTreinadorCache = null;
    if (req.user.role === 'treinador') {
      // Clientes no âmbito deste treinador (planos ou avaliações profissionais)
      idsDoTreinadorCache = await idsClientesDoTreinador(req.user.id);

      // Todos os clientes que têm qualquer associação profissional a QUALQUER treinador
      const [todosPlanos, todasAvaliacoes] = await Promise.all([
        PlanoTreino.findAll({
          where: { tipo: 'profissional', treinadorId: { [Op.ne]: null }, clienteId: { [Op.ne]: null } },
          attributes: ['clienteId']
        }),
        AvaliacaoFisica.findAll({
          where: { tipo: 'profissional', treinadorId: { [Op.ne]: null } },
          attributes: ['clienteId']
        })
      ]);
      const idsComQualquerTreinador = new Set();
      todosPlanos.forEach((p)    => idsComQualquerTreinador.add(p.clienteId));
      todasAvaliacoes.forEach((a) => idsComQualquerTreinador.add(a.clienteId));

      // Clientes sem nenhum treinador (ainda disponíveis para associar)
      const clientesSemTreinador = await Utilizador.findAll({
        where: {
          role: 'cliente',
          ...(idsComQualquerTreinador.size > 0
            ? { id: { [Op.notIn]: [...idsComQualquerTreinador] } }
            : {})
        },
        attributes: ['id']
      });
      const idsSemTreinador = clientesSemTreinador.map((u) => u.id);

      const idsPermitidos = [...new Set([...idsDoTreinadorCache, ...idsSemTreinador])];
      if (idsPermitidos.length === 0) return res.status(200).json([]);

      where = { id: { [Op.in]: idsPermitidos }, role: 'cliente' };
    }

    // Filtro cliente_id adicional
    if (clienteIdQuery !== undefined && clienteIdQuery !== null && String(clienteIdQuery).trim() !== '') {
      const clienteIdFiltro = Number(clienteIdQuery);
      if (!Number.isInteger(clienteIdFiltro) || clienteIdFiltro <= 0) {
        return res.status(400).json({ erro: 'cliente_id inválido.' });
      }
      if (req.user.role === 'treinador') {
        // Só pode filtrar clientes no seu âmbito
        const ids = await idsClientesDoTreinador(req.user.id);
        const clienteTemOutroTreinador = await PlanoTreino.findOne({
          where: { clienteId: clienteIdFiltro, tipo: 'profissional', treinadorId: { [Op.ne]: req.user.id } }
        }) || await AvaliacaoFisica.findOne({
          where: { clienteId: clienteIdFiltro, tipo: 'profissional', treinadorId: { [Op.ne]: req.user.id } }
        });
        if (!ids.has(clienteIdFiltro) && clienteTemOutroTreinador) {
          return res.status(403).json({ erro: 'Acesso negado. Este cliente não está no seu âmbito.' });
        }
      }
      if (where.id && where.id[Op.in]) {
        const reduzido = where.id[Op.in].filter((id) => id === clienteIdFiltro);
        if (reduzido.length === 0) return res.status(200).json([]);
        where = { ...where, id: { [Op.in]: reduzido } };
      } else {
        where = { ...where, id: clienteIdFiltro, role: 'cliente' };
      }
    }

    const users = await Utilizador.findAll({
      where,
      attributes: ['id', 'providerId', 'provider', 'username', 'displayName', 'email', 'avatarUrl', 'role', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    // Para treinadores, enriquecer cada utilizador com flag 'temTreinador'
    // (indica se o cliente já está no âmbito deste treinador - plano ou avaliação profissional)
    // Reutiliza idsDoTreinadorCache calculado acima para evitar query duplicada.
    if (req.user.role === 'treinador' && idsDoTreinadorCache !== null) {
      const usersComFlag = users.map((u) => ({
        ...u.toJSON(),
        temTreinador: idsDoTreinadorCache.has(u.id),
      }));
      return res.status(200).json(usersComFlag);
    }

    return res.status(200).json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

/* ─── GET /users/me ──────────────────────────────────────────── */

router.get('/me', ensureAnyAuth, (req, res) => {
  const { passwordHash, apiKey, ...safe } = req.user.dataValues || req.user;
  return res.status(200).json(safe);
});

/* ─── POST /users/me/api-key ─────────────────────────────────── */

router.post('/me/api-key', ensureAnyAuth, async (req, res) => {
  try {
    const novaKey = crypto.randomBytes(32).toString('hex');
    await req.user.update({ apiKey: novaKey });
    return res.status(200).json({ mensagem: 'API key regenerada.', apiKey: novaKey });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

/* ─── PUT /users/:id/role ────────────────────────────────────── */

router.put('/:id/role', ensureAnyAuth, ensureRole('admin'), async (req, res) => {
  const rolesValidas = ['admin', 'treinador', 'cliente'];
  const { role } = req.body;

  if (!role || !rolesValidas.includes(role)) {
    return res.status(400).json({ erro: `role deve ser um de: ${rolesValidas.join(', ')}` });
  }

  try {
    const user = await Utilizador.findByPk(req.params.id);
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado.' });

    await user.update({ role });
    return res.status(200).json({ mensagem: 'Role atualizado com sucesso.', id: user.id, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
