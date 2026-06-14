import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import MetaItem from '../../components/metas/MetaItem';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';

/**
 * MetasPage
 * Class Component - CRUD de metas para o treinador (e reutilizado pelo admin).
 *
 * Regras da API para role 'treinador':
 *   - Listar:  metas de planos profissionais seus (via GET /metas)
 *   - Criar:   só em planos profissionais do seu âmbito (planoId obrigatório)
 *   - Editar:  só metas de planos profissionais seus
 *   - Apagar:  só metas de planos profissionais seus
 *
 * Para o admin:
 *   - Listar/Criar/Editar/Apagar: acesso total
 *
 * Props:
 *   trainerId            - id do treinador logado (ou null se admin)
 *   filtroClienteInicial - pré-filtra a listagem para um cliente específico
 */

const FORM_INICIAL = {
  clienteId:  '',
  planoId:    '',
  descricao:  '',
  valorAlvo:  '',
  valorAtual: '',
  unidade:    '',
  prazo:      '',
  estado:     'ativa',
};

const ESTADOS_VALIDOS = ['ativa', 'concluida', 'cancelada'];

class MetasPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      metas:              [],
      planosProfissionais: [],
      clientesParaFiltro: [],
      treinadores:        [],
      planosDoCliente:    [],
      loading:            true,
      erro:               null,
      filtroCliente:      props.filtroClienteInicial  ? String(props.filtroClienteInicial)  : '',
      filtroTreinador:    props.filtroTreinadorInicial ? String(props.filtroTreinadorInicial) : '',
      sortMeta:           'prazo-asc',
      filtroPeriodo:      '',
      filtroTipo:         '',
      modalAberto:        false,
      metaAEditar:        null,
      form:               { ...FORM_INICIAL },
      formErro:           null,
      formLoading:        false,
    };

    this.abrirModalCriar     = this.abrirModalCriar.bind(this);
    this.abrirModalEditar    = this.abrirModalEditar.bind(this);
    this.fecharModal         = this.fecharModal.bind(this);
    this.handleFormChange    = this.handleFormChange.bind(this);
    this.handleClienteChange = this.handleClienteChange.bind(this);
    this.handleSubmit        = this.handleSubmit.bind(this);
    this.handleApagar        = this.handleApagar.bind(this);
    this.handleFiltroCliente = this.handleFiltroCliente.bind(this);
    this.handleSortMeta      = this.handleSortMeta.bind(this);
    this.handleFiltroPeriodo = this.handleFiltroPeriodo.bind(this);
    this.handleFiltroTipo    = this.handleFiltroTipo.bind(this);
  }

  componentDidMount() {
    this.carregarDados();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.filtroClienteInicial !== this.props.filtroClienteInicial) {
      this.setState({
        filtroCliente: this.props.filtroClienteInicial
          ? String(this.props.filtroClienteInicial)
          : '',
      });
    }
    if (prevProps.filtroTreinadorInicial !== this.props.filtroTreinadorInicial) {
      this.setState({
        filtroTreinador: this.props.filtroTreinadorInicial
          ? String(this.props.filtroTreinadorInicial)
          : '',
      });
    }
  }

  async carregarDados() {
    this.setState({ loading: true, erro: null });
    const isAdmin = this.props.trainerId === null;
    try {
      // Busca metas e planos em paralelo (admin também carrega utilizadores para filtro de treinador)
      const requests = [apiClient.get('/metas'), apiClient.get('/planos')];
      if (isAdmin) requests.push(apiClient.get('/users'));
      const [resMetas, resPlanos, resUsers] = await Promise.all(requests);

      const metas = resMetas.data;
      const treinadores = isAdmin ? (resUsers?.data || []).filter((u) => u.role === 'treinador') : [];

      // Admin pode criar metas em qualquer plano; treinador só em profissionais seus
      const planosProfissionais = isAdmin
        ? resPlanos.data
        : resPlanos.data.filter((p) => p.tipo === 'profissional');

      // Clientes para o filtro: union dos clientes que aparecem nas metas
      const clientesMap = new Map();
      metas.forEach((m) => {
        if (m.cliente && !clientesMap.has(m.cliente.id)) {
          clientesMap.set(m.cliente.id, m.cliente);
        } else if (!m.cliente && m.clienteId && !clientesMap.has(m.clienteId)) {
          clientesMap.set(m.clienteId, {
            id: m.clienteId,
            displayName: null,
            username: `#${m.clienteId}`,
          });
        }
      });
      const clientesParaFiltro = [...clientesMap.values()];

      this.setState({
        metas,
        planosProfissionais,
        clientesParaFiltro,
        treinadores,
        loading: false,
      });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar metas.';
      this.setState({ erro: msg, loading: false });
    }
  }

  // ─── Filtro da listagem ────────────────────────────────────────

  handleFiltroCliente(e) {
    this.setState({ filtroCliente: e.target.value });
  }

  handleSortMeta(e) {
    this.setState({ sortMeta: e.target.value });
  }

  handleFiltroPeriodo(e) {
    this.setState({ filtroPeriodo: e.target.value });
  }

  handleFiltroTipo(e) {
    this.setState({ filtroTipo: e.target.value });
  }

  // ─── Modal ────────────────────────────────────────────────────

  abrirModalCriar() {
    this.setState({
      modalAberto:    true,
      metaAEditar:    null,
      formErro:       null,
      planosDoCliente: [],
      form:           { ...FORM_INICIAL },
    });
  }

  abrirModalEditar(meta) {
    this.setState({
      modalAberto:    true,
      metaAEditar:    meta,
      formErro:       null,
      planosDoCliente: [],
      form: {
        clienteId:  meta.clienteId  ? String(meta.clienteId)  : '',
        planoId:    meta.planoId    ? String(meta.planoId)    : '',
        descricao:  meta.descricao  || '',
        valorAlvo:  meta.valorAlvo  != null ? String(meta.valorAlvo)  : '',
        valorAtual: meta.valorAtual != null ? String(meta.valorAtual) : '',
        unidade:    meta.unidade    || '',
        prazo:      meta.prazo      || '',
        estado:     meta.estado     || 'ativa',
      },
    });
  }

  fecharModal() {
    this.setState({ modalAberto: false, metaAEditar: null, formErro: null });
  }

  // Quando o cliente muda no form de criar → filtra os planos disponíveis
  handleClienteChange(e) {
    const clienteId = e.target.value;
    const { planosProfissionais } = this.state;
    const planosDoCliente = clienteId
      ? planosProfissionais.filter((p) => String(p.clienteId) === clienteId)
      : [];
    this.setState((prev) => ({
      form: { ...prev.form, clienteId, planoId: '' },
      planosDoCliente,
      formErro: null,
    }));
  }

  handleFormChange(e) {
    const { name, value } = e.target;
    this.setState((prev) => ({
      form: { ...prev.form, [name]: value },
      formErro: null,
    }));
  }

  // ─── Submit ───────────────────────────────────────────────────

  async handleSubmit(e) {
    e.preventDefault();
    const { form, metaAEditar } = this.state;

    if (!form.descricao.trim()) {
      this.setState({ formErro: 'A descrição é obrigatória.' });
      return;
    }
    if (!metaAEditar && !form.planoId) {
      this.setState({ formErro: 'Seleciona um plano.' });
      return;
    }

    this.setState({ formLoading: true, formErro: null });

    const payload = {
      descricao:  form.descricao,
      valorAlvo:  form.valorAlvo  ? Number(form.valorAlvo)  : null,
      valorAtual: form.valorAtual ? Number(form.valorAtual) : null,
      unidade:    form.unidade    || null,
      prazo:      form.prazo      || null,
      estado:     form.estado,
    };

    try {
      if (metaAEditar) {
        await apiClient.put(`/metas/${metaAEditar.id}`, payload);
      } else {
        await apiClient.post('/metas', {
          ...payload,
          planoId:   Number(form.planoId),
          clienteId: Number(form.clienteId),
        });
      }
      this.fecharModal();
      this.carregarDados();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar meta.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Tens a certeza que queres apagar esta meta?')) return;
    try {
      await apiClient.delete(`/metas/${id}`);
      this.carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar meta.');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  nomeClienteEdit() {
    const { metaAEditar } = this.state;
    if (!metaAEditar) return '';
    return metaAEditar.cliente?.displayName
      || metaAEditar.cliente?.username
      || `#${metaAEditar.clienteId}`;
  }

  nomePlanoEdit() {
    const { metaAEditar } = this.state;
    if (!metaAEditar) return '';
    return metaAEditar.plano?.titulo || `Plano #${metaAEditar.planoId}`;
  }

  // Clientes únicos com planos profissionais (para o dropdown de criar)
  clientesParaCriar() {
    const { planosProfissionais } = this.state;
    const map = new Map();
    planosProfissionais.forEach((p) => {
      if (p.cliente && !map.has(p.cliente.id)) {
        map.set(p.cliente.id, p.cliente);
      } else if (!p.cliente && p.clienteId && !map.has(p.clienteId)) {
        map.set(p.clienteId, { id: p.clienteId, displayName: null, username: `#${p.clienteId}` });
      }
    });
    return [...map.values()];
  }

  // ─── Render ───────────────────────────────────────────────────

  render() {
    const {
      metas, clientesParaFiltro, treinadores, planosDoCliente,
      loading, erro, filtroCliente, filtroTreinador, sortMeta, filtroPeriodo, filtroTipo,
      modalAberto, metaAEditar, form, formErro, formLoading,
    } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    const isAdmin = this.props.trainerId === null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Filtragem local
    let lista = filtroCliente
      ? metas.filter((m) => {
          const cid = m.clienteId ?? m.cliente?.id;
          return String(cid) === filtroCliente;
        })
      : metas;

    if (filtroTreinador) {
      lista = lista.filter((m) => {
        const tid = m.treinadorId ?? m.plano?.treinadorId;
        return String(tid) === filtroTreinador;
      });
    }

    if (filtroPeriodo === 'futuras') {
      lista = lista.filter((m) => m.prazo && new Date(m.prazo) >= hoje);
    } else if (filtroPeriodo === 'passadas') {
      lista = lista.filter((m) => m.prazo && new Date(m.prazo) < hoje);
    }

    if (filtroTipo) {
      lista = lista.filter((m) => m.tipo === filtroTipo);
    }

    const listaOrdenada = lista.slice().sort((a, b) => {
      if (sortMeta === 'prazo-asc') {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return new Date(a.prazo) - new Date(b.prazo);
      }
      if (sortMeta === 'prazo-desc') {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return new Date(b.prazo) - new Date(a.prazo);
      }
      return 0;
    });

    const clientesDropdown = this.clientesParaCriar();

    return (
      <div>
        <PageTopbar
          title={<>Metas<span>/</span>Clientes</>}
          actions={
            <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
              + Nova Meta
            </button>
          }
        />

        <FilterBar>
          <FilterSelect
            label="Cliente"
            value={filtroCliente}
            onChange={this.handleFiltroCliente}
            options={[
              { value: '', label: 'Cliente' },
              ...clientesParaFiltro.map((c) => ({
                value: String(c.id),
                label: c.displayName || c.username,
              })),
            ]}
          />
          {isAdmin && (
            <FilterSelect
              label="Treinador"
              value={filtroTreinador}
              onChange={(e) => this.setState({ filtroTreinador: e.target.value })}
              options={[
                { value: '', label: 'Treinador' },
                ...treinadores.map((t) => ({ value: String(t.id), label: t.displayName || t.username })),
              ]}
            />
          )}
          <FilterSelect
            label="Tipo"
            value={filtroTipo}
            onChange={this.handleFiltroTipo}
            options={[
              { value: '', label: 'Tipo' },
              { value: 'pessoal', label: 'Pessoal' },
              { value: 'profissional', label: 'Profissional' },
            ]}
          />
          <FilterSelect
            label="Data"
            value={filtroPeriodo}
            onChange={this.handleFiltroPeriodo}
            options={[
              { value: '', label: 'Data' },
              { value: 'futuras', label: 'Metas Passadas' },
              { value: 'passadas', label: 'Metas Futuras' },
            ]}
          />
          <FilterSelect
            label="Ordenar"
            value={sortMeta}
            onChange={this.handleSortMeta}
            sort
            options={[
              { value: 'prazo-asc', label: 'Prazo mais Próximo' },
              { value: 'prazo-desc', label: 'Prazo mais Distante' },
            ]}
          />
        </FilterBar>
        <ActiveFiltersBar
          filters={[
            {
              label:   'Cliente',
              value:   filtroCliente ? (clientesParaFiltro.find((c) => String(c.id) === filtroCliente)?.displayName || clientesParaFiltro.find((c) => String(c.id) === filtroCliente)?.username || '') : '',
              onClear: () => this.setState({ filtroCliente: '' }),
            },
            {
              label:   'Treinador',
              value:   filtroTreinador ? (treinadores.find((t) => String(t.id) === filtroTreinador)?.displayName || treinadores.find((t) => String(t.id) === filtroTreinador)?.username || '') : '',
              onClear: () => this.setState({ filtroTreinador: '' }),
            },
            {
              label:   'Tipo',
              value:   filtroTipo === 'pessoal' ? 'Pessoal' : filtroTipo === 'profissional' ? 'Profissional' : '',
              onClear: () => this.setState({ filtroTipo: '' }),
            },
            {
              label:   'Período',
              value:   filtroPeriodo === 'futuras' ? 'Prazo futuro' : filtroPeriodo === 'passadas' ? 'Prazo passado' : '',
              onClear: () => this.setState({ filtroPeriodo: '' }),
            },
          ]}
        />

        {metas.length === 0 && (
          <EmptyState text="Ainda não existem metas definidas nos teus planos profissionais." />
        )}
        {metas.length > 0 && listaOrdenada.length === 0 && (
          <EmptyState text="Nenhuma meta para este cliente." />
        )}

        <div className="pg-list">
          {listaOrdenada.map((meta) => (
            <MetaItem
              key={meta.id}
              meta={meta}
              soPessoal={false}
              onEditar={this.abrirModalEditar}
              onApagar={this.handleApagar}
            />
          ))}
        </div>

        <PageModal
          open={modalAberto}
          onClose={this.fecharModal}
          eyebrow={this.props.trainerId === null ? 'Meta' : 'Meta Profissional'}
          title={metaAEditar ? 'Editar Meta' : 'Nova Meta'}
          loading={formLoading}
        >
          <form onSubmit={this.handleSubmit} className="pg-form">
                {formErro && <div className="pg-form__error">{formErro}</div>}

                {/* ── Criar: escolher cliente → plano ─────────────── */}
                {!metaAEditar && (
                  <div className="pg-form__row">
                    <div className="pg-form__group">
                      <label className="pg-form__label">Cliente <span>*</span></label>
                      <select
                        name="clienteId"
                        value={form.clienteId}
                        onChange={this.handleClienteChange}
                        className="pg-form__input"
                        disabled={formLoading}
                      >
                        <option value="">Seleciona um cliente...</option>
                        {clientesDropdown.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.displayName || c.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pg-form__group">
                      <label className="pg-form__label">Plano <span>*</span></label>
                      <select
                        name="planoId"
                        value={form.planoId}
                        onChange={this.handleFormChange}
                        className="pg-form__input"
                        disabled={formLoading || !form.clienteId}
                      >
                        <option value="">
                          {form.clienteId ? 'Seleciona um plano...' : 'Escolhe primeiro o cliente'}
                        </option>
                        {planosDoCliente.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.titulo}{this.props.trainerId === null ? ` (${p.tipo})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* ── Editar: mostrar cliente e plano como readonly ─── */}
                {metaAEditar && (
                  <div className="pg-form__row">
                    <div className="pg-form__group">
                      <label className="pg-form__label">Cliente</label>
                      <input
                        type="text"
                        className="pg-form__input"
                        value={this.nomeClienteEdit()}
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="pg-form__group">
                      <label className="pg-form__label">Plano</label>
                      <input
                        type="text"
                        className="pg-form__input"
                        value={this.nomePlanoEdit()}
                        disabled
                        readOnly
                      />
                      <p className="pg-form__hint">O plano não pode ser alterado numa meta existente.</p>
                    </div>
                  </div>
                )}

                {/* ── Descrição ────────────────────────────────────── */}
                <div className="pg-form__group">
                  <label className="pg-form__label">Descrição <span>*</span></label>
                  <input
                    name="descricao"
                    type="text"
                    value={form.descricao}
                    onChange={this.handleFormChange}
                    className="pg-form__input"
                    placeholder="Ex: Reduzir % de gordura para 15%"
                    disabled={formLoading}
                  />
                </div>

                {/* ── Valores ──────────────────────────────────────── */}
                <div className="pg-form__row">
                  <div className="pg-form__group">
                    <label className="pg-form__label">Valor alvo</label>
                    <input
                      name="valorAlvo"
                      type="number"
                      value={form.valorAlvo}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      placeholder="15"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="pg-form__group">
                    <label className="pg-form__label">Valor atual</label>
                    <input
                      name="valorAtual"
                      type="number"
                      value={form.valorAtual}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      placeholder="22"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="pg-form__group pg-form__group--short">
                    <label className="pg-form__label">Unidade</label>
                    <input
                      name="unidade"
                      type="text"
                      value={form.unidade}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      placeholder="%"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* ── Prazo + Estado ───────────────────────────────── */}
                <div className="pg-form__row">
                  <div className="pg-form__group">
                    <label className="pg-form__label">Prazo</label>
                    <input
                      name="prazo"
                      type="date"
                      value={form.prazo}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      disabled={formLoading}
                    />
                  </div>
                  {metaAEditar && (
                    <div className="pg-form__group">
                      <label className="pg-form__label">Estado</label>
                      <select
                        name="estado"
                        value={form.estado}
                        onChange={this.handleFormChange}
                        className="pg-form__input"
                        disabled={formLoading}
                      >
                        {ESTADOS_VALIDOS.map((e) => (
                          <option key={e} value={e}>
                            {e.charAt(0).toUpperCase() + e.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <FormFooter onCancel={this.fecharModal} loading={formLoading} />
              </form>
        </PageModal>
      </div>
    );
  }
}

MetasPage.propTypes = {
  trainerId:             PropTypes.number,
  filtroClienteInicial:  PropTypes.number,
  filtroTreinadorInicial: PropTypes.number,
};

MetasPage.defaultProps = {
  trainerId:             null,
  filtroClienteInicial:  null,
  filtroTreinadorInicial: null,
};

export default MetasPage;