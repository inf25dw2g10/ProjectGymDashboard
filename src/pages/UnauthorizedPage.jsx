import React from 'react';
import { Link } from 'react-router-dom';
import AuthService from '../auth/AuthService';

/**
 * UnauthorizedPage
 * Componente Stateless - exibido quando o utilizador não tem permissão.
 * RESTYLED: Dark Minimalist
 */
const UnauthorizedPage = () => {
  const role = AuthService.getUserRole();
  const dashboardLink =
    role === 'admin' ? '/admin' :
    role === 'treinador' ? '/trainer' : '/client';

  return (
    <div className="misc-page">
      <div className="misc-card">
        <p className="misc-card__eyebrow">Acesso</p>
        <h1 className="misc-card__title">Negado</h1>
        <p className="misc-card__text">
          Não tens permissão para aceder a esta página.
        </p>
        <Link to={dashboardLink} className="misc-card__link">
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
