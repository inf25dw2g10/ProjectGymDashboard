import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';

import AuthService from './auth/AuthService';

// Rotas protegidas
import RoleRoute    from './routes/RoleRoute';

// Páginas
import LoginPage        from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import AdminDashboard   from './pages/admin/AdminDashboard';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import ClientDashboard  from './pages/client/ClientDashboard';

/**
 * App
 * Componente raiz. Gere todas as rotas da aplicação.
 * Class Component porque no futuro pode precisar de gerir estado global de auth.
 *
 * Estrutura de rotas:
 *   /login           → público
 *   /oauth/callback  → público
 *   /unauthorized    → público
 *   /admin           → só admin
 *   /trainer         → só treinador
 *   /client          → só cliente
 *   /                → redireciona para o dashboard correto por role
 */
class App extends React.Component {
  render() {
    return (
      <Router>
        <Switch>

          {/* Rotas públicas */}
          <Route path="/login"        component={LoginPage} />
          <Route path="/unauthorized" component={UnauthorizedPage} />
          <Route path="/oauth/callback" component={OAuthCallbackPage} />

          {/* Rotas protegidas por role */}
          <RoleRoute
            path="/admin"
            component={AdminDashboard}
            allowedRoles={['admin']}
          />
          <RoleRoute
            path="/trainer"
            component={TrainerDashboard}
            allowedRoles={['treinador']}
          />
          <RoleRoute
            path="/client"
            component={ClientDashboard}
            allowedRoles={['cliente']}
          />

          {/* Raiz - redireciona para o dashboard correto */}
          <Route
            exact
            path="/"
            render={() => {
              if (!AuthService.isLoggedIn()) return <Redirect to="/login" />;
              const role = AuthService.getUserRole();
              if (role === 'admin')     return <Redirect to="/admin" />;
              if (role === 'treinador') return <Redirect to="/trainer" />;
              return <Redirect to="/client" />;
            }}
          />

          {/* Qualquer rota desconhecida → raiz */}
          <Redirect to="/" />

        </Switch>
      </Router>
    );
  }
}

export default App;
