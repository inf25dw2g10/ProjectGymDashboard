import React from 'react';
import PropTypes from 'prop-types';

/**
 * UserRow
 * Componente Stateless - representa uma linha da tabela de utilizadores.
 *
 * Recebe:
 *   - user           → objeto utilizador da API
 *   - onAlterarRole  → callback (userId, novoRole)
 *   - onApagar       → callback (userId, nome)
 *   - loadingId      → ID do utilizador cujo pedido está em curso
 */

const ROLES = ['admin', 'treinador', 'cliente'];

const UserRow = ({ user, onAlterarRole, onAbrirDrawer, loadingId }) => {
  const nome        = user.displayName || user.username || '-';
  const estaOcupado = loadingId === user.id;

  return (
    <tr
      className={`${estaOcupado ? 'adm-tr--busy' : ''} ${onAbrirDrawer ? 'adm-tr--clickable' : ''}`}
      onClick={onAbrirDrawer ? () => onAbrirDrawer(user) : undefined}
      title={onAbrirDrawer ? (
        user.role === 'admin'     ? `Ver perfil de ${nome}` :
        user.role === 'treinador' ? `Ver recursos do treinador ${nome}` :
        `Ver recursos de ${nome}`
      ) : undefined}
    >

      <td>{user.id}</td>

      <td>
        <div className="adm-user-info">
          <div className="adm-avatar">
            {nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="adm-td-name">{nome}</div>
            {user.email && <div className="adm-td-email">{user.email}</div>}
          </div>
        </div>
      </td>

      <td>
        <span className="adm-td-email">
          {user.username ? `@${user.username}` : '-'}
        </span>
      </td>

      <td>
        <span className="adm-role-badge">
          {user.role || '-'}
        </span>
      </td>

      <td onClick={(e) => e.stopPropagation()}>
        <select
          className="adm-select"
          value={user.role || ''}
          onChange={(e) => onAlterarRole(user.id, e.target.value)}
          disabled={estaOcupado}
          aria-label={`Alterar role de ${nome}`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>

      <td onClick={(e) => e.stopPropagation()}>
        {/* Botão apagar removido: rota DELETE /users/:id não implementada no backend */}
      </td>
    </tr>
  );
};

UserRow.propTypes = {
  user: PropTypes.shape({
    id:          PropTypes.number.isRequired,
    username:    PropTypes.string,
    displayName: PropTypes.string,
    email:       PropTypes.string,
    role:        PropTypes.string,
  }).isRequired,
  onAlterarRole:  PropTypes.func.isRequired,
  onAbrirDrawer:  PropTypes.func,
  loadingId:      PropTypes.number,
};

UserRow.defaultProps = {
  onAbrirDrawer: null,
  loadingId:     null,
};

export default UserRow;
