import React from 'react';
import PropTypes from 'prop-types';
import AuthService from '../../auth/AuthService';
import apiClient from '../../api/apiClient';
import Navbar from '../../components/common/Navbar';
import ClientesPage from './ClientesPage';
import PlanosPage from './PlanosPage';
import ExerciciosPage from './ExerciciosPage';
import SessoesPage from './SessoesPage';
import AvaliacoesPage from './AvaliacoesPage';
import MetasPage from './MetasPage';

const TABS = [
  { id: 'clientes',   label: 'Clientes'   },
  { id: 'planos',     label: 'Planos'     },
  { id: 'exercicios', label: 'Exercícios' },
  { id: 'sessoes',    label: 'Sessões'    },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'metas',      label: 'Metas'      },
];

class TrainerDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tabAtiva:        'clientes',
      user:             null,
      planoSelecionado: null,
      // Filtros vindos do drawer de cliente
      filtroClienteId:  null,
    };

    this.handleLogout           = this.handleLogout.bind(this);
    this.mudarTab               = this.mudarTab.bind(this);
    this.verExerciciosPlano     = this.verExerciciosPlano.bind(this);
    this.limparPlanoSelecionado = this.limparPlanoSelecionado.bind(this);
    this.trocarPlano            = this.trocarPlano.bind(this);
    this.navegarParaTab         = this.navegarParaTab.bind(this);
  }

  componentDidMount() {
    this.carregarPerfil();
  }

  async carregarPerfil() {
    try {
      const res = await apiClient.get('/users/me');
      this.setState({ user: res.data });
    } catch (_) {
      /* fallback silencioso */
    }
  }

  handleLogout() {
    AuthService.logout();
    this.props.history.push('/login');
  }

  mudarTab(tab) {
    // Ao mudar de tab manualmente, limpa o filtro de cliente
    // que possa ter vindo do drawer - o utilizador está a navegar livremente.
    this.setState({ tabAtiva: tab, filtroClienteId: null });
  }

  /**
   * Navegação a partir do drawer do cliente:
   * fecha o drawer, vai para a aba e aplica o filtro do cliente.
   */
  navegarParaTab(tab, clienteId = null) {
    this.setState({ tabAtiva: tab, filtroClienteId: clienteId });
  }

  verExerciciosPlano(plano) {
    this.setState({ planoSelecionado: plano, tabAtiva: 'exercicios' });
  }

  limparPlanoSelecionado() {
    this.setState({ planoSelecionado: null });
  }

  trocarPlano() {
    this.setState({ planoSelecionado: null, tabAtiva: 'planos' });
  }

  render() {
    const { tabAtiva, user, planoSelecionado, filtroClienteId } = this.state;
    const username  = user?.displayName || user?.username || 'Treinador';
    const trainerId = user?.id ? Number(user.id) : null;
    const iniciais  = username
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');

    return (
      <div className="dash-page">
        <Navbar username={username} role="treinador" onLogout={this.handleLogout} />

        <div className="dash-container">
          <header className="dash-welcome">
            {user?.avatarUrl
              ? (
                <img src={user.avatarUrl} alt="avatar" className="dash-welcome__avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="dash-welcome__initials">{iniciais}</span>
              )
            }
            <div>
              <p className="dash-welcome__eyebrow">Dashboard</p>
              <h1 className="dash-welcome__title">
                Dashboard<span>/</span>Treinador
              </h1>
              <p className="dash-welcome__sub">
                Gere os teus clientes, planos e sessões de treino.
              </p>
            </div>
          </header>

          <nav className="dash-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={tabAtiva === tab.id}
                className={`dash-tab${tabAtiva === tab.id ? ' dash-tab--active' : ''}`}
                onClick={() => this.mudarTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <main className="dash-content" role="tabpanel">
            {tabAtiva === 'clientes' && (
              <ClientesPage
                trainerId={trainerId}
                onNavegar={this.navegarParaTab}
              />
            )}
            {tabAtiva === 'planos' && (
              <PlanosPage
                trainerId={trainerId}
                onVerExercicios={this.verExerciciosPlano}
                filtroClienteInicial={filtroClienteId}
              />
            )}
            {tabAtiva === 'exercicios' && (
              <ExerciciosPage
                trainerId={trainerId}
                planoSelecionado={planoSelecionado}
                onLimparPlano={this.limparPlanoSelecionado}
                onTrocarPlano={this.trocarPlano}
                onIrParaPlanos={() => this.mudarTab('planos')}
              />
            )}
            {tabAtiva === 'sessoes' && (
              <SessoesPage
                trainerId={trainerId}
                filtroClienteInicial={filtroClienteId}
              />
            )}
            {tabAtiva === 'avaliacoes' && (
              <AvaliacoesPage
                trainerId={trainerId}
                filtroClienteInicial={filtroClienteId}
              />
            )}
            {tabAtiva === 'metas' && (
              <MetasPage
                trainerId={trainerId}
                filtroClienteInicial={filtroClienteId}
              />
            )}
          </main>
        </div>
      </div>
    );
  }
}

TrainerDashboard.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default TrainerDashboard;
