import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import { formatDateTimePt } from '../../utils/formatDate';

/**
 * ClientSessoesPage
 * Class Component - Sessões do cliente (read-only + edição de notas).
 *
 * Regras de negócio (role: cliente):
 *   - Não pode criar nem apagar sessões.
 *   - Pode editar APENAS o campo `notas` da própria sessão.
 *   - Endpoint: PUT /sessoes/:id  { notas: string }
 *
 * Endpoints usados:
 *   GET /sessoes        → lista as sessões do cliente autenticado
 *   PUT /sessoes/:id    → atualiza só as notas de uma sessão (cliente só pode alterar notas)
 */

// FIX: 'realizada' → 'concluida' para corresponder ao enum da BD
const SESS_BADGE_CLASS = {
  agendada:  'sess-badge sess-badge--agendada',
  concluida: 'sess-badge sess-badge--concluida',
  cancelada: 'sess-badge sess-badge--cancelada',
};

// FIX: 'realizada' → 'concluida' para corresponder ao enum da BD
const ESTADOS = ['agendada', 'concluida', 'cancelada'];

const ESTADOS_LABEL = {
  agendada:  'Agendada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

class ClientSessoesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sessoes:      [],
      loading:      true,
      erro:         null,
      filtroEstado: '',
      filtroPeriodo: '', // '' = todas, 'proximas' = futuras, 'passadas' = passadas
      sortDir:      'desc',   // 'desc' = mais recente primeiro, 'asc' = mais antiga primeiro
      // Modal de notas
      modalAberto:      false,
      sessaoAEditar:    null,
      notas:            '',
      formErro:         null,
      formLoading:      false,
    };

    this.carregarSessoes   = this.carregarSessoes.bind(this);
    this.abrirModalNotas   = this.abrirModalNotas.bind(this);
    this.fecharModal       = this.fecharModal.bind(this);
    this.handleNotasChange = this.handleNotasChange.bind(this);
    this.handleSubmitNotas = this.handleSubmitNotas.bind(this);
    this.handleFiltro      = this.handleFiltro.bind(this);
    this.handleSort        = this.handleSort.bind(this);
    this.handlePeriodo     = this.handlePeriodo.bind(this);
  }

  componentDidMount() {
    this.carregarSessoes();
  }

  async carregarSessoes() {
    this.setState({ loading: true, erro: null });
    try {
      const res = await apiClient.get('/sessoes');
      this.setState({ sessoes: res.data, loading: false });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar sessões.';
      this.setState({ erro: msg, loading: false });
    }
  }

  // ─── Modal de notas ──────────────────────────────────────────────────────

  abrirModalNotas(sessao) {
    this.setState({
      modalAberto:   true,
      sessaoAEditar: sessao,
      notas:         sessao.notas || '',
      formErro:      null,
    });
  }

  fecharModal() {
    this.setState({ modalAberto: false, sessaoAEditar: null, formErro: null });
  }

  handleNotasChange(e) {
    this.setState({ notas: e.target.value, formErro: null });
  }

  async handleSubmitNotas(e) {
    e.preventDefault();
    const { sessaoAEditar, notas } = this.state;
    this.setState({ formLoading: true, formErro: null });

    try {
      // FIX: endpoint correto é PUT /sessoes/:id (não /sessoes/:id/notas)
      await apiClient.put(`/sessoes/${sessaoAEditar.id}`, {
        notas: notas.trim() || null,
      });
      this.fecharModal();
      await this.carregarSessoes();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar notas.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  handleFiltro(e) {
    this.setState({ filtroEstado: e.target.value });
  }

  handleSort(e) {
    this.setState({ sortDir: e.target.value });
  }

  handlePeriodo(e) {
    this.setState({ filtroPeriodo: e.target.value });
  }

  // ─── Render do card de sessão ────────────────────────────────────────────

  renderSessaoCard(sessao) {
    // FIX: campo correto é sessao.estado → mapeia para badge
    const badgeClass = SESS_BADGE_CLASS[sessao.estado] || 'sess-badge';
    const estadoLabel = ESTADOS_LABEL[sessao.estado] || sessao.estado;

    return (
      <div key={sessao.id} className="pg-card">
        <div className="pg-card__header">
          <div>
            {/* FIX: campo da API é dataSessao, não data */}
            <h3 className="pg-card__title">{formatDateTimePt(sessao.dataSessao)}</h3>
            {sessao.plano && (
              <p className="pg-card__sub">{sessao.plano.titulo}</p>
            )}
          </div>
          <span className={badgeClass}>
            {estadoLabel}
          </span>
        </div>

        <div className="pg-stats">
          {sessao.treinador && (
            <span className="pg-badge">
              {sessao.treinador.displayName || sessao.treinador.username}
            </span>
          )}
          {/* FIX: campo correto é duracaoMin, não duracao */}
          {sessao.duracaoMin && (
            <span className="pg-badge">{sessao.duracaoMin} min</span>
          )}
        </div>

        {sessao.notas && (
          <p className="pg-notes">{sessao.notas}</p>
        )}

        <div className="pg-card__actions">
          <button
            type="button"
            className="pg-btn pg-btn--ghost pg-btn--sm"
            onClick={() => this.abrirModalNotas(sessao)}
          >
            {sessao.notas ? 'Editar notas' : 'Adicionar notas'}
          </button>
        </div>
      </div>
    );
  }

  renderModal() {
    const { modalAberto, sessaoAEditar, notas, formErro, formLoading } = this.state;
    if (!sessaoAEditar) return null;

    const dataFormatada = formatDateTimePt(sessaoAEditar.dataSessao);
    const tituloPlano = sessaoAEditar.plano ? sessaoAEditar.plano.titulo : null;

    return (
      <PageModal
        open={modalAberto}
        onClose={this.fecharModal}
        eyebrow="Sessão"
        title="Notas da Sessão"
        loading={formLoading}
      >
        <form onSubmit={this.handleSubmitNotas} className="pg-form">
          <p className="pg-form__sub">
            <strong>{dataFormatada}</strong>
            {tituloPlano && ` - ${tituloPlano}`}
          </p>

          {formErro && <div className="pg-form__error">{formErro}</div>}

          <div className="pg-form__group">
            <textarea
              value={notas}
              onChange={this.handleNotasChange}
              className="pg-form__input pg-form__textarea"
              placeholder="Como correu a sessão? O que sentiste? Que progressos fizeste?"
              disabled={formLoading}
              rows={5}
            />
          </div>

          <FormFooter
            onCancel={this.fecharModal}
            loading={formLoading}
            submitLabel="Guardar Notas"
          />
        </form>
      </PageModal>
    );
  }

  // ─── Render principal ────────────────────────────────────────────────────

  render() {
    const { sessoes, loading, erro, filtroEstado, filtroPeriodo, sortDir } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    // dataSessao é DATEONLY (ex: "2026-06-15") - comparar com hoje em formato idêntico
    const hoje = new Date().toISOString().split('T')[0];

    let lista = sessoes;

    // Filtro período: proximas = data >= hoje, passadas = data < hoje
    if (filtroPeriodo === 'proximas') {
      lista = lista.filter((s) => s.dataSessao >= hoje);
    } else if (filtroPeriodo === 'passadas') {
      lista = lista.filter((s) => s.dataSessao < hoje);
    }

    // Filtro estado
    if (filtroEstado) {
      lista = lista.filter((s) => s.estado === filtroEstado);
    }

    // FIX: sort usa dataSessao (campo real da API), não data
    const listaOrdenada = lista.slice().sort((a, b) =>
      sortDir === 'asc'
        ? new Date(a.dataSessao) - new Date(b.dataSessao)
        : new Date(b.dataSessao) - new Date(a.dataSessao)
    );

    const PERIODO_LABEL = { proximas: 'Próximas', passadas: 'Passadas' };

    return (
      <div>
        {this.renderModal()}

        <PageTopbar title={<>As Minhas<span>/</span>Sessões</>} />

        <FilterBar>
          <FilterSelect
            label="Estado"
            value={filtroEstado}
            onChange={this.handleFiltro}
            options={[
              { value: '', label: 'Estados' },
              ...ESTADOS.map((e) => ({ value: e, label: ESTADOS_LABEL[e] })),
            ]}
          />
          <FilterSelect
            label="Data"
            value={filtroPeriodo}
            onChange={this.handlePeriodo}
            options={[
              { value: '', label: 'Datas' },
              { value: 'proximas', label: 'Sessões Futuras' },
              { value: 'passadas', label: 'Sessões Passadas' },
            ]}
          />
          <FilterSelect
            label="Ordenar"
            value={sortDir}
            onChange={this.handleSort}
            sort
            options={[
              { value: 'desc', label: 'Mais recentes' },
              { value: 'asc', label: 'Mais antigas' },
            ]}
          />
        </FilterBar>

        {/* FIX: ActiveFiltersBar já está correto - renderiza quando filtroEstado não é '' */}
        <ActiveFiltersBar
          filters={[
            {
              label:   'Estado',
              value:   filtroEstado ? ESTADOS_LABEL[filtroEstado] : '',
              onClear: () => this.setState({ filtroEstado: '' }),
            },
            {
              label:   'Período',
              value:   filtroPeriodo ? PERIODO_LABEL[filtroPeriodo] : '',
              onClear: () => this.setState({ filtroPeriodo: '' }),
            },
          ]}
        />

        {sessoes.length === 0 && (
          <EmptyState text="Ainda não tens sessões agendadas. Fala com o teu treinador!" />
        )}
        {sessoes.length > 0 && listaOrdenada.length === 0 && (
          <EmptyState
            text={
              (filtroPeriodo === 'proximas' && !filtroEstado && 'Não tens sessões futuras agendadas.')
              || (filtroPeriodo === 'passadas' && !filtroEstado && 'Não tens sessões passadas.')
              || (filtroEstado && !filtroPeriodo && 'Nenhuma sessão com este estado.')
              || (filtroEstado && filtroPeriodo && 'Nenhuma sessão corresponde a estes filtros.')
              || ''
            }
          />
        )}

        <div className="pg-list">
          {listaOrdenada.map((s) => this.renderSessaoCard(s))}
        </div>
      </div>
    );
  }
}

ClientSessoesPage.propTypes = {
  userId: PropTypes.number,
};

ClientSessoesPage.defaultProps = {
  userId: null,
};

export default ClientSessoesPage;
