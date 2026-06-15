import React from 'react';
import PropTypes from 'prop-types';
import ListItemActions from '../common/ListItemActions';

/**
 * MetaItem
 * Componente Stateless - apresenta uma meta com barra de progresso.
 * Emite onEditar e onApagar via callbacks para o pai (lifting state up).
 */

const ESTADO_BADGE = {
  ativa:     'pg-badge',
  concluida: 'pg-badge pg-badge--ok',
  cancelada: 'pg-badge pg-badge--error',
};

const ESTADO_LABEL = {
  ativa:     'Ativa',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const MetaItem = ({ meta, soPessoal, onEditar, onApagar, ocultarBadgeTipo }) => {
  const badgeClass = ESTADO_BADGE[meta.estado] || ESTADO_BADGE.ativa;
  const estadoLabel = ESTADO_LABEL[meta.estado] || ESTADO_LABEL.ativa;

  // Resolve nome do treinador: via objeto nested ou via lista de treinadores + plano.treinadorId
  const treinadorNome = (() => {
    if (meta.treinador) return meta.treinador.displayName || meta.treinador.username;
    const treinadorId = meta.plano?.treinadorId;
    if (!treinadorId || !treinadores?.length) return null;
    const t = treinadores.find((u) => u.id === treinadorId);
    return t ? (t.displayName || t.username) : null;
  })();

  const progresso = meta.valorAlvo && meta.valorAlvo > 0
    ? Math.min(100, Math.round((meta.valorAtual / meta.valorAlvo) * 100))
    : null;

  const prazoFormatado = meta.prazo
    ? new Date(meta.prazo + 'T00:00:00').toLocaleDateString('pt-PT')
    : null;

  // soPessoal=true  → modo cliente: só edita se for meta pessoal própria
  // soPessoal=false → modo treinador/admin: sempre pode editar/apagar
  const podeEditar = soPessoal ? meta.tipo === 'pessoal' : true;

  return (
    <div className="meta-item">
      <div className="meta-item__top">
        <div>
          <p className="meta-item__desc">{meta.descricao}</p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.2rem' }}>
            {meta.tipo && !ocultarBadgeTipo && (
              <span
                className={meta.tipo === 'profissional' ? 'pg-badge pg-badge--ok' : 'pg-badge'}
                style={{ fontSize: '0.7rem' }}
              >
                {meta.tipo === 'profissional' ? 'Profissional' : 'Pessoal'}
              </span>
            )}
            {meta.plano && (
              <span className="meta-item__plano">{meta.plano.titulo}</span>
            )}
            {!soPessoal && meta.cliente && (
              <span className="meta-item__plano" style={{ marginLeft: 0 }}>
                · {meta.cliente.displayName || meta.cliente.username}
              </span>
            )}
            {!soPessoal && treinadorNome && (
              <span className="meta-item__plano" style={{ marginLeft: 0 }}>
                · Treinador: {treinadorNome}
              </span>
            )}
          </div>
        </div>
        <span className={badgeClass}>
          {estadoLabel}
        </span>
      </div>

      {progresso !== null && (
        <>
          <div className="meta-item__progress-labels">
            <span className="meta-item__progress-text">
              {meta.valorAtual} / {meta.valorAlvo} {meta.unidade || ''}
            </span>
            <span className="meta-item__progress-pct">{progresso}%</span>
          </div>
          <div className="meta-item__progress-bar">
            <div
              className={`meta-item__progress-fill${progresso >= 100 ? ' meta-item__progress-fill--done' : ''}`}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </>
      )}

      <div className="meta-item__bottom">
        {prazoFormatado && (
          <span className="meta-item__prazo">Prazo: {prazoFormatado}</span>
        )}
        {podeEditar && (
          <ListItemActions
            onEditar={() => onEditar(meta)}
            onApagar={() => onApagar(meta.id)}
          />
        )}
      </div>
    </div>
  );
};

MetaItem.propTypes = {
  meta: PropTypes.shape({
    id:          PropTypes.number.isRequired,
    descricao:   PropTypes.string.isRequired,
    valorAlvo:   PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    valorAtual:  PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    unidade:     PropTypes.string,
    prazo:       PropTypes.string,
    estado:      PropTypes.oneOf(['ativa', 'concluida', 'cancelada']).isRequired,
    tipo:        PropTypes.oneOf(['pessoal', 'profissional']).isRequired,
    plano:       PropTypes.shape({ titulo: PropTypes.string }),
    treinador:   PropTypes.shape({ displayName: PropTypes.string, username: PropTypes.string }),
  }).isRequired,
  soPessoal: PropTypes.bool,
  onEditar:  PropTypes.func.isRequired,
  onApagar:  PropTypes.func.isRequired,
  ocultarBadgeTipo: PropTypes.bool,
};

MetaItem.defaultProps = {
  soPessoal: false,
  ocultarBadgeTipo: false,
};

export default MetaItem;
