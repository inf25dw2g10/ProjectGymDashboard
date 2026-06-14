const { PlanoTreino, Utilizador } = require('../../models');
const { Op } = require('sequelize');

const OBJETIVOS_VALIDOS = ['emagrecimento', 'hipertrofia', 'resistencia', 'flexibilidade', 'saude_geral'];
const atribsUtilizador  = ['id', 'username', 'displayName', 'email', 'avatarUrl', 'role'];

/* ─── listar ────────────────────────────────────────────────── */

async function listar(req, res) {
  try {
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
        // Treinador só pode filtrar clientes do seu âmbito profissional
        const planosProfissionaisCliente = await PlanoTreino.findAll({
          where: { clienteId: clienteIdFiltro, tipo: 'profissional' },
          attributes: ['treinadorId']
        });
        const clienteTemPlanoProfissional = planosProfissionaisCliente.length > 0;
        const clienteAssociadoAoTreinador = planosProfissionaisCliente.some((p) => p.treinadorId === req.user.id);

        if (!clienteAssociadoAoTreinador && clienteTemPlanoProfissional) {
          return res.status(403).json({ erro: 'Acesso negado. Este cliente não está no seu âmbito.' });
        }

        where = { clienteId: clienteIdFiltro, tipo: 'profissional', treinadorId: req.user.id };
      } else {
        // admin
        where = { ...where, clienteId: clienteIdFiltro };
      }
    }

    const planos = await PlanoTreino.findAll({
      where,
      include: [
        { model: Utilizador, as: 'treinador', attributes: atribsUtilizador },
        { model: Utilizador, as: 'cliente',   attributes: atribsUtilizador }
      ],
      order: [['id', 'ASC']]
    });

    return res.status(200).json(planos);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── obter ─────────────────────────────────────────────────── */

async function obter(req, res) {
  try {
    const plano = await PlanoTreino.findByPk(req.params.id, {
      include: [
        { model: Utilizador, as: 'treinador', attributes: atribsUtilizador },
        { model: Utilizador, as: 'cliente',   attributes: atribsUtilizador }
      ]
    });

    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });

    if (req.user.role === 'cliente' && plano.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado. Este plano não é seu.' });
    }
    if (req.user.role === 'treinador' && plano.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado. Este plano não é seu.' });
    }

    return res.status(200).json(plano);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── criar ─────────────────────────────────────────────────── */

async function criar(req, res) {
  const { titulo, descricao, objetivo, duracaoSem } = req.body;
  const clienteIdPayload  = req.body.clienteId  ?? req.body.cliente_id;
  const treinadorIdPayload = req.body.treinadorId ?? req.body.treinador_id;

  if (!titulo || !objetivo || !duracaoSem) {
    return res.status(400).json({ erro: 'titulo, objetivo e duracaoSem são obrigatórios.' });
  }
  if (!OBJETIVOS_VALIDOS.includes(objetivo)) {
    return res.status(400).json({ erro: `objetivo deve ser um de: ${OBJETIVOS_VALIDOS.join(', ')}` });
  }

  try {
    let tipo, treinadorId, clienteIdFinal;

    if (req.user.role === 'cliente') {
      // Cliente: plano pessoal para si próprio
      if (clienteIdPayload !== undefined && clienteIdPayload !== null && Number(clienteIdPayload) !== req.user.id) {
        return res.status(403).json({ erro: 'clienteId inválido. Cliente só pode criar plano para si próprio.' });
      }
      if (treinadorIdPayload !== undefined && treinadorIdPayload !== null) {
        return res.status(403).json({ erro: 'Cliente não pode associar treinador ao plano pessoal.' });
      }
      tipo           = 'pessoal';
      treinadorId    = null;
      clienteIdFinal = req.user.id;

    } else {
      // Treinador / admin: plano profissional para um cliente
      if (!clienteIdPayload) {
        return res.status(400).json({ erro: 'clienteId é obrigatório para treinadores.' });
      }

      const cliente = await Utilizador.findByPk(clienteIdPayload);
      if (!cliente || cliente.role !== 'cliente') {
        return res.status(400).json({ erro: 'clienteId inválido. Deve referenciar um utilizador com role cliente.' });
      }

      if (req.user.role === 'treinador') {
        if (Number(clienteIdPayload) === req.user.id) {
          return res.status(400).json({ erro: 'Treinador não pode criar plano para si próprio.' });
        }
        if (treinadorIdPayload !== undefined && Number(treinadorIdPayload) !== req.user.id) {
          return res.status(403).json({ erro: 'Treinador não pode associar outro treinador ao plano.' });
        }
        // Verifica que o cliente não está associado a outro treinador
        // (nem por planos nem por avaliações profissionais)
        const { AvaliacaoFisica } = require('../../models');
        const [planoOutro, avalOutro] = await Promise.all([
          PlanoTreino.findOne({
            where: { clienteId: Number(clienteIdPayload), tipo: 'profissional', treinadorId: { [Op.ne]: req.user.id } }
          }),
          AvaliacaoFisica.findOne({
            where: { clienteId: Number(clienteIdPayload), tipo: 'profissional', treinadorId: { [Op.ne]: req.user.id } }
          })
        ]);
        if (planoOutro || avalOutro) {
          return res.status(403).json({ erro: 'Cliente já está associado a outro treinador.' });
        }
        treinadorId = req.user.id;
      } else {
        // admin pode especificar treinadorId ou deixar null
        // Se não tiver treinador → plano pessoal (criado pelo admin em nome do cliente)
        treinadorId = treinadorIdPayload ? Number(treinadorIdPayload) : null;
      }

      tipo           = treinadorId ? 'profissional' : 'pessoal';
      clienteIdFinal = clienteIdPayload;
    }

    const plano = await PlanoTreino.create({
      titulo,
      descricao:  descricao || null,
      objetivo,
      duracaoSem,
      tipo,
      treinadorId,
      clienteId: clienteIdFinal
    });

    return res.status(201).json({ mensagem: 'Plano criado com sucesso.', id: plano.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── atualizar ──────────────────────────────────────────────── */

async function atualizar(req, res) {
  try {
    const plano = await PlanoTreino.findByPk(req.params.id);
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });

    // Autorização
    if (req.user.role === 'treinador' && plano.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode editar planos de outro treinador.' });
    }
    if (req.user.role === 'treinador' && plano.tipo !== 'profissional') {
      return res.status(403).json({ erro: 'Treinador não pode editar planos pessoais.' });
    }
    if (req.user.role === 'cliente' && plano.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode editar planos de outro cliente.' });
    }
    if (req.user.role === 'cliente' && plano.tipo === 'profissional') {
      return res.status(403).json({ erro: 'Cliente não pode editar planos do tipo profissional.' });
    }

    const { titulo, descricao, objetivo, duracaoSem, ativo } = req.body;

    // Campos de associação (treinadorId, clienteId, tipo): só admin pode alterar
    const tentouAlterarCamposProtegidos =
      req.body.treinadorId !== undefined ||
      req.body.clienteId   !== undefined ||
      req.body.tipo        !== undefined;

    if (tentouAlterarCamposProtegidos && req.user.role !== 'admin') {
      return res.status(403).json({ erro: 'Não pode alterar treinadorId, clienteId ou tipo do plano.' });
    }

    if (objetivo && !OBJETIVOS_VALIDOS.includes(objetivo)) {
      return res.status(400).json({ erro: `objetivo deve ser um de: ${OBJETIVOS_VALIDOS.join(', ')}` });
    }

    const updateData = {
      titulo:     titulo     ?? plano.titulo,
      descricao:  descricao  ?? plano.descricao,
      objetivo:   objetivo   ?? plano.objetivo,
      duracaoSem: duracaoSem ?? plano.duracaoSem,
      ativo:      ativo      ?? plano.ativo
    };

    // Admin pode reatribuir campos de associação
    if (req.user.role === 'admin' && tentouAlterarCamposProtegidos) {
      if (req.body.treinadorId !== undefined) updateData.treinadorId = req.body.treinadorId;
      if (req.body.clienteId   !== undefined) updateData.clienteId   = req.body.clienteId;
      if (req.body.tipo        !== undefined) {
        if (!['pessoal', 'profissional'].includes(req.body.tipo)) {
          return res.status(400).json({ erro: 'tipo deve ser "pessoal" ou "profissional".' });
        }
        updateData.tipo = req.body.tipo;
      }
    }

    await plano.update(updateData);
    return res.status(200).json({ mensagem: 'Plano atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── apagar ─────────────────────────────────────────────────── */

async function apagar(req, res) {
  try {
    const { Sessao, Exercicio } = require('../../models');

    const plano = await PlanoTreino.findByPk(req.params.id, {
      include: [
        { model: Sessao,    as: 'sessoes',    attributes: ['id'] },
        { model: Exercicio, as: 'exercicios', attributes: ['id'] }
      ]
    });
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });

    // Autorização
    if (req.user.role === 'treinador' && plano.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode apagar planos de outro treinador.' });
    }
    if (req.user.role === 'treinador' && plano.tipo !== 'profissional') {
      return res.status(403).json({ erro: 'Treinador não pode apagar planos pessoais.' });
    }
    if (req.user.role === 'cliente' && plano.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Não pode apagar planos de outro cliente.' });
    }
    if (req.user.role === 'cliente' && plano.tipo !== 'pessoal') {
      return res.status(403).json({ erro: 'Cliente só pode apagar planos pessoais próprios.' });
    }

    const nSessoes    = plano.sessoes    ? plano.sessoes.length    : 0;
    const nExercicios = plano.exercicios ? plano.exercicios.length : 0;

    await plano.destroy();

    const detalhes = [];
    if (nExercicios > 0) detalhes.push(`${nExercicios} exercício(s) removido(s)`);
    if (nSessoes    > 0) detalhes.push(`${nSessoes} sessão(ões) removida(s)`);

    return res.status(200).json({
      mensagem: 'Plano apagado com sucesso.' + (detalhes.length ? ' ' + detalhes.join(', ') + '.' : '')
    });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        erro: 'Não é possível apagar este plano porque tem sessões associadas. Execute a migration 20260101000007 (npx sequelize-cli db:migrate) para ativar cascade automático.'
      });
    }
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { listar, obter, criar, atualizar, apagar };