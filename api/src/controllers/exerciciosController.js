
const { Exercicio, PlanoTreino } = require('../../models');
const { Op } = require('sequelize');

/* ─── helper ─────────────────────────────────────────────────── */

async function ordemDuplicada(planoId, ordem, excludeId = null) {
  const where = { planoId, ordem };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return (await Exercicio.count({ where })) > 0;
}

/* ─── listar ────────────────────────────────────────────────── */

async function listar(req, res) {
  const planoIdParam   = req.query.plano_id;
  const clienteIdParam = req.query.cliente_id;

  try {
    const planoId   = planoIdParam   ? Number(planoIdParam)   : null;
    const clienteId = clienteIdParam ? Number(clienteIdParam) : null;
    const temPlanoFiltro   = planoIdParam   !== undefined && planoIdParam   !== null && String(planoIdParam).trim()   !== '';
    const temClienteFiltro = clienteIdParam !== undefined && clienteIdParam !== null && String(clienteIdParam).trim() !== '';

    if (temPlanoFiltro   && (!Number.isInteger(planoId)   || planoId   <= 0)) {
      return res.status(400).json({ erro: 'plano_id inválido.' });
    }
    if (temClienteFiltro && (!Number.isInteger(clienteId) || clienteId <= 0)) {
      return res.status(400).json({ erro: 'cliente_id inválido.' });
    }

    let wherePlano = {};

    if (req.user.role === 'cliente') {
      // Cliente não pode usar filtro cliente_id
      if (temClienteFiltro) {
        return res.status(403).json({ erro: 'Filtro cliente_id só pode ser usado por admin ou treinador.' });
      }
      wherePlano.clienteId = req.user.id;

    } else if (req.user.role === 'treinador') {
      if (temClienteFiltro) {
        // Valida âmbito: cliente deve ter plano profissional com este treinador
        const planosProfissionaisCliente = await PlanoTreino.findAll({
          where: { clienteId, tipo: 'profissional' },
          attributes: ['treinadorId']
        });
        const clienteTemPlanoProfissional  = planosProfissionaisCliente.length > 0;
        const clienteAssociadoAoTreinador  = planosProfissionaisCliente.some((p) => p.treinadorId === req.user.id);

        if (!clienteAssociadoAoTreinador && clienteTemPlanoProfissional) {
          return res.status(403).json({ erro: 'Acesso negado. Este cliente não está no seu âmbito.' });
        }
        wherePlano.clienteId = clienteId;
        wherePlano.tipo      = 'profissional';
      } else if (!temPlanoFiltro) {
        // Treinador sem filtros: exige plano_id ou cliente_id
        return res.status(400).json({ erro: 'plano_id ou cliente_id é obrigatório para treinadores.' });
      }

    } else if (req.user.role === 'admin' && temClienteFiltro) {
      wherePlano.clienteId = clienteId;
    }

    if (temPlanoFiltro) wherePlano.id = planoId;

    let planos = await PlanoTreino.findAll({
      where: wherePlano,
      attributes: ['id', 'clienteId', 'treinadorId', 'tipo'],
      order: [['id', 'ASC']]
    });

    // Treinador: filtra apenas planos em que é responsável (profissional)
    if (req.user.role === 'treinador') {
      planos = planos.filter((p) => p.treinadorId === req.user.id || p.treinadorId === null);
    }

    if (planos.length === 0) {
      if (req.user.role === 'cliente' && !temPlanoFiltro) {
        return res.status(404).json({ erro: 'Não tens planos associados, por isso não tens exercícios para listar.' });
      }
      return res.status(200).json([]);
    }

    // Valida acesso do cliente ao plano específico
    if (req.user.role === 'cliente') {
      const planoNaoPermitido = planos.find((p) => p.clienteId !== req.user.id);
      if (planoNaoPermitido) {
        return res.status(403).json({ erro: 'Acesso negado. Este plano não é seu.' });
      }
    }

    // Valida acesso do treinador ao plano específico
    if (req.user.role === 'treinador' && temPlanoFiltro) {
      const plano = planos[0];
      if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });
      if (plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Acesso negado. Este plano não é seu.' });
      }
    }

    const exercicios = await Exercicio.findAll({
      where: { planoId: { [Op.in]: planos.map((p) => p.id) } },
      order: [['planoId', 'ASC'], ['ordem', 'ASC']]
    });

    return res.status(200).json(exercicios);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── obter ─────────────────────────────────────────────────── */

async function obter(req, res) {
  try {
    const exercicio = await Exercicio.findByPk(req.params.id, {
      include: [{ model: PlanoTreino, as: 'plano', attributes: ['id', 'titulo', 'clienteId', 'treinadorId', 'tipo'] }]
    });

    if (!exercicio) return res.status(404).json({ erro: 'Exercício não encontrado.' });

    if (req.user.role === 'cliente' && exercicio.plano.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado. Este exercício não pertence a um plano seu.' });
    }
    if (req.user.role === 'treinador' && exercicio.plano.treinadorId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado. Este exercício não pertence a um plano seu.' });
    }

    return res.status(200).json(exercicio);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── criar ─────────────────────────────────────────────────── */

async function criar(req, res) {
  const { planoId, nome, grupoMuscular, series, reps, pesoKg, notas, ordem } = req.body;

  if (!planoId || !nome || !grupoMuscular || !series || !reps) {
    return res.status(400).json({ erro: 'planoId, nome, grupoMuscular, series e reps são obrigatórios.' });
  }

  try {
    const plano = await PlanoTreino.findByPk(planoId);
    if (!plano) return res.status(404).json({ erro: 'Plano não encontrado.' });

    if (req.user.role === 'cliente') {
      if (plano.clienteId !== req.user.id) {
        return res.status(403).json({ erro: 'Cliente só pode criar exercícios nos seus próprios planos.' });
      }
      if (plano.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente só pode criar exercícios em planos pessoais.' });
      }
    } else if (req.user.role === 'treinador') {
      if (plano.tipo !== 'profissional') {
        return res.status(403).json({ erro: 'Treinador só pode criar exercícios em planos profissionais.' });
      }
      if (plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Treinador só pode criar exercícios nos seus próprios planos.' });
      }
    }

    const ordemFinal = ordem ? Number(ordem) : 1;
    if (!Number.isInteger(ordemFinal) || ordemFinal < 1) {
      return res.status(400).json({ erro: 'ordem deve ser um inteiro positivo.' });
    }
    if (await ordemDuplicada(planoId, ordemFinal)) {
      return res.status(400).json({ erro: 'Já existe um exercício com esta ordem neste plano.' });
    }

    const exercicio = await Exercicio.create({
      planoId, nome, grupoMuscular, series, reps,
      pesoKg: pesoKg || null,
      notas:  notas  || null,
      ordem:  ordemFinal
    });

    return res.status(201).json({ mensagem: 'Exercício criado com sucesso.', id: exercicio.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── atualizar ──────────────────────────────────────────────── */

async function atualizar(req, res) {
  try {
    const exercicio = await Exercicio.findByPk(req.params.id, {
      include: [{ model: PlanoTreino, as: 'plano', attributes: ['id', 'clienteId', 'treinadorId', 'tipo'] }]
    });
    if (!exercicio) return res.status(404).json({ erro: 'Exercício não encontrado.' });

    const { nome, grupoMuscular, series, reps, pesoKg, notas, ordem, planoId, treinadorId, clienteId, tipo } = req.body;

    if (req.user.role === 'cliente') {
      // Pertença ao cliente
      if (exercicio.plano.clienteId !== req.user.id) {
        return res.status(403).json({ erro: 'Acesso negado. Este exercício não pertence a um plano seu.' });
      }
      // Campos de associação bloqueados para clientes
      if (planoId !== undefined || treinadorId !== undefined || clienteId !== undefined || tipo !== undefined) {
        return res.status(403).json({ erro: 'Não pode alterar associações do exercício.' });
      }

      if (exercicio.plano.tipo === 'pessoal') {
        // Plano pessoal: pode editar tudo
        await exercicio.update({
          nome:          nome          ?? exercicio.nome,
          grupoMuscular: grupoMuscular ?? exercicio.grupoMuscular,
          series:        series        ?? exercicio.series,
          reps:          reps          ?? exercicio.reps,
          pesoKg:        pesoKg        ?? exercicio.pesoKg,
          notas:         notas         ?? exercicio.notas,
          ordem:         ordem         ?? exercicio.ordem
        });
      } else {
        // Plano profissional: só series, reps, pesoKg, notas
        if (nome !== undefined || grupoMuscular !== undefined || ordem !== undefined) {
          return res.status(403).json({ erro: 'Em plano profissional, cliente só pode alterar series, reps, pesoKg e notas.' });
        }
        await exercicio.update({
          series: series ?? exercicio.series,
          reps:   reps   ?? exercicio.reps,
          pesoKg: pesoKg ?? exercicio.pesoKg,
          notas:  notas  ?? exercicio.notas
        });
      }

    } else if (req.user.role === 'treinador') {
      if (exercicio.plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Não pode editar exercícios de planos de outro treinador.' });
      }

      const novaOrdem = ordem !== undefined ? Number(ordem) : exercicio.ordem;
      if (ordem !== undefined) {
        if (!Number.isInteger(novaOrdem) || novaOrdem < 1) {
          return res.status(400).json({ erro: 'ordem deve ser um inteiro positivo.' });
        }
        if (await ordemDuplicada(exercicio.planoId, novaOrdem, exercicio.id)) {
          return res.status(400).json({ erro: 'Já existe um exercício com esta ordem neste plano.' });
        }
      }

      await exercicio.update({
        nome:          nome          ?? exercicio.nome,
        grupoMuscular: grupoMuscular ?? exercicio.grupoMuscular,
        series:        series        ?? exercicio.series,
        reps:          reps          ?? exercicio.reps,
        pesoKg:        pesoKg        ?? exercicio.pesoKg,
        notas:         notas         ?? exercicio.notas,
        ordem:         novaOrdem
      });

    } else {
      // admin: pode alterar tudo
      const novaOrdem = ordem !== undefined ? Number(ordem) : exercicio.ordem;
      if (ordem !== undefined) {
        if (!Number.isInteger(novaOrdem) || novaOrdem < 1) {
          return res.status(400).json({ erro: 'ordem deve ser um inteiro positivo.' });
        }
        if (await ordemDuplicada(exercicio.planoId, novaOrdem, exercicio.id)) {
          return res.status(400).json({ erro: 'Já existe um exercício com esta ordem neste plano.' });
        }
      }
      await exercicio.update({
        nome:          nome          ?? exercicio.nome,
        grupoMuscular: grupoMuscular ?? exercicio.grupoMuscular,
        series:        series        ?? exercicio.series,
        reps:          reps          ?? exercicio.reps,
        pesoKg:        pesoKg        ?? exercicio.pesoKg,
        notas:         notas         ?? exercicio.notas,
        ordem:         novaOrdem
      });
    }

    return res.status(200).json({ mensagem: 'Exercício atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── apagar ─────────────────────────────────────────────────── */

async function apagar(req, res) {
  try {
    const exercicio = await Exercicio.findByPk(req.params.id, {
      include: [{ model: PlanoTreino, as: 'plano', attributes: ['clienteId', 'treinadorId', 'tipo'] }]
    });
    if (!exercicio) return res.status(404).json({ erro: 'Exercício não encontrado.' });

    if (req.user.role === 'cliente') {
      if (exercicio.plano.clienteId !== req.user.id) {
        return res.status(403).json({ erro: 'Acesso negado. Este exercício não pertence a um plano seu.' });
      }
      if (exercicio.plano.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente só pode apagar exercícios de planos pessoais.' });
      }
    } else if (req.user.role === 'treinador') {
      if (exercicio.plano.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Não pode apagar exercícios de planos de outro treinador.' });
      }
    }
    // admin: sem restrição adicional

    await exercicio.destroy();
    return res.status(200).json({ mensagem: 'Exercício apagado com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { listar, obter, criar, atualizar, apagar };
