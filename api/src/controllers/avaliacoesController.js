const { Op } = require('sequelize');
const { AvaliacaoFisica, Utilizador, PlanoTreino } = require('../../models');

const atribsUtilizador = ['id', 'username', 'displayName', 'email', 'role'];

function calcularImc(pesoKg, alturaCm) {
  if (!pesoKg || !alturaCm || alturaCm === 0) return null;
  const alturaM = alturaCm / 100;
  return parseFloat((pesoKg / (alturaM * alturaM)).toFixed(2));
}

/**
 * Âmbito do treinador = tem plano profissional OU avaliação profissional com ele.
 * Devolve Set de clienteIds.
 */
async function idsClientesDoTreinador(treinadorId) {
  const [planos, avaliacoes] = await Promise.all([
    PlanoTreino.findAll({
      where: { treinadorId, tipo: 'profissional' },
      attributes: ['clienteId']
    }),
    AvaliacaoFisica.findAll({
      where: { treinadorId, tipo: 'profissional' },
      attributes: ['clienteId']
    })
  ]);
  const ids = new Set();
  planos.forEach((p)    => ids.add(p.clienteId));
  avaliacoes.forEach((a) => ids.add(a.clienteId));
  return ids;
}

/* ─── listar ────────────────────────────────────────────────── */

async function listar(req, res) {
  try {
    const clienteIdQuery   = req.query.cliente_id;
    const treinadorIdQuery = req.query.treinador_id;
    let where = {};

if (req.user.role === 'cliente') {
      where = { clienteId: req.user.id };
    } else if (req.user.role === 'treinador') {
      const ids = await idsClientesDoTreinador(req.user.id);
      if (ids.size === 0) return res.status(200).json([]);
      // Treinador só vê avaliações profissionais - nunca as pessoais do cliente
      where = { clienteId: { [Op.in]: [...ids] }, tipo: 'profissional' };
    }

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

    if (clienteIdQuery !== undefined && clienteIdQuery !== null && String(clienteIdQuery).trim() !== '') {
      if (req.user.role === 'cliente') {
        return res.status(403).json({ erro: 'Filtro cliente_id só pode ser usado por admin ou treinador.' });
      }
      const cid = Number(clienteIdQuery);
      if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ erro: 'cliente_id inválido.' });
      }
      if (req.user.role === 'treinador') {
        const ids = await idsClientesDoTreinador(req.user.id);
        if (!ids.has(cid)) {
          return res.status(403).json({ erro: 'Acesso negado. Este cliente não está no seu âmbito.' });
        }
      }
      where = { ...where, clienteId: cid };
    }

    const includeList = [
      { model: Utilizador, as: 'cliente', attributes: atribsUtilizador },
      { model: Utilizador, as: 'treinador', attributes: ['id', 'username', 'displayName'] },
    ];

    const avaliacoes = await AvaliacaoFisica.findAll({
      where,
      attributes: { exclude: ['treinadorId'] },
      include: includeList,
      order: [['data', 'DESC']]
    });

    return res.status(200).json(avaliacoes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── obter ─────────────────────────────────────────────────── */

async function obter(req, res) {
  try {
    const avaliacao = await AvaliacaoFisica.findByPk(req.params.id, {
      include: [{ model: Utilizador, as: 'cliente', attributes: atribsUtilizador }]
    });

    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada.' });

    if (req.user.role === 'cliente' && avaliacao.clienteId !== req.user.id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    if (req.user.role === 'treinador') {
      const ids = await idsClientesDoTreinador(req.user.id);
      if (!ids.has(avaliacao.clienteId)) {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
    }

    const { treinadorId: _, ...dados } = avaliacao.toJSON();
    return res.status(200).json(dados);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── criar ─────────────────────────────────────────────────── */

async function criar(req, res) {
  const { data, pesoKg, alturaCm, percGordura, notas } = req.body;
  const clienteIdPayload  = req.body.clienteId  ?? req.body.cliente_id;
  const treinadorIdPayload = req.body.treinadorId ?? req.body.treinador_id;

  if (!data) {
    return res.status(400).json({ erro: 'data é obrigatória.' });
  }
  if (req.user?.role === 'cliente' && (!pesoKg || !alturaCm)) {
    return res.status(400).json({ erro: 'pesoKg e alturaCm são obrigatórios.' });
  }

  try {
    let clienteIdFinal, tipo;

    if (req.user.role === 'cliente') {
      if (clienteIdPayload !== undefined && clienteIdPayload !== null && Number(clienteIdPayload) !== req.user.id) {
        return res.status(403).json({ erro: 'clienteId inválido. Cliente só pode criar avaliação para si próprio.' });
      }
      clienteIdFinal = req.user.id;
      tipo           = 'pessoal';

    } else {
      if (!clienteIdPayload) {
        return res.status(400).json({ erro: 'clienteId é obrigatório para treinadores.' });
      }
      const cliente = await Utilizador.findByPk(clienteIdPayload);
      if (!cliente || cliente.role !== 'cliente') {
        return res.status(400).json({ erro: 'clienteId inválido. Deve referenciar um utilizador com role cliente.' });
      }

      if (req.user.role === 'treinador') {
        if (Number(clienteIdPayload) === req.user.id) {
          return res.status(400).json({ erro: 'Treinador não pode criar autoavaliações.' });
        }
        // Valida que o cliente não está associado a OUTRO treinador (nem por planos nem por avaliações)
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
      }

      clienteIdFinal = clienteIdPayload;
      // tipo determinado depois, quando soubermos o treinadorId final
      tipo           = 'profissional'; // placeholder, corrigido abaixo para admin
    }

    // Para admin: usa treinadorId do body se fornecido, senão null
    // Para treinador: é sempre req.user.id (já validado acima)
    // Para cliente: sempre null (pessoal)
    let treinadorIdFinal;
    if (req.user.role === 'cliente') {
      treinadorIdFinal = null;
    } else if (req.user.role === 'admin') {
      treinadorIdFinal = treinadorIdPayload ? Number(treinadorIdPayload) : null;
      // Admin sem treinador → avaliação pessoal (em nome do cliente)
      tipo = treinadorIdFinal ? 'profissional' : 'pessoal';
    } else {
      treinadorIdFinal = req.user.id;
    }

    const avaliacao = await AvaliacaoFisica.create({
      clienteId:   clienteIdFinal,
      treinadorId: treinadorIdFinal,
      tipo,
      data,
      pesoKg:      pesoKg      || null,
      alturaCm:    alturaCm    || null,
      percGordura: percGordura || null,
      imc:         calcularImc(pesoKg, alturaCm),
      notas:       notas       || null
    });

    return res.status(201).json({ mensagem: 'Avaliação criada com sucesso.', id: avaliacao.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── atualizar ──────────────────────────────────────────────── */

async function atualizar(req, res) {
  try {
    const avaliacao = await AvaliacaoFisica.findByPk(req.params.id);
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada.' });

    if (req.user.role === 'cliente') {
      if (avaliacao.clienteId !== req.user.id) {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      if (avaliacao.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente não pode editar avaliações profissionais.' });
      }
    } else if (req.user.role === 'treinador') {
      if (avaliacao.tipo !== 'profissional') {
        return res.status(403).json({ erro: 'Treinador só pode editar avaliações profissionais.' });
      }
      if (avaliacao.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Treinador só pode editar avaliações profissionais do seu âmbito.' });
      }
    }

    const { data, pesoKg, alturaCm, percGordura, notas } = req.body;

    // Cliente: peso e altura são obrigatórios - têm de existir no body ou já na avaliação
    if (req.user.role === 'cliente') {
      const pesoFinal   = pesoKg   ?? avaliacao.pesoKg;
      const alturaFinal = alturaCm ?? avaliacao.alturaCm;
      if (!pesoFinal || !alturaFinal) {
        return res.status(400).json({ erro: 'pesoKg e alturaCm são obrigatórios.' });
      }
    }

    await avaliacao.update({
      data:        data        ?? avaliacao.data,
      pesoKg:      pesoKg      ?? avaliacao.pesoKg,
      alturaCm:    alturaCm    ?? avaliacao.alturaCm,
      percGordura: percGordura ?? avaliacao.percGordura,
      imc:         calcularImc(pesoKg ?? avaliacao.pesoKg, alturaCm ?? avaliacao.alturaCm),
      notas:       notas       ?? avaliacao.notas
    });

    return res.status(200).json({ mensagem: 'Avaliação atualizada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

/* ─── apagar ─────────────────────────────────────────────────── */

async function apagar(req, res) {
  try {
    const avaliacao = await AvaliacaoFisica.findByPk(req.params.id);
    if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada.' });

    if (req.user.role === 'cliente') {
      if (avaliacao.clienteId !== req.user.id) {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      if (avaliacao.tipo !== 'pessoal') {
        return res.status(403).json({ erro: 'Cliente não pode apagar avaliações profissionais.' });
      }
    } else if (req.user.role === 'treinador') {
      if (avaliacao.tipo !== 'profissional') {
        return res.status(403).json({ erro: 'Treinador só pode apagar avaliações profissionais.' });
      }
      if (avaliacao.treinadorId !== req.user.id) {
        return res.status(403).json({ erro: 'Treinador só pode apagar avaliações profissionais do seu âmbito.' });
      }
    }

    await avaliacao.destroy();
    return res.status(200).json({ mensagem: 'Avaliação apagada com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
}

module.exports = { listar, obter, criar, atualizar, apagar };