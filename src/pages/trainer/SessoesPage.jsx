import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import SessaoItem from '../../components/trainer/SessaoItem';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import { ESTADOS_SESSAO } from '../../constants/filters';

/**
 * SessoesPage
 * Class Component - CRUD completo de sessões de treino para o treinador.
 *
 * API usa: dataSessao, duracaoMin, estado (agendada | concluida | cancelada)
 */

const FORM_INICIAL = {
  clienteId:  '',
  planoId:    '',
  treinadorId: '',
  data:       '',
  duracao:    '60',
  estado:     'agendada',
  notas:      '',
};

const OPCOES_ESTADO_FILTRO = [
  { value: '', label: 'Estado' },
  ...ESTADOS_SESSAO,
];

class SessoesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sessoes:       [],
      clientes:      [],
      planos:        [],
      treinadores:   [],
      loading:       true,
      erro:          null,
      filtroEstado:  '',
      filtroCliente:  props.filtroClienteInicial  ? String(props.filtroClienteInicial)  : '',
      filtroTreinador: props.filtroTreinadorInicial ? String(props.filtroTreinadorInicial) : '',
      sortDir:       'desc',
      filtroPeriodo: '',
      modalAberto:   false,
      sessaoAEditar: null,
      form:          { ...FORM_INICIAL },
      formErro:      null,
      formLoading:   false,
    };

    this.abrirModalCriar    = this.abrirModalCriar.bind(this);
    this.abrirModalEditar   = this.abrirModalEditar.bind(this);
    this.fecharModal        = this.fecharModal.bind(this);
    this.handleFormChange   = this.handleFormChange.bind(this);
    this.handleSubmit       = this.handleSubmit.bind(this);
    this.handleApagar       = this.handleApagar.bind(this);
    this.handleFiltroEstado = this.handleFiltroEstado.bind(this);
    this.handleFiltroCliente = this.handleFiltroCliente.bind(this);
    this.handleSort         = this.handleSort.bind(this);
    this.handleFiltroPeriodo = this.handleFiltroPeriodo.bind(this);
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
    try {
      const [resSessoes, resUsers, resPlanos] = await Promise.all([
        apiClient.get('/sessoes'),
        apiClient.get('/users'),
        apiClient.get('/planos'),
      ]);
      const todos = resUsers.data;
      this.setState({
        sessoes:     resSessoes.data,
        clientes:    todos.filter((u) => u.role === 'cliente'),
        treinadores: todos.filter((u) => u.role === 'treinador'),
        planos:      resPlanos.data,
        loading:     false,
      });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar sessões.';
      this.setState({ erro: msg, loading: false });
    }
  }

  abrirModalCriar() {
    this.setState({
      modalAberto:   true,
      sessaoAEditar: null,
      formErro:      null,
      formLoading:   false,
      form:          { ...FORM_INICIAL },
    });
  }

  abrirModalEditar(sessao) {
    const dataRaw = sessao.dataSessao || sessao.data || '';
    const dataStr = dataRaw.includes('T') ? dataRaw.split('T')[0] : dataRaw;

    this.setState({
      modalAberto:   true,
      sessaoAEditar: sessao,
      formErro:      null,
      formLoading:   false,
      form: {
        clienteId: sessao.clienteId ? String(sessao.clienteId) : '',
        planoId:   sessao.planoId   ? String(sessao.planoId)   : '',
        data:      dataStr,
        duracao:   sessao.duracaoMin != null ? String(sessao.duracaoMin)
          : (sessao.duracao != null ? String(sessao.duracao) : '60'),
        estado:    sessao.estado || 'agendada',
        notas:     sessao.notas  || '',
      },
    });
  }

  fecharModal() {
    this.setState({
      modalAberto:   false,
      sessaoAEditar: null,
      formErro:      null,
      formLoading:   false,
    });
  }

  handleFormChange(e) {
    const { name, value } = e.target;
    const { planos } = this.state;

    this.setState((prev) => {
      const novoForm = { ...prev.form, [name]: value };

      // Se escolheu um plano → preenche automaticamente o cliente
      if (name === 'planoId' && value) {
        const plano = planos.find((p) => String(p.id) === value);
        if (plano && plano.clienteId) {
          novoForm.clienteId = String(plano.clienteId);
        }
      }

      // Se escolheu um cliente → limpa o plano se não for desse cliente
      if (name === 'clienteId') {
        const planoAtual = planos.find((p) => String(p.id) === prev.form.planoId);
        if (planoAtual && String(planoAtual.clienteId) !== value) {
          novoForm.planoId = '';
        }
      }

      return { form: novoForm, formErro: null };
    });
  }

  handleFiltroEstado(e) {
    this.setState({ filtroEstado: e.target.value });
  }

  handleFiltroCliente(e) {
    this.setState({ filtroCliente: e.target.value });
  }

  handleSort(e) {
    this.setState({ sortDir: e.target.value });
  }

  handleFiltroPeriodo(e) {
    this.setState({ filtroPeriodo: e.target.value });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const { form, sessaoAEditar } = this.state;

    if (!sessaoAEditar) {
      if (!form.clienteId) { this.setState({ formErro: 'Seleciona um cliente.' }); return; }
      if (!form.planoId)   { this.setState({ formErro: 'Seleciona um plano.' });   return; }
    }
    if (!form.data) { this.setState({ formErro: 'A data é obrigatória.' }); return; }

    this.setState({ formLoading: true, formErro: null });

    try {
      if (sessaoAEditar) {
        await apiClient.put(`/sessoes/${sessaoAEditar.id}`, {
          dataSessao: form.data,
          duracaoMin: form.duracao ? Number(form.duracao) : sessaoAEditar.duracaoMin,
          estado:     form.estado,
          notas:      form.notas.trim() || null,
        });
      } else {
        const payload = {
          clienteId:  Number(form.clienteId),
          planoId:    Number(form.planoId),
          dataSessao: form.data,
          duracaoMin: form.duracao ? Number(form.duracao) : 60,
          estado:     form.estado || 'agendada',
          notas:      form.notas.trim() || null,
        };
        // Admin pode especificar treinador; se omitido, backend usa o do plano
        if (this.props.trainerId === null && form.treinadorId) {
          payload.treinadorId = Number(form.treinadorId);
        }
        await apiClient.post('/sessoes', payload);
      }
      this.fecharModal();
      this.carregarDados();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar sessão.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Tens a certeza que queres apagar esta sessão?')) return;
    try {
      await apiClient.delete(`/sessoes/${id}`);
      this.carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar sessão.');
    }
  }

  render() {
    const {
      sessoes, clientes, planos, treinadores, loading, erro, filtroEstado, filtroCliente, filtroTreinador,
      sortDir, filtroPeriodo,
      modalAberto, sessaoAEditar, form, formErro, formLoading,
    } = this.state;
    const isAdmin = this.props.trainerId === null;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let lista = filtroEstado
      ? sessoes.filter((s) => s.estado === filtroEstado)
      : sessoes;

    if (filtroCliente) {
      lista = lista.filter((s) => String(s.clienteId) === filtroCliente);
    }
    if (filtroTreinador) {
      lista = lista.filter((s) => String(s.treinadorId) === filtroTreinador);
    }

    if (filtroPeriodo === 'futuras') {
      lista = lista.filter((s) => new Date(s.dataSessao || s.data) >= hoje);
    } else if (filtroPeriodo === 'passadas') {
      lista = lista.filter((s) => new Date(s.dataSessao || s.data) < hoje);
    }

    const listaOrdenada = lista.slice().sort((a, b) => {
      const diff = new Date(b.dataSessao || b.data) - new Date(a.dataSessao || a.data);
      return sortDir === 'asc' ? -diff : diff;
    });

    const opcoesCliente = [
      { value: '', label: 'Cliente' },
      ...clientes.map((c) => ({ value: String(c.id), label: c.displayName || c.username })),
    ];

    const opcoesTreinador = [
      { value: '', label: 'Treinador' },
      ...treinadores.map((t) => ({ value: String(t.id), label: t.displayName || t.username })),
    ];

    return (
      <div>
        <PageTopbar
          title={<>Sessões<span>/</span>Treino</>}
          actions={
            <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
              + Nova Sessão
            </button>
          }
        />

        <FilterBar>
          <FilterSelect
            label="Cliente"
            value={filtroCliente}
            onChange={this.handleFiltroCliente}
            options={opcoesCliente}
          />
          {isAdmin && (
            <FilterSelect
              label="Treinador"
              value={filtroTreinador}
              onChange={(e) => this.setState({ filtroTreinador: e.target.value })}
              options={opcoesTreinador}
            />
          )}
          <FilterSelect
            label="Estado"
            value={filtroEstado}
            onChange={this.handleFiltroEstado}
            options={OPCOES_ESTADO_FILTRO}
          />
          <FilterSelect
            label="Data"
            value={filtroPeriodo}
            onChange={this.handleFiltroPeriodo}
            options={[
              { value: '', label: 'Data' },
              { value: 'futuras', label: 'Sessões futuras' },
              { value: 'passadas', label: 'Sessões passadas' },
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
        <ActiveFiltersBar
          filters={[
            {
              label:   'Cliente',
              value:   filtroCliente ? (clientes.find((c) => String(c.id) === filtroCliente)?.displayName || clientes.find((c) => String(c.id) === filtroCliente)?.username || '') : '',
              onClear: () => this.setState({ filtroCliente: '' }),
            },
            {
              label:   'Treinador',
              value:   filtroTreinador ? (treinadores.find((t) => String(t.id) === filtroTreinador)?.displayName || treinadores.find((t) => String(t.id) === filtroTreinador)?.username || '') : '',
              onClear: () => this.setState({ filtroTreinador: '' }),
            },
            {
              label:   'Estado',
              value:   filtroEstado ? (OPCOES_ESTADO_FILTRO.find((o) => o.value === filtroEstado)?.label || filtroEstado) : '',
              onClear: () => this.setState({ filtroEstado: '' }),
            },
            {
              label:   'Período',
              value:   filtroPeriodo === 'futuras' ? 'Futuras' : filtroPeriodo === 'passadas' ? 'Passadas' : '',
              onClear: () => this.setState({ filtroPeriodo: '' }),
            },
          ]}
        />

        {sessoes.length === 0 && (
          <EmptyState text="Ainda não tens sessões registadas." />
        )}
        {sessoes.length > 0 && listaOrdenada.length === 0 && (
          <EmptyState text="Nenhuma sessão com este estado." />
        )}

        <div className="pg-list">
          {listaOrdenada.map((sessao) => (
            <SessaoItem
              key={sessao.id}
              sessao={sessao}
              onEditar={this.abrirModalEditar}
              onApagar={this.handleApagar}
            />
          ))}
        </div>

        <PageModal
          open={modalAberto}
          onClose={this.fecharModal}
          eyebrow="Sessão"
          title={sessaoAEditar ? 'Editar Sessão' : 'Nova Sessão'}
          loading={formLoading}
        >
          <form onSubmit={this.handleSubmit} className="pg-form">
                {formErro && <div className="pg-form__error">{formErro}</div>}

                {!sessaoAEditar && (() => {
                  // Só planos profissionais podem ter sessões (regra da API)
                  const planosProfissionais = planos.filter((p) => p.tipo === 'profissional');
                  // Filtra pelo cliente selecionado (se houver)
                  const planosFiltradosForm = form.clienteId
                    ? planosProfissionais.filter((p) => String(p.clienteId) === form.clienteId)
                    : planosProfissionais;
                  // Clientes que têm pelo menos um plano profissional
                  const clientesComPlano = clientes.filter((c) =>
                    planosProfissionais.some((p) => p.clienteId === c.id)
                  );
                  return (
                    <div className="pg-form__row">
                      <div className="pg-form__group">
                        <label className="pg-form__label">Cliente <span>*</span></label>
                        <select
                          name="clienteId" value={form.clienteId}
                          onChange={this.handleFormChange} className="pg-form__input"
                          disabled={formLoading}
                        >
                          <option value="">Seleciona cliente...</option>
                          {clientesComPlano.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.displayName || c.username}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pg-form__group">
                        <label className="pg-form__label">Plano <span>*</span></label>
                        <select
                          name="planoId" value={form.planoId}
                          onChange={this.handleFormChange} className="pg-form__input"
                          disabled={formLoading || (!form.clienteId && planosFiltradosForm.length === 0)}
                        >
                          <option value="">
                            {form.clienteId ? 'Seleciona plano...' : 'Seleciona cliente primeiro'}
                          </option>
                          {planosFiltradosForm.map((p) => (
                            <option key={p.id} value={p.id}>{p.titulo}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}

                {/* Treinador - só admin pode escolher, e só na criação */}
                {isAdmin && !sessaoAEditar && (
                  <div className="pg-form__group">
                    <label className="pg-form__label">
                      Treinador <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                    </label>
                    <select
                      name="treinadorId" value={form.treinadorId}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    >
                      <option value="">Sem treinador (usa o do plano)</option>
                      {treinadores.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName || t.username}
                        </option>
                      ))}
                    </select>
                    <p className="pg-form__hint">Se deixares em branco, será usado o treinador do plano.</p>
                  </div>
                )}

                <div className="pg-form__row">
                  <div className="pg-form__group">
                    <label className="pg-form__label">Data <span>*</span></label>
                    <input
                      name="data" type="date" value={form.data}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="pg-form__group pg-form__group--short">
                    <label className="pg-form__label">Duração (min)</label>
                    <input
                      name="duracao" type="number" min="1" value={form.duracao}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Estado</label>
                  <select
                    name="estado" value={form.estado}
                    onChange={this.handleFormChange} className="pg-form__input"
                    disabled={formLoading}
                  >
                    {ESTADOS_SESSAO.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Notas</label>
                  <textarea
                    name="notas" value={form.notas}
                    onChange={this.handleFormChange}
                    className="pg-form__input pg-form__textarea"
                    placeholder="Observações sobre a sessão..."
                    disabled={formLoading}
                  />
                </div>

                <FormFooter onCancel={this.fecharModal} loading={formLoading} />
              </form>
        </PageModal>
      </div>
    );
  }
}

SessoesPage.propTypes = {
  trainerId:            PropTypes.number,
  filtroClienteInicial:  PropTypes.number,
  filtroTreinadorInicial: PropTypes.number,
};

SessoesPage.defaultProps = {
  trainerId:             null,
  filtroClienteInicial:  null,
  filtroTreinadorInicial: null,
};

export default SessoesPage;