const { Sessao, PlanoTreino, Utilizador } = require('../../models');
const { Op } = require('sequelize');

const atribsUtilizador = ['id', 'username', 'displayName', 'email', 'avatarUrl', 'role'];

/* ─── helpers ──────────────────────────────────────────────── */

/**
 * Verifica se o clienteId está no âmbito do treinador
 * (tem pelo menos uma sessão ou plano profissional com ele).
 * Usado para validar filtro cliente_id em operações de leitura.
 */
async function clienteNoAmbitoDoTreinador(clienteId, treinadorId) {
  const plano = await PlanoTreino.findOne({
    where: { clienteId, treinadorId, tipo: 'profissional' },
    attributes: ['id']
  });
  return plano !== null;
}

/* ─── listar ────────────────────────────────────────────────── */

async function listar(req, res) {
  try {
    const estadoQuery      = req.query.estado;
    const planoIdQuery     = req.query.plano_id;
    const clienteIdQuery   = req.query.cliente_id;
    const treinadorIdQuery = req.query.treinador_id;

    let where = {};

    // Scope base por role
    if (req.user.role === 'cliente') {
      where = { clienteId: req.user.id };
    } else if (req.user.role === 'treinador') {
      where = { treinadorId: req.user.id };
    }
    // admin: sem restrição de scope

    // Filtro treinador_id (só admin)
    if (treinadorIdQuery !== undefined && treinadorIdQuery !== null && String(treinadorIdQuery).trim() !== '') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ erro: 'Filtro treinador_id só pode ser usado por admin.' });
      }
      const treinadorIdFiltro = Number(treinadorIdQuery);
      if (!Number.isInteger(treinadorIdFiltro) || treinadorIdFiltro <= 0) {
        return res.status(400).json({ erro: 'treinador_id inválido.' });
      }
      where = { ...where, treinadorId: treinadorIdFiltro };
    }

    // Filtro estado
    if (estadoQuery) {
      const ESTADOS_VALIDOS = ['agendada', 'concluida', 'cancelada'];
      if (!ESTADOS_VALIDOS.includes(estadoQuery)) {
        return res.status(400).json({ erro: `estado deve ser um de: ${ESTADOS_VALIDOS.join(', ')}` });
      }
      where.estado = estadoQuery;
    }

    // Filtro plano_id
    if (planoIdQuery !== undefined && planoIdQuery !== null && String(planoIdQuery).trim() !== '') {
      const planoId = Number(planoIdQuery);
      if (!Number.isInteger(planoId) || planoId <= 0) {
        return res.status(400).json({ erro: 'plano_id inválido.' });
      }
      // Treinador: valida que o plano lhe pertence
      if (req.user.role === 'treinador') {
        const plano = await PlanoTreino.findByPk(planoId, { attributes: ['treinadorId'] });
        if (!plano || plano.treinadorId !== req.user.id) {
          return res.status(403).json({ erro: 'Acesso negado. Este plano não é seu.' });
        }
      }
      where.planoId = planoId;
    }

    // Filtro cliente_id
    if (clienteIdQuery !== undefined && clienteIdQuery !== null && String(clienteIdQuery).trim() !== '') {
      if (req.user.role === 'cliente') {
        return res.status(403).json({ erro: 'Filtro cliente_id só pode ser usado por admin ou treinador.' });
      }
      const clienteId = Number(clienteIdQuery);
      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({ erro: 'cliente_id inválido.' });
      }
      // Treinador: valida que o cliente está no seu âmbito
      if (req.user.role === 'treinador') {
        const noAmbito = await clienteNoAmbitoDoTreinador(clienteId, req.user.id);
        if (!noAmbito) {
          return res.status(403).json({ erro: 'Acesso negado. Este cliente não está no seu âmbito.' });
        }
      }
      where.clienteId = clienteId;
    }

    const sessoes = await Sessao.findAll({
      where,
      include: [
        { model: PlanoTreino, as: 'plano',     attributes: ['id', 'titulo', 'objetivo'] },
        { model: Utilizador,  as: 'cliente',   attributes: atribsUtilizador },
        { model: Utilizador,  as: 'treinador', attributes: atribsUtilizador }
      ],
      order: [['dataSessao', 'DESC']]
    });

    return res.status(200).json(sessoes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── obter ─────────────────────────────────────────────────── */

async function obter(req, res) {
  try {
    const sessao = await Sessao.findByPk(req.params.id, {
      include: [
        { model: PlanoTreino, as: 'plano',     attributes: ['id', 'titulo', 'objetivo'] },
        { model: Utilizador,  as: 'cliente',   attributes: atribsUtilizador },
        { model: Utilizador,  as: 'treinador', attributes: atribsUtilizador }
      ]
    });

    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' });

    if (req.user.role === 'cliente' && sessao.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado. Esta sessão não é sua.' });
    }
    if (req.user.role === 'treinador' && sessao.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado. Esta sessão não é sua.' });
    }

    return res.status(200).json(sessao);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── criar ─────────────────────────────────────────────────── */
// Rota protegida a nível de route: ensureRole('admin','treinador')

async function criar(req, res) {
  const { planoId, clienteId, dataSessao, duracaoMin, notas } = req.body;
  const treinadorIdPayload = req.body.treinadorId ?? req.body.treinador_id;

  if (!planoId || !dataSessao || !duracaoMin) {
    return res.status(400).json({ erro: 'planoId, dataSessao e duracaoMin são obrigatórios.' });
  }

  try {
    const plano = await PlanoTreino.findByPk(planoId);
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });

    if (plano.tipo !== 'profissional') {
      return res.status(403).json({ erro: 'Sessões só podem ser criadas em planos profissionais.' });
    }

    const clienteIdFinal = clienteId ? Number(clienteId) : plano.clienteId;

    const cliente = await Utilizador.findByPk(clienteIdFinal);
    if (!cliente || cliente.role !== 'cliente') {
      return res.status(400).json({ erro: 'Cliente inválido. Deve referenciar um utilizador com role cliente.' });
    }
    if (plano.clienteId !== clienteIdFinal) {
      return res.status(400).json({ erro: 'clienteId não corresponde ao cliente do plano informado.' });
    }

    let treinadorIdFinal;
    if (req.user.role === 'treinador') {
      if (plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Não pode criar sessões para planos de outro treinador.' });
      }
      if (clienteIdFinal === req.user.id) {
        return res.status(400).json({ erro: 'Treinador não pode criar sessão para si próprio.' });
      }
      treinadorIdFinal = req.user.id;
    } else {
      // admin: usa treinadorId do body se fornecido, senão usa o do plano, senão null
      treinadorIdFinal = treinadorIdPayload
        ? Number(treinadorIdPayload)
        : (plano.treinadorId ?? null);
    }

    const sessao = await Sessao.create({
      planoId,
      clienteId:   clienteIdFinal,
      treinadorId: treinadorIdFinal,
      dataSessao,
      duracaoMin,
      notas:  notas || null,
      estado: 'agendada'
    });

    return res.status(201).json({ mensagem: 'Sessão criada com sucesso.', id: sessao.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── atualizar ──────────────────────────────────────────────── */

async function atualizar(req, res) {
  try {
    const sessao = await Sessao.findByPk(req.params.id);
    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' });

    // Autorização por role
    if (req.user.role === 'cliente' && sessao.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode editar sessões de outro cliente.' });
    }
    if (req.user.role === 'treinador' && sessao.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode editar sessões de outro treinador.' });
    }

    const ESTADOS_VALIDOS = ['agendada', 'concluida', 'cancelada'];
    const { dataSessao, duracaoMin, notas, estado, clienteId, treinadorId, planoId } = req.body;

    // Cliente: só pode editar notas
    if (req.user.role === 'cliente') {
      const tentouCampoNaoPermitido =
        dataSessao  !== undefined ||
        duracaoMin  !== undefined ||
        estado      !== undefined ||
        clienteId   !== undefined ||
        treinadorId !== undefined ||
        planoId     !== undefined;

      if (tentouCampoNaoPermitido) {
        return res.status(403).json({ erro: 'Cliente só pode atualizar notas da sessão.' });
      }

      await sessao.update({ notas: notas ?? sessao.notas });
      return res.status(200).json({ mensagem: 'Sessão atualizada com sucesso.' });
    }

    // Treinador e admin: campos completos (exceto chaves de associação para não-admin)
    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ erro: `estado deve ser um de: ${ESTADOS_VALIDOS.join(', ')}` });
    }

    await sessao.update({
      dataSessao: dataSessao ?? sessao.dataSessao,
      duracaoMin: duracaoMin ?? sessao.duracaoMin,
      notas:      notas      ?? sessao.notas,
      estado:     estado     ?? sessao.estado
    });

    return res.status(200).json({ mensagem: 'Sessão atualizada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── apagar ─────────────────────────────────────────────────── */
// Rota protegida a nível de route: ensureRole('admin','treinador')

async function apagar(req, res) {
  try {
    const sessao = await Sessao.findByPk(req.params.id);
    if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada.' });

    if (req.user.role === 'treinador' && sessao.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode apagar sessões de outro treinador.' });
    }

    await sessao.destroy();
    return res.status(200).json({ mensagem: 'Sessão apagada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { listar, obter, criar, atualizar, apagar };