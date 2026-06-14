import React from 'react';
import PropTypes from 'prop-types';

/**
 * ClienteCard
 * Stateless - apresenta um cliente em forma de card.
 *
 * `temTreinador` é calculado pelo pai (ClientesPage) com base nos planos carregados,
 * uma vez que o modelo Utilizador não tem campo treinadorId - a associação é feita
 * através dos PlanoTreino (profissional) que ligam cliente ↔ treinador.
 */
const ClienteCard = ({ cliente, temTreinador, onClick }) => {
  const nome = cliente.displayName || cliente.username || 'Sem nome';
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      className={`cc-card cc-card--clickable${!temTreinador ? ' cc-card--unassigned' : ''}`}
      onClick={() => onClick && onClick(cliente)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick && onClick(cliente)}
    >
      <div className="cc-avatar-wrap">
        {cliente.avatarUrl ? (
          <img src={cliente.avatarUrl} alt="avatar" className="cc-avatar-img" referrerPolicy="no-referrer" />
        ) : (
          <div className="cc-avatar-initials">{iniciais}</div>
        )}
      </div>

      <div className="cc-info">
        <span className="cc-nome">{nome}</span>
        {cliente.email && (
          <span className="cc-email">{cliente.email}</span>
        )}
        {cliente.username && cliente.displayName && (
          <span className="cc-username">@{cliente.username}</span>
        )}
      </div>

      <div className="cc-badges">
        {!temTreinador && (
          <span className="pg-badge cc-badge--no-trainer">Sem Treinador</span>
        )}
        {cliente.ativo === false && (
          <span className="pg-badge pg-badge--error">Inativo</span>
        )}
      </div>

      <div className="cc-ver-btn">Ver detalhes →</div>
    </div>
  );
};

ClienteCard.propTypes = {
  cliente: PropTypes.shape({
    id:          PropTypes.number.isRequired,
    username:    PropTypes.string,
    displayName: PropTypes.string,
    email:       PropTypes.string,
    avatarUrl:   PropTypes.string,
    role:        PropTypes.string,
    ativo:       PropTypes.bool,
  }).isRequired,
  temTreinador: PropTypes.bool,
  onClick:      PropTypes.func,
};

ClienteCard.defaultProps = {
  temTreinador: false,
  onClick:      null,
};

export default ClienteCard;
