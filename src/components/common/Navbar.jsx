import React from 'react';
import PropTypes from 'prop-types';

/**
 * Navbar
 * Componente Stateless de apresentação.
 * RESTYLED: Dark Minimalist
 */
const ROLE_LABEL = {
  admin:     'Admin',
  treinador: 'Treinador',
  cliente:   'Cliente',
};

const ROLE_PATH = {
  admin:     '/admin',
  treinador: '/trainer',
  cliente:   '/client',
};

const Navbar = ({ username, role, onLogout }) => (
  <nav className="navbar">
    <div className="navbar__brand">
      <a
        href={ROLE_PATH[role] || '/'}
        className="navbar__brand-name"
        style={{ textDecoration: 'none', cursor: 'pointer' }}
      >
        Project<span>/</span>Gym
      </a>
    </div>
    <div className="navbar__right">
      <span className="navbar__role">{ROLE_LABEL[role] || role}</span>
      <span className="navbar__username">{username}</span>
      <button className="navbar__logout" onClick={onLogout}>
        Terminar sessão
      </button>
    </div>
  </nav>
);

Navbar.propTypes = {
  username: PropTypes.string.isRequired,
  role: PropTypes.oneOf(['admin', 'treinador', 'cliente']).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Navbar;
