import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import AuthService from '../auth/AuthService';

/**
 * RoleRoute
 *
 * Componente Stateless que protege uma rota por role.
 * Verifica se o utilizador está autenticado E se tem um dos roles permitidos.
 *
 * Roles da API: 'admin' | 'treinador' | 'cliente'
 *
 * Comportamento:
 *   - Não autenticado        → redireciona para /login
 *   - Autenticado, sem role  → redireciona para /unauthorized
 *   - Autenticado, com role  → renderiza o componente
 *
 * Uso:
 *   <RoleRoute path="/admin" component={AdminDashboard} allowedRoles={['admin']} />
 *   <RoleRoute path="/trainer" component={TrainerDashboard} allowedRoles={['treinador']} />
 */
const RoleRoute = ({ component: Component, allowedRoles, ...rest }) => (
  <Route
    {...rest}
    render={(props) => {
      if (!AuthService.isLoggedIn()) {
        return <Redirect to="/login" />;
      }

      const role = AuthService.getUserRole();

      if (!allowedRoles.includes(role)) {
        return <Redirect to="/unauthorized" />;
      }

      return <Component {...props} />;
    }}
  />
);

RoleRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default RoleRoute;
