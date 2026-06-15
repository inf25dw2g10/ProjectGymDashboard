import React from 'react';
import PropTypes from 'prop-types';
import AuthService from '../../auth/AuthService';
import apiClient from '../../api/apiClient';
import Navbar from '../../components/common/Navbar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import UserRow from '../../components/admin/UserRow';
import FilterBar from '../../components/common/FilterBar';
import FilterInput from '../../components/common/FilterInput';
import FilterSelect from '../../components/common/FilterSelect';
import PlanosPage from '../trainer/PlanosPage';
import ExerciciosPage from '../trainer/ExerciciosPage';
import SessoesPage from '../trainer/SessoesPage';
import AvaliacoesPage from '../trainer/AvaliacoesPage';
import MetasPage from '../trainer/MetasPage';
import ClienteDetailPanel from '../../components/trainer/ClienteDetailPanel';

/**
 * AdminDashboard
 * Class Component - dashboard principal do administrador.
 *
 * Tabs:
 *   1. Utilizadores  → GET /users, PUT /users/:id/role, DELETE /users/:id
 *   2. Planos        → reutiliza PlanosPage (trainer)
 *   3. Exercícios    → reutiliza ExerciciosPage (trainer)
 *   4. Sessões       → reutiliza SessoesPage (trainer)
 *   5. Avaliações    → reutiliza AvaliacoesPage (trainer)
 *   6. Metas         → reutiliza MetasPage (trainer)
 *
 * Clicar numa linha da tabela de utilizadores abre o ClienteDetailPanel (drawer)
 * com os recursos desse utilizador. A partir do drawer o admin pode navegar
 * para qualquer tab com o filtro do cliente já aplicado (igual ao treinador).
 */

const TABS = [
  { id: 'utilizadores', label: 'Utilizadores'  },
  { id: 'planos',       label: 'Planos'        },
  { id: 'exercicios',   label: 'Exercícios'    },
  { id: 'sessoes',      label: 'Sessões'       },
  { id: 'avaliacoes',   label: 'Avaliações'    },
  { id: 'metas',        label: 'Metas'         },
];

const ROLES_FILTRO = ['todos', 'admin', 'treinador', 'cliente'];

class AdminDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Navegação
      tabAtiva:      'utilizadores',

      // Dados
      utilizadores:   [],
      loading:        true,
      erro:           null,

      // Operações em curso (evita duplos cliques)
      loadingId:      null,

      // Filtros locais
      pesquisa:       '',
      filtroRole:     'todos',

      // Utilizador selecionado para filtro nas tabs de recursos
      utilizadorSelId: null,
      filtroClienteId: null,
      filtroTreinadorId: null,

      // Plano selecionado para navegar para exercícios
      planoSelecionado: null,

      // Drawer de detalhe do cliente
      drawerCliente:   null,
      drawerModo:      'cliente',  // 'cliente' | 'treinador' | 'admin'

      // Toast / feedback inline
      mensagem:       null,   // { tipo: 'ok'|'erro', texto: '' }

      // Perfil do admin logado
      perfil:         null,
    };

    this.handleLogout           = this.handleLogout.bind(this);
    this.mudarTab               = this.mudarTab.bind(this);
    this.carregarUtilizadores   = this.carregarUtilizadores.bind(this);
    this.handleAlterarRole      = this.handleAlterarRole.bind(this);
    this.handleApagar           = this.handleApagar.bind(this);
    this.handlePesquisa         = this.handlePesquisa.bind(this);
    this.handleFiltroRole       = this.handleFiltroRole.bind(this);
    this.abrirDrawer            = this.abrirDrawer.bind(this);
    this.fecharDrawer           = this.fecharDrawer.bind(this);
    this.navegarParaTab         = this.navegarParaTab.bind(this);
    this.limparSelecao          = this.limparSelecao.bind(this);
    this.verExerciciosPlano     = this.verExerciciosPlano.bind(this);
    this.limparPlanoSelecionado = this.limparPlanoSelecionado.bind(this);
    this.trocarPlano            = this.trocarPlano.bind(this);
  }

  componentDidMount() {
    this.carregarUtilizadores();
    this.carregarPerfil();
  }

  async carregarPerfil() {
    try {
      const res = await apiClient.get('/users/me');
      this.setState({ perfil: res.data });
    } catch (_) {
      /* fallback silencioso */
    }
  }

  // ─── Navegação ────────────────────────────────────────────────

  handleLogout() {
    AuthService.logout();
    this.props.history.push('/login');
  }

  mudarTab(tab) {
    this.setState({ tabAtiva: tab, filtroClienteId: null, filtroTreinadorId: null, utilizadorSelId: null });
  }

  // ─── Utilizadores ─────────────────────────────────────────────

  async carregarUtilizadores() {
    this.setState({ loading: true, erro: null });
    try {
      const res = await apiClient.get('/users');
      this.setState({ utilizadores: res.data, loading: false });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar utilizadores.';
      this.setState({ erro: msg, loading: false });
    }
  }

  async handleAlterarRole(userId, novoRole) {
    // Nada a fazer se o role não mudou
    const user = this.state.utilizadores.find((u) => u.id === userId);
    if (!user || user.role === novoRole) return;

    // Aviso se o admin está a rebaixar a sua própria conta
    const { perfil } = this.state;
    if (perfil && perfil.id === userId && novoRole !== 'admin') {
      const confirmou = window.confirm(
        `Atenção: estás a alterar o teu próprio role para "${novoRole}".\n` +
        `Isso vai fazer logout imediatamente pois perderás acesso de admin.\n\n` +
        `Tens a certeza que queres continuar?`
      );
      if (!confirmou) return;
    }

    this.setState({ loadingId: userId, mensagem: null });
    try {
      await apiClient.put(`/users/${userId}/role`, { role: novoRole });

      // Se o admin rebaixou a sua própria conta → logout
      if (perfil && perfil.id === userId && novoRole !== 'admin') {
        AuthService.logout();
        this.props.history.push('/login');
        return;
      }

      // Atualiza localmente sem re-fetch
      this.setState((prev) => ({
        loadingId: null,
        utilizadores: prev.utilizadores.map((u) =>
          u.id === userId ? { ...u, role: novoRole } : u
        ),
        mensagem: { tipo: 'ok', texto: `Role de "${user.displayName || user.username}" alterado para "${novoRole}".` },
      }));
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao alterar role.';
      this.setState({ loadingId: null, mensagem: { tipo: 'erro', texto: msg } });
    }
  }

  async handleApagar(userId, nome) {
    // Confirmação nativa do browser (sem hooks, sem modal custom)
    if (!window.confirm(`Tens a certeza que queres apagar "${nome}"?\nEsta ação é irreversível.`)) return;

    this.setState({ loadingId: userId, mensagem: null });
    try {
      await apiClient.delete(`/users/${userId}`);

      this.setState((prev) => ({
        loadingId: null,
        utilizadores: prev.utilizadores.filter((u) => u.id !== userId),
        utilizadorSelId: prev.utilizadorSelId === userId ? null : prev.utilizadorSelId,
        mensagem: { tipo: 'ok', texto: `Utilizador "${nome}" apagado com sucesso.` },
      }));
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao apagar utilizador.';
      this.setState({ loadingId: null, mensagem: { tipo: 'erro', texto: msg } });
    }
  }

  // ─── Filtros ──────────────────────────────────────────────────

  handlePesquisa(e) {
    this.setState({ pesquisa: e.target.value });
  }

  handleFiltroRole(e) {
    this.setState({ filtroRole: e.target.value });
  }

  // ─── Drawer ───────────────────────────────────────────────────

  abrirDrawer(user) {
    const modo = user.role === 'admin' ? 'admin'
      : user.role === 'treinador' ? 'treinador'
      : 'cliente';
    this.setState({ drawerCliente: user, drawerModo: modo });
  }

  fecharDrawer() {
    this.setState({ drawerCliente: null, drawerModo: 'cliente' });
  }

  // Chamado pelo drawer ao clicar "Gerir X →"
  // modo: 'cliente' → filtrar por cliente_id; 'treinador' → filtrar por treinador_id
  navegarParaTab(tab, userId = null, modo = 'cliente') {
    this.setState({
      drawerCliente:     null,
      drawerModo:        'cliente',
      tabAtiva:          tab,
      utilizadorSelId:   userId,
      filtroClienteId:   modo === 'cliente'   ? userId : null,
      filtroTreinadorId: modo === 'treinador' ? userId : null,
    });
  }

  limparSelecao() {
    this.setState({ utilizadorSelId: null, filtroClienteId: null, filtroTreinadorId: null });
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

  // ─── Render helpers ───────────────────────────────────────────

  renderTabUtilizadores() {
    const { utilizadores, loading, erro, pesquisa, filtroRole, loadingId, mensagem } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} onRetry={this.carregarUtilizadores} />;

    // Filtro combinado: pesquisa + role
    const termo = pesquisa.toLowerCase().trim();
    const lista = utilizadores.filter((u) => {
      const matchRole = filtroRole === 'todos' || u.role === filtroRole;
      const matchTexto = !termo || [u.displayName, u.username, u.email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(termo));
      return matchRole && matchTexto;
    });

    return (
      <div>
        {mensagem && (
          <div className={`dash-toast dash-toast--${mensagem.tipo === 'ok' ? 'ok' : 'erro'}`}>
            {mensagem.texto}
          </div>
        )}

        <FilterBar>
          <FilterInput
            placeholder="Pesquisar por nome, username ou email..."
            value={pesquisa}
            onChange={this.handlePesquisa}
          />
          <FilterSelect
            label="Role"
            value={filtroRole}
            onChange={this.handleFiltroRole}
            options={ROLES_FILTRO.map((r) => ({
              value: r,
              label: r === 'todos' ? 'Roles' : r,
            }))}
          />
          <button type="button" onClick={this.carregarUtilizadores} className="pg-btn pg-btn--ghost" title="Recarregar">
            Atualizar
          </button>
        </FilterBar>

        <div className="adm-contador">
          {lista.length} de {utilizadores.length} utilizador{utilizadores.length !== 1 ? 'es' : ''}
        </div>

        {lista.length === 0 ? (
          <div className="pg-empty">
            <p className="pg-empty__text">Nenhum utilizador encontrado.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Utilizador</th>
                  <th>Username</th>
                  <th>Role atual</th>
                  <th>Alterar role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onAlterarRole={this.handleAlterarRole}
                    onApagar={this.handleApagar}
                    onAbrirDrawer={this.abrirDrawer}
                    loadingId={loadingId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  renderContextoSelecao() {
    const { filtroClienteId, filtroTreinadorId, utilizadores } = this.state;
    const filtroId = filtroClienteId || filtroTreinadorId;
    if (!filtroId) return null;

    const user = utilizadores.find((u) => u.id === filtroId);
    const nome = user ? (user.displayName || user.username || `#${filtroId}`) : `#${filtroId}`;
    const label = filtroTreinadorId ? 'treinador' : 'cliente';

    return (
      <div className="dash-ctx-bar">
        <span>A filtrar por {label}: <strong>{nome}</strong></span>
        <button type="button" onClick={this.limparSelecao} className="dash-ctx-bar__clear">
          Limpar seleção
        </button>
      </div>
    );
  }

  render() {
    const { tabAtiva, filtroClienteId, filtroTreinadorId, drawerCliente, drawerModo, planoSelecionado, perfil } = this.state;
    const nomeAdmin = perfil?.displayName || perfil?.username || 'Admin';
    const iniciais  = nomeAdmin
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');

    return (
      <div className="dash-page">
        <Navbar
          username={nomeAdmin}
          role="admin"
          onLogout={this.handleLogout}
        />

        <div className="dash-container">

          <header className="dash-welcome">
            {perfil?.avatarUrl
              ? (
                <img src={perfil.avatarUrl} alt="avatar" className="dash-welcome__avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="dash-welcome__initials">{iniciais}</span>
              )
            }
            <div>
              <p className="dash-welcome__eyebrow">Administração</p>
              <h1 className="dash-welcome__title">
                Painel<span>/</span>Administração
              </h1>
              <p className="dash-welcome__sub">
                Gestão total de utilizadores, planos, exercícios, sessões e avaliações.
              </p>
            </div>
          </header>

          <nav className="dash-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                onClick={() => this.mudarTab(tab.id)}
                className={`dash-tab${tabAtiva === tab.id ? ' dash-tab--active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {tabAtiva !== 'utilizadores' && this.renderContextoSelecao()}

          <div className="dash-content">
            {tabAtiva === 'utilizadores' && this.renderTabUtilizadores()}
            {tabAtiva === 'planos'       && <PlanosPage     trainerId={null} filtroClienteInicial={filtroClienteId} filtroTreinadorInicial={filtroTreinadorId} onVerExercicios={this.verExerciciosPlano} />}
            {tabAtiva === 'exercicios'   && <ExerciciosPage trainerId={null} filtroClienteInicial={filtroClienteId} planoSelecionado={planoSelecionado} onLimparPlano={this.limparPlanoSelecionado} onTrocarPlano={this.trocarPlano} onIrParaPlanos={() => this.mudarTab('planos')} />}
            {tabAtiva === 'sessoes'      && <SessoesPage    trainerId={null} filtroClienteInicial={filtroClienteId} filtroTreinadorInicial={filtroTreinadorId} />}
            {tabAtiva === 'avaliacoes'   && <AvaliacoesPage trainerId={null} filtroClienteInicial={filtroClienteId} filtroTreinadorInicial={filtroTreinadorId} />}
            {tabAtiva === 'metas'        && <MetasPage      trainerId={null} filtroClienteInicial={filtroClienteId} filtroTreinadorInicial={filtroTreinadorId} />}
          </div>

        </div>

        {/* Drawer de detalhe do cliente */}
        {drawerCliente && (
          <ClienteDetailPanel
            cliente={drawerCliente}
            modo={drawerModo}
            onFechar={this.fecharDrawer}
            onNavegar={this.navegarParaTab}
          />
        )}
      </div>
    );
  }
}

AdminDashboard.propTypes = {
  // Injetado pelo React Router (RoleRoute usa <Route render={...}>)
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default AdminDashboard;
