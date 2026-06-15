import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import AvaliacaoItem from '../../components/trainer/AvaliacaoItem';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';

/**
 * AvaliacoesPage
 * Class Component - CRUD completo de avaliações físicas para o treinador.
 *
 * Endpoints:
 *   GET    /avaliacoes          → lista avaliações
 *   POST   /avaliacoes          → criar avaliação
 *   PUT    /avaliacoes/:id      → editar avaliação
 *   DELETE /avaliacoes/:id      → apagar avaliação
 *
 * Lógica de clientes:
 *   - `clientesParaCriar`: clientes disponíveis para nova avaliação
 *     = clientes do âmbito do treinador + clientes sem treinador
 *     (devolvidos por GET /users, que já faz esta filtragem no backend)
 *   - `clientesParaFiltro`: todos os clientes que aparecem nas avaliações
 *     carregadas (podem incluir clientes que entretanto mudaram de âmbito)
 */

const FORM_INICIAL = {
  clienteId:    '',
  treinadorId:  '',
  data:         '',
  pesoKg:       '',
  alturaCm:     '',
  percGordura:  '',
  imc:          '',
  notas:        '',
};

function calcularImc(pesoKg, alturaCm) {
  const p = parseFloat(pesoKg);
  const a = parseFloat(alturaCm);
  if (!p || !a || a <= 0) return null;
  return (p / ((a / 100) * (a / 100))).toFixed(1);
}

class AvaliacoesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      avaliacoes:         [],
      clientesParaCriar:  [],
      clientesParaFiltro: [],
      treinadores:        [],
      loading:            true,
      erro:               null,
      filtroCliente:      props.filtroClienteInicial  ? String(props.filtroClienteInicial)  : '',
      filtroTreinador:    props.filtroTreinadorInicial ? String(props.filtroTreinadorInicial) : '',
      filtroTipo:         '',
      sortDir:            'desc',
      modalAberto:        false,
      avaliacaoAEditar:   null,
      form:               { ...FORM_INICIAL },
      formErro:           null,
      formLoading:        false,
    };

    this.abrirModalCriar     = this.abrirModalCriar.bind(this);
    this.abrirModalEditar    = this.abrirModalEditar.bind(this);
    this.fecharModal         = this.fecharModal.bind(this);
    this.handleFormChange    = this.handleFormChange.bind(this);
    this.handleSubmit        = this.handleSubmit.bind(this);
    this.handleApagar        = this.handleApagar.bind(this);
    this.handleFiltroCliente = this.handleFiltroCliente.bind(this);
    this.handleFiltroTipo    = this.handleFiltroTipo.bind(this);
    this.handleSort          = this.handleSort.bind(this);
    this.nomeClienteEdit     = this.nomeClienteEdit.bind(this);
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
      const [resAval, resClientes] = await Promise.all([
        apiClient.get('/avaliacoes'),
        // GET /users para treinador devolve: clientes do seu âmbito (plano OU avaliação profissional)
        // + clientes sem qualquer treinador. É exactamente o conjunto correcto para criar nova avaliação.
        apiClient.get('/users'),
      ]);

      const avaliacoes = resAval.data;

      // Clientes disponíveis para criar nova avaliação:
      // todos os que o backend devolve (âmbito + sem treinador), role=cliente
      const clientesParaCriar = resClientes.data.filter((u) => u.role === 'cliente');

      // Clientes para o filtro da listagem: union dos clientes de clientesParaCriar
      // com os que aparecem nas avaliações mas podem não estar na lista acima
      // (ex: cliente que entretanto foi transferido para outro treinador mas tem
      //  avaliações antigas visíveis). Construímos um mapa por id para deduplicar.
      const clientesMap = new Map(clientesParaCriar.map((c) => [c.id, c]));
      avaliacoes.forEach((a) => {
        if (a.cliente && !clientesMap.has(a.cliente.id)) {
          clientesMap.set(a.cliente.id, a.cliente);
        }
        // fallback: se só temos clienteId sem objeto nested
        if (!a.cliente && a.clienteId && !clientesMap.has(a.clienteId)) {
          clientesMap.set(a.clienteId, { id: a.clienteId, displayName: null, username: `#${a.clienteId}` });
        }
      });
      const clientesParaFiltro = [...clientesMap.values()];
      const treinadores = resClientes.data.filter((u) => u.role === 'treinador');

      this.setState({
        avaliacoes,
        clientesParaCriar,
        clientesParaFiltro,
        treinadores,
        loading: false,
      });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar avaliações.';
      this.setState({ erro: msg, loading: false });
    }
  }

  abrirModalCriar() {
    this.setState({
      modalAberto:      true,
      avaliacaoAEditar: null,
      formErro:         null,
      formLoading:      false,
      form:             { ...FORM_INICIAL },
    });
  }

  abrirModalEditar(avaliacao) {
    const clienteIdVal = avaliacao.clienteId ?? avaliacao.cliente?.id;
    this.setState({
      modalAberto:      true,
      avaliacaoAEditar: avaliacao,
      formErro:         null,
      formLoading:      false,
      form: {
        clienteId:   clienteIdVal != null ? String(clienteIdVal) : '',
        data:        avaliacao.data               ? avaliacao.data.split('T')[0]          : '',
        pesoKg:      avaliacao.pesoKg             != null ? String(avaliacao.pesoKg)             : '',
        alturaCm:    avaliacao.alturaCm           != null ? String(avaliacao.alturaCm)           : '',
        percGordura: avaliacao.percGordura        != null ? String(avaliacao.percGordura)        : '',
        imc:         avaliacao.imc               != null ? String(avaliacao.imc)               : '',
        notas:       avaliacao.notas              || '',
      },
    });
  }

  fecharModal() {
    this.setState({ modalAberto: false, avaliacaoAEditar: null, formErro: null, formLoading: false });
  }

  handleFormChange(e) {
    const { name, value } = e.target;
    this.setState((prev) => {
      const novoForm = { ...prev.form, [name]: value };
      // Auto-calcular IMC ao alterar peso ou altura
      if (name === 'pesoKg' || name === 'alturaCm') {
        const imc = calcularImc(novoForm.pesoKg, novoForm.alturaCm);
        if (imc) novoForm.imc = imc;
      }
      return { form: novoForm, formErro: null };
    });
  }

  handleFiltroCliente(e) {
    this.setState({ filtroCliente: e.target.value });
  }

  handleFiltroTipo(e) {
    this.setState({ filtroTipo: e.target.value });
  }

  handleSort(e) {
    this.setState({ sortDir: e.target.value });
  }

  nomeClienteEdit() {
    const { avaliacaoAEditar, clientesParaCriar, clientesParaFiltro } = this.state;
    if (!avaliacaoAEditar) return '';
    const c = avaliacaoAEditar.cliente;
    if (c) return c.displayName || c.username;
    const clienteIdVal = avaliacaoAEditar.clienteId ?? avaliacaoAEditar.cliente?.id;
    const todosClientes = [...clientesParaCriar, ...clientesParaFiltro];
    const found = todosClientes.find((cl) => cl.id === clienteIdVal || cl.id === Number(clienteIdVal));
    return found ? (found.displayName || found.username) : `#${clienteIdVal}`;
  }

  async handleSubmit(e) {
    e.preventDefault();
    const { form, avaliacaoAEditar } = this.state;
    const isAdmin = this.props.trainerId === null;

    if (!avaliacaoAEditar && !form.clienteId) {
      this.setState({ formErro: 'Seleciona um cliente.' });
      return;
    }
    if (!form.data) {
      this.setState({ formErro: 'A data é obrigatória.' });
      return;
    }

    this.setState({ formLoading: true, formErro: null });

    const payloadBase = {
      data:        form.data,
      pesoKg:      form.pesoKg      ? Number(form.pesoKg)      : null,
      alturaCm:    form.alturaCm    ? Number(form.alturaCm)    : null,
      percGordura: form.percGordura ? Number(form.percGordura) : null,
      imc:         form.imc         ? Number(form.imc)         : null,
      notas:       form.notas.trim() || null,
    };

    try {
      if (avaliacaoAEditar) {
        await apiClient.put(`/avaliacoes/${avaliacaoAEditar.id}`, payloadBase);
      } else {
        const payload = {
          ...payloadBase,
          clienteId: Number(form.clienteId),
        };
        if (isAdmin && form.treinadorId) {
          payload.treinadorId = Number(form.treinadorId);
        }
        await apiClient.post('/avaliacoes', payload);
      }
      this.fecharModal();
      this.carregarDados();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar avaliação.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Tens a certeza que queres apagar esta avaliação?')) return;
    try {
      await apiClient.delete(`/avaliacoes/${id}`);
      this.carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar avaliação.');
    }
  }

  render() {
    const {
      avaliacoes, clientesParaCriar, clientesParaFiltro, loading, erro, filtroCliente, filtroTreinador,
      filtroTipo,
      sortDir,
      modalAberto, avaliacaoAEditar, form, formErro, formLoading,
      treinadores,
    } = this.state;
    const isAdmin = this.props.trainerId === null;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    let lista = filtroCliente
      ? avaliacoes.filter((a) => {
          const cid = a.clienteId ?? a.cliente?.id;
          return String(cid) === filtroCliente;
        })
      : avaliacoes;

    if (filtroTreinador) {
      lista = lista.filter((a) => String(a.treinadorId) === filtroTreinador);
    }

    if (filtroTipo) {
      lista = lista.filter((a) => a.tipo === filtroTipo);
    }

    const listaOrdenada = lista.slice().sort((a, b) => {
      const diff = new Date(b.data) - new Date(a.data);
      return sortDir === 'asc' ? -diff : diff;
    });

    return (
      <div>
        <PageTopbar
          title={<>Avaliações<span>/</span>Físicas</>}
          actions={
            <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
              + Nova Avaliação
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
          ]}
        />

        {avaliacoes.length === 0 && (
          <EmptyState text="Ainda não registaste nenhuma avaliação." />
        )}
        {avaliacoes.length > 0 && listaOrdenada.length === 0 && (
          <EmptyState text="Nenhuma avaliação para este cliente." />
        )}

        <div className="pg-list">
          {listaOrdenada.map((avaliacao) => (
            <AvaliacaoItem
              key={avaliacao.id}
              avaliacao={avaliacao}
              clientes={clientesParaFiltro}
              onEditar={this.abrirModalEditar}
              onApagar={this.handleApagar}
              isAdmin={this.props.trainerId === null}
            />
          ))}
        </div>

        <PageModal
          open={modalAberto}
          onClose={this.fecharModal}
          eyebrow="Avaliação"
          title={avaliacaoAEditar ? 'Editar Avaliação' : 'Nova Avaliação'}
          loading={formLoading}
        >
          <form onSubmit={this.handleSubmit} className="pg-form">
                {formErro && <div className="pg-form__error">{formErro}</div>}

                {/* Row 1 - Cliente + Data */}
                <div className="pg-form__row">
                  {avaliacaoAEditar ? (
                    <div className="pg-form__group">
                      <label className="pg-form__label">Cliente</label>
                      <input
                        type="text"
                        className="pg-form__input"
                        value={this.nomeClienteEdit()}
                        disabled
                        readOnly
                      />
                      <p className="pg-form__hint">O cliente não pode ser alterado numa avaliação existente.</p>
                    </div>
                  ) : (
                    <div className="pg-form__group">
                      <label className="pg-form__label">Cliente <span>*</span></label>
                      <select
                        name="clienteId" value={form.clienteId}
                        onChange={this.handleFormChange} className="pg-form__input"
                        disabled={formLoading}
                      >
                        <option value="">Seleciona...</option>
                        {clientesParaCriar.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.displayName || c.username}
                            {c.temTreinador === false ? ' (sem treinador)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="pg-form__group">
                    <label className="pg-form__label">Data da avaliação <span>*</span></label>
                    <input
                      name="data" type="date" value={form.data}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Row 2 - Treinador (só admin, só na criação) */}
                {isAdmin && !avaliacaoAEditar && (
                  <div className="pg-form__group">
                    <label className="pg-form__label">
                      Treinador{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                    </label>
                    <select
                      name="treinadorId" value={form.treinadorId}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    >
                      <option value="">Sem treinador</option>
                      {treinadores.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName || t.username}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pg-form__row">
                  <div className="pg-form__group">
                    <label className="pg-form__label">Peso (kg)</label>
                    <input
                      name="pesoKg" type="number" step="0.1" min="0" value={form.pesoKg}
                      onChange={this.handleFormChange} className="pg-form__input"
                      placeholder="75.5" disabled={formLoading}
                    />
                  </div>
                  <div className="pg-form__group">
                    <label className="pg-form__label">Altura (cm)</label>
                    <input
                      name="alturaCm" type="number" step="0.1" min="0" value={form.alturaCm}
                      onChange={this.handleFormChange} className="pg-form__input"
                      placeholder="175" disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">% Gordura</label>
                  <input
                    name="percGordura" type="number" step="0.1" min="0" max="100"
                    value={form.percGordura}
                    onChange={this.handleFormChange} className="pg-form__input"
                    placeholder="18.5" disabled={formLoading}
                  />
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">IMC</label>
                  <input
                    name="imc" type="number" step="0.01" min="0" value={form.imc}
                    onChange={this.handleFormChange} className="pg-form__input"
                    placeholder={calcularImc(form.pesoKg, form.alturaCm) || '24.7'}
                    disabled={formLoading}
                  />
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Notas / Observações</label>
                  <textarea
                    name="notas" value={form.notas}
                    onChange={this.handleFormChange}
                    className="pg-form__input pg-form__textarea"
                    placeholder="Estado geral, motivação, progressão..."
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

AvaliacoesPage.propTypes = {
  trainerId:             PropTypes.number,
  filtroClienteInicial:  PropTypes.number,
  filtroTreinadorInicial: PropTypes.number,
};

AvaliacoesPage.defaultProps = {
  trainerId:             null,
  filtroClienteInicial:  null,
  filtroTreinadorInicial: null,
};

export default AvaliacoesPage;