const { Op } = require('sequelize');
const { Meta, Utilizador, PlanoTreino } = require('../../models');

const atribsUtilizador = ['id', 'username', 'displayName', 'email', 'role'];

/* ─── listar ────────────────────────────────────────────────── */

async function listar(req, res) {
  try {
    const clienteIdQuery   = req.query.cliente_id;
    const planoIdQuery     = req.query.plano_id;
    const treinadorIdQuery = req.query.treinador_id;
    let where = {};

    // Scope base por role
    if (req.user.role === 'cliente') {
      where = { clienteId: req.user.id };
    }
    // treinador e admin: scope aplicado via JOIN ou filtros abaixo

    // Filtro plano_id
    if (planoIdQuery !== undefined && planoIdQuery !== null && String(planoIdQuery).trim() !== '') {
      const planoIdFiltro = Number(planoIdQuery);
      if (!Number.isInteger(planoIdFiltro) || planoIdFiltro <= 0) {
        return res.status(400).json({ erro: 'plano_id inválido.' });
      }
      // Treinador: valida que o plano é seu
      if (req.user.role === 'treinador') {
        const plano = await PlanoTreino.findByPk(planoIdFiltro, { attributes: ['treinadorId', 'tipo'] });
        if (!plano || plano.tipo !== 'profissional' || plano.treinadorId !== req.user.id) {
          return res.status(403).json({ erro: 'Acesso negado. Este plano não está no seu âmbito.' });
        }
      }
      where = { ...where, planoId: planoIdFiltro };
    }

    // Filtro cliente_id
    if (clienteIdQuery !== undefined && clienteIdQuery !== null && String(clienteIdQuery).trim() !== '') {
      if (req.user.role === 'cliente') {
        return res.status(403).json({ erro: 'Filtro cliente_id só pode ser usado por admin ou treinador.' });
      }
      const clienteIdFiltro = Number(clienteIdQuery);
      if (!Number.isInteger(clienteIdFiltro) || clienteIdFiltro <= 0) {
        return res.status(400).json({ erro: 'cliente_id inválido.' });
      }
      if (req.user.role === 'treinador') {
        const planosProfissionaisCliente = await PlanoTreino.findAll({
          where: { clienteId: clienteIdFiltro, tipo: 'profissional' },
          attributes: ['treinadorId']
        });
        const clienteAssociadoAoTreinador = planosProfissionaisCliente.some((p) => p.treinadorId === req.user.id);
        const clienteTemOutroTreinador    = planosProfissionaisCliente.some((p) => p.treinadorId !== req.user.id);
        if (!clienteAssociadoAoTreinador && clienteTemOutroTreinador) {
          return res.status(403).json({ erro: 'Acesso negado. Este cliente não está no seu âmbito.' });
        }
      }
      where = { ...where, clienteId: clienteIdFiltro };
    }

    // Treinador: restringe ao JOIN em planos profissionais seus (se não há filtros específicos)
    let includePlano = { model: PlanoTreino, as: 'plano', attributes: ['id', 'titulo', 'tipo'] };
    if (req.user.role === 'treinador' && !where.planoId && !where.clienteId) {
      includePlano = {
        ...includePlano,
        where:    { treinadorId: req.user.id, tipo: 'profissional' },
        required: true
      };
    }

    // Filtro treinador_id (só admin) - filtra via JOIN no plano
    let treinadorIdFiltroPlano = null;
    if (treinadorIdQuery !== undefined && treinadorIdQuery !== null && String(treinadorIdQuery).trim() !== '') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ erro: 'Filtro treinador_id só pode ser usado por admin.' });
      }
      const treinadorIdFiltro = Number(treinadorIdQuery);
      if (!Number.isInteger(treinadorIdFiltro) || treinadorIdFiltro <= 0) {
        return res.status(400).json({ erro: 'treinador_id inválido.' });
      }
      treinadorIdFiltroPlano = treinadorIdFiltro;
      includePlano = {
        ...includePlano,
        where:    { ...(includePlano.where || {}), treinadorId: treinadorIdFiltro },
        required: true
      };
    }

    const metas = await Meta.findAll({
      where,
      include: [
        { model: Utilizador, as: 'cliente', attributes: atribsUtilizador },
        includePlano
      ],
      order: [['prazo', 'ASC']]
    });

    return res.status(200).json(metas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── obter ─────────────────────────────────────────────────── */

async function obter(req, res) {
  try {
    const meta = await Meta.findByPk(req.params.id, {
      include: [
        { model: Utilizador,  as: 'cliente', attributes: atribsUtilizador },
        { model: PlanoTreino, as: 'plano',   attributes: ['id', 'titulo', 'clienteId', 'treinadorId', 'tipo'] }
      ]
    });

    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada.' });

    if (req.user.role === 'cliente' && meta.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    if (req.user.role === 'treinador') {
      if (!meta.plano || meta.plano.tipo !== 'profissional' || meta.plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
    }

    return res.status(200).json(meta);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── criar ─────────────────────────────────────────────────── */

async function criar(req, res) {
  const { planoId, descricao, valorAlvo, unidade, prazo } = req.body;
  const clienteIdPayload = req.body.clienteId ?? req.body.cliente_id;

  if (!descricao) {
    return res.status(400).json({ erro: 'descricao é obrigatória.' });
  }
  if (!planoId) {
    return res.status(400).json({ erro: 'planoId é obrigatório. Meta deve pertencer a um plano.' });
  }

  try {
    const plano = await PlanoTreino.findByPk(planoId);
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });

    let clienteIdFinal, tipo;

    if (req.user.role === 'cliente') {
      // Só pode criar em plano pessoal próprio
      if (plano.clienteId !== req.user.id) {
        return res.status(403).json({ erro: 'Cliente só pode criar metas nos seus próprios planos.' });
      }
      if (plano.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente só pode criar metas em planos pessoais.' });
      }
      if (clienteIdPayload !== undefined && clienteIdPayload !== null && Number(clienteIdPayload) !== req.user.id) {
        return res.status(403).json({ erro: 'clienteId inválido. Cliente só pode criar metas para si próprio.' });
      }
      clienteIdFinal = req.user.id;
      tipo           = 'pessoal';

    } else if (req.user.role === 'treinador') {
      // Só pode criar em planos profissionais seus
      if (plano.tipo !== 'profissional') {
        return res.status(403).json({ erro: 'Treinador só pode criar metas em planos profissionais.' });
      }
      if (plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Não pode criar metas para planos de outro treinador.' });
      }

      const clienteIdResolvido = clienteIdPayload ? Number(clienteIdPayload) : plano.clienteId;
      if (plano.clienteId !== clienteIdResolvido) {
        return res.status(400).json({ erro: 'clienteId não corresponde ao cliente do plano informado.' });
      }
      if (clienteIdResolvido === req.user.id) {
        return res.status(400).json({ erro: 'Treinador não pode criar metas para si próprio.' });
      }

      const cliente = await Utilizador.findByPk(clienteIdResolvido);
      if (!cliente || cliente.role !== 'cliente') {
        return res.status(400).json({ erro: 'clienteId inválido. Deve referenciar um utilizador com role cliente.' });
      }
      clienteIdFinal = clienteIdResolvido;
      tipo           = 'profissional';

    } else {
      // admin: acesso completo - pode criar em qualquer tipo de plano
      const clienteIdResolvido = clienteIdPayload ? Number(clienteIdPayload) : plano.clienteId;
      if (plano.clienteId !== null && plano.clienteId !== clienteIdResolvido) {
        return res.status(400).json({ erro: 'clienteId não corresponde ao cliente do plano informado.' });
      }
      const cliente = await Utilizador.findByPk(clienteIdResolvido);
      if (!cliente || cliente.role !== 'cliente') {
        return res.status(400).json({ erro: 'clienteId inválido. Deve referenciar um utilizador com role cliente.' });
      }
      clienteIdFinal = clienteIdResolvido;
      tipo           = plano.tipo === 'pessoal' ? 'pessoal' : 'profissional';
    }

    const meta = await Meta.create({
      clienteId:  clienteIdFinal,
      planoId,
      tipo,
      descricao,
      valorAlvo:  valorAlvo || null,
      valorAtual: 0,
      unidade:    unidade   || null,
      prazo:      prazo     || null,
      estado:     'ativa'
    });

    return res.status(201).json({ mensagem: 'Meta criada com sucesso.', id: meta.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── atualizar ──────────────────────────────────────────────── */

async function atualizar(req, res) {
  try {
    const meta = await Meta.findByPk(req.params.id, {
      include: [{ model: PlanoTreino, as: 'plano', attributes: ['id', 'clienteId', 'treinadorId', 'tipo'] }]
    });
    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada.' });

    if (req.user.role === 'cliente') {
      if (!meta.plano || meta.plano.clienteId !== req.user.id || meta.plano.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente só pode editar metas de planos pessoais próprios.' });
      }
    } else if (req.user.role === 'treinador') {
      if (!meta.plano || meta.plano.tipo !== 'profissional' || meta.plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Treinador só pode editar metas profissionais dos seus planos.' });
      }
    }
    // admin: sem restrição adicional

    const ESTADOS_VALIDOS = ['ativa', 'concluida', 'cancelada'];
    const { descricao, valorAlvo, valorAtual, unidade, prazo, estado } = req.body;

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ erro: `estado deve ser um de: ${ESTADOS_VALIDOS.join(', ')}` });
    }

    await meta.update({
      descricao:  descricao  ?? meta.descricao,
      valorAlvo:  valorAlvo  ?? meta.valorAlvo,
      valorAtual: valorAtual ?? meta.valorAtual,
      unidade:    unidade    ?? meta.unidade,
      prazo:      prazo      ?? meta.prazo,
      estado:     estado     ?? meta.estado
    });

    return res.status(200).json({ mensagem: 'Meta atualizada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── apagar ─────────────────────────────────────────────────── */

async function apagar(req, res) {
  try {
    const meta = await Meta.findByPk(req.params.id, {
      include: [{ model: PlanoTreino, as: 'plano', attributes: ['id', 'clienteId', 'treinadorId', 'tipo'] }]
    });
    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada.' });

    if (req.user.role === 'cliente') {
      if (!meta.plano || meta.plano.clienteId !== req.user.id || meta.plano.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente só pode apagar metas de planos pessoais próprios.' });
      }
    } else if (req.user.role === 'treinador') {
      if (!meta.plano || meta.plano.tipo !== 'profissional' || meta.plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Treinador só pode apagar metas profissionais dos seus planos.' });
      }
    }
    // admin: sem restrição adicional

    await meta.destroy();
    return res.status(200).json({ mensagem: 'Meta apagada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { listar, obter, criar, atualizar, apagar };