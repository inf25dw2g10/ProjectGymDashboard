import React from 'react';
import PropTypes from 'prop-types';

/**
 * PlanoCard - apresenta um plano de treino.
 *
 * - Clicar no card (fora dos botões) navega para exercícios com filtro de plano
 * - Botões de editar/apagar ficam sempre no rodapé, independente da descrição
 * - Descrição truncada a 2 linhas para cards uniformes
 */

const OBJETIVO_META = {
  emagrecimento: 'Emagrecimento',
  hipertrofia:   'Hipertrofia',
  resistencia:   'Resistência',
  flexibilidade: 'Flexibilidade',
  saude_geral:   'Saúde Geral',
};

const PlanoCard = ({ plano, nomeCliente, onEditar, onApagar, onVerExercicios }) => {
  const objLabel = OBJETIVO_META[plano.objetivo] || plano.objetivo;
  const temAcoes = onEditar || onApagar;

  const subtexto = nomeCliente
    ? { label: 'Cliente', nome: nomeCliente }
    : plano.treinador
      ? { label: 'Treinador', nome: plano.treinador.displayName || plano.treinador.username }
      : null;

  const handleCardClick = () => {
    if (onVerExercicios) onVerExercicios(plano.id);
  };

  return (
    <article
      className={`pc-card${onVerExercicios ? ' pc-card--clickable' : ''}`}
      onClick={handleCardClick}
      role={onVerExercicios ? 'button' : undefined}
      tabIndex={onVerExercicios ? 0 : undefined}
      onKeyDown={onVerExercicios ? (e) => { if (e.key === 'Enter') handleCardClick(); } : undefined}
    >

      {/* ── Corpo (cresce para empurrar o rodapé para baixo) ── */}
      <div className="pc-card__body">

        {/* Cabeçalho */}
        <div className="pc-card__header">
          <div className="pc-card__titles">
            <h3 className="pc-card__titulo">{plano.titulo}</h3>
            <span className="pc-card__tipo">
              {plano.tipo === 'pessoal' ? 'Pessoal' : 'Profissional'}
            </span>
          </div>
          <span
            className={`pc-card__status ${plano.ativo ? 'pc-card__status--on' : 'pc-card__status--off'}`}
          >
            {plano.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Descrição - truncada a 2 linhas */}
        <p className="pc-card__desc">
          {plano.descricao || <span className="pc-card__desc--vazia">Sem descrição</span>}
        </p>

        {/* Meta row */}
        <div className="pc-card__meta">
          <span className="pc-card__badge">{objLabel}</span>
          <span className="pc-card__detail">{plano.duracaoSem} sem.</span>
          {subtexto && (
            <span className="pc-card__detail">{subtexto.label}: <strong>{subtexto.nome}</strong></span>
          )}
        </div>

      </div>

      {/* ── Rodapé - sempre no fundo do card ── */}
      {temAcoes && (
        <div
          className="pc-card__acoes"
          onClick={(e) => e.stopPropagation()} // não propaga click do card
        >
          {onEditar && (
            <button
              className="pc-card__btn pc-card__btn--edit"
              onClick={() => onEditar(plano)}
            >
              Editar
            </button>
          )}
          {onApagar && (
            <button
              className="pc-card__btn pc-card__btn--delete"
              onClick={() => onApagar(plano.id)}
            >
              Apagar
            </button>
          )}
        </div>
      )}

    </article>
  );
};

PlanoCard.propTypes = {
  plano: PropTypes.shape({
    id:         PropTypes.number.isRequired,
    titulo:     PropTypes.string.isRequired,
    descricao:  PropTypes.string,
    objetivo:   PropTypes.string.isRequired,
    duracaoSem: PropTypes.number.isRequired,
    tipo:       PropTypes.oneOf(['pessoal', 'profissional']).isRequired,
    ativo:      PropTypes.bool,
    treinador:  PropTypes.shape({
      username:    PropTypes.string,
      displayName: PropTypes.string,
    }),
  }).isRequired,
  nomeCliente:     PropTypes.string,
  onEditar:        PropTypes.func,
  onApagar:        PropTypes.func,
  onVerExercicios: PropTypes.func,
};

PlanoCard.defaultProps = {
  nomeCliente:     null,
  onEditar:        null,
  onApagar:        null,
  onVerExercicios: null,
};

export default PlanoCard;
