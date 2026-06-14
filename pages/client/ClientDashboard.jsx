import React from 'react';
import PropTypes from 'prop-types';
import AuthService from '../../auth/AuthService';
import apiClient   from '../../api/apiClient';
import Navbar      from '../../components/common/Navbar';

import ClientPlanosPage     from './ClientPlanosPage';
import ClientMetasPage      from './ClientMetasPage';
import ClientExerciciosPage from './ClientExerciciosPage';
import ClientSessoesPage    from './ClientSessoesPage';
import ClientAvaliacoesPage from './ClientAvaliacoesPage';

/**
 * ClientDashboard
 * Class Component - dashboard principal do cliente.
 *
 * Responsabilidades:
 *   - Carrega o perfil via GET /users/me (componentDidMount)
 *   - Gere a tab ativa (estado interno)
 *   - Passa userId para os filhos via props (Lifting State Up)
 *   - Trata logout
 *
 * Estilo: Dark Minimalist Premium - segue index.css + CSS vars
 */

const TABS = [
  { id: 'planos',     label: 'Planos'     },
  { id: 'exercicios', label: 'Exercícios' },
  { id: 'sessoes',    label: 'Sessões'    },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'metas',      label: 'Metas'      },
];

class ClientDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tabAtiva:     'planos',
      user:          null,
      filtroPlanoId: null,  // filtro a aplicar quando muda para tab exercícios
    };

    this.handleLogout          = this.handleLogout.bind(this);
    this.mudarTab              = this.mudarTab.bind(this);
    this.navegarParaExercicios = this.navegarParaExercicios.bind(this);
  }

  componentDidMount() {
    this.carregarPerfil();
  }

  async carregarPerfil() {
    try {
      const res = await apiClient.get('/users/me');
      this.setState({ user: res.data });
    } catch (_) {
      /* fallback silencioso - username default no render */
    }
  }

  handleLogout() {
    AuthService.logout();
    this.props.history.push('/login');
  }

  mudarTab(tab) {
    // Ao mudar de tab manualmente, limpa o filtro de plano
    this.setState({ tabAtiva: tab, filtroPlanoId: null });
  }

  navegarParaExercicios(planoId) {
    this.setState({ tabAtiva: 'exercicios', filtroPlanoId: planoId });
  }

  renderConteudo(userId) {
    const { tabAtiva, filtroPlanoId } = this.state;
    switch (tabAtiva) {
      case 'planos':
        return (
          <ClientPlanosPage
            userId={userId}
            onVerExercicios={this.navegarParaExercicios}
          />
        );
      case 'exercicios':
        return (
          <ClientExerciciosPage
            userId={userId}
            filtroPlanoIdInicial={filtroPlanoId}
          />
        );
      case 'sessoes':    return <ClientSessoesPage    userId={userId} />;
      case 'avaliacoes': return <ClientAvaliacoesPage userId={userId} />;
      case 'metas':      return <ClientMetasPage       userId={userId} />;
      default:           return null;
    }
  }

  render() {
    const { tabAtiva, user } = this.state;
    const username = user?.displayName || user?.username || 'Cliente';
    const userId   = user?.id ? Number(user.id) : null;
    const iniciais = username
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');

    return (
      <div className="cd-page">
        <Navbar username={username} role="cliente" onLogout={this.handleLogout} />

        <div className="cd-container">

          {/* ── Cabeçalho ── */}
          <header className="cd-header">
            {user?.avatarUrl
              ? (
                <img
                  src={user.avatarUrl}
                  alt="avatar"
                  className="cd-header__avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="cd-header__initials">{iniciais}</span>
              )
            }
            <div>
              <p className="cd-header__eyebrow">Dashboard</p>
              <h1 className="cd-header__title">
                Dashboard<span>/</span>Cliente
              </h1>
            </div>
          </header>

          {/* ── Tabs ── */}
          <nav className="cd-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={tabAtiva === tab.id}
                className={`cd-tab${tabAtiva === tab.id ? ' cd-tab--active' : ''}`}
                onClick={() => this.mudarTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ── Conteúdo ── */}
          <main className="cd-content" role="tabpanel">
            {this.renderConteudo(userId)}
          </main>

        </div>
      </div>
    );
  }
}

ClientDashboard.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default ClientDashboard;
