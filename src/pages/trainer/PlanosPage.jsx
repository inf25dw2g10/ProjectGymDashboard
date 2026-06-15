import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import PlanoCard from '../../components/planos/PlanoCard';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import { OBJETIVOS_PLANO, labelObjetivoPlano } from '../../constants/planos';

/**
 * PlanosPage - CRUD de planos para o treinador.
 *
 * Melhorias:
 *  - Modal de criar inclui seleção de cliente (obrigatório pela API)
 *  - PlanoCard mostra o cliente em vez do treinador
 *  - Filtros: objetivo + cliente
 *  - Aceita filtroClienteInicial (vindo do drawer de cliente)
 */

const FORM_INICIAL = {
  clienteId:   '',
  treinadorId: '',
  titulo:      '',
  descricao:   '',
  objetivo:    'hipertrofia',
  duracaoSem:  '',
  ativo:       true,
};

class PlanosPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      planos:       [],
      clientes:     [],
      treinadores:  [],
      loading:      true,
      erro:         null,
      // filtros
      filtroObjetivo: '',
      filtroCliente:  props.filtroClienteInicial  ? String(props.filtroClienteInicial)  : '',
      filtroTreinador: props.filtroTreinadorInicial ? String(props.filtroTreinadorInicial) : '',
      filtroAtivo:    '',
      filtroTipo:     '',
      // modal
      modalAberto:  false,
      planoAEditar: null,
      form:         { ...FORM_INICIAL },
      formErro:     null,
      formLoading:  false,
    };

    this.abrirModalCriar  = this.abrirModalCriar.bind(this);
    this.abrirModalEditar = this.abrirModalEditar.bind(this);
    this.fecharModal      = this.fecharModal.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleSubmit     = this.handleSubmit.bind(this);
    this.handleApagar     = this.handleApagar.bind(this);
    this.handleFiltroObjetivo = this.handleFiltroObjetivo.bind(this);
    this.handleFiltroCliente  = this.handleFiltroCliente.bind(this);
    this.handleFiltroAtivo    = this.handleFiltroAtivo.bind(this);
    this.handleFiltroTipo     = this.handleFiltroTipo.bind(this);
  }

  componentDidMount() {
    this.carregarDados();
  }

  componentDidUpdate(prevProps) {
    // Se o filtro inicial mudar (vindo do drawer), aplica
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
      const [resPlanos, resClientes] = await Promise.all([
        apiClient.get('/planos'),
        apiClient.get('/users'),
      ]);
      const todos = resClientes.data;
      this.setState({
        planos:      resPlanos.data,
        clientes:    todos.filter((u) => u.role === 'cliente'),
        treinadores: todos.filter((u) => u.role === 'treinador'),
        loading:     false,
      });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar planos.';
      this.setState({ erro: msg, loading: false });
    }
  }

  abrirModalCriar() {
    this.setState({
      modalAberto:  true,
      planoAEditar: null,
      formErro:     null,
      formLoading:  false,
      form:         { ...FORM_INICIAL },
    });
  }

  abrirModalEditar(plano) {
    this.setState({
      modalAberto:  true,
      planoAEditar: plano,
      formErro:     null,
      formLoading:  false,
      form: {
        clienteId:  plano.clienteId ? String(plano.clienteId) : '',
        titulo:     plano.titulo     || '',
        descricao:  plano.descricao  || '',
        objetivo:   plano.objetivo   || 'hipertrofia',
        duracaoSem: plano.duracaoSem != null ? String(plano.duracaoSem) : '',
        ativo:      plano.ativo      !== false,
      },
    });
  }

  fecharModal() {
    this.setState({ modalAberto: false, planoAEditar: null, formErro: null, formLoading: false });
  }

  handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    this.setState((prev) => ({
      form:     { ...prev.form, [name]: val },
      formErro: null,
    }));
  }

  handleFiltroObjetivo(e) { this.setState({ filtroObjetivo: e.target.value }); }
  handleFiltroCliente(e)  { this.setState({ filtroCliente:  e.target.value }); }
  handleFiltroAtivo(e)    { this.setState({ filtroAtivo:    e.target.value }); }
  handleFiltroTipo(e)     { this.setState({ filtroTipo:     e.target.value }); }

  async handleSubmit(e) {
    e.preventDefault();
    const { form, planoAEditar } = this.state;
    const isAdmin = this.props.trainerId === null;

    if (!planoAEditar && !form.clienteId) {
      this.setState({ formErro: 'Seleciona um cliente.' });
      return;
    }
    if (!form.titulo.trim()) {
      this.setState({ formErro: 'O título é obrigatório.' });
      return;
    }
    if (!form.duracaoSem || Number(form.duracaoSem) < 1) {
      this.setState({ formErro: 'A duração deve ser de pelo menos 1 semana.' });
      return;
    }

    this.setState({ formLoading: true, formErro: null });

    const payloadBase = {
      titulo:     form.titulo.trim(),
      descricao:  form.descricao.trim() || null,
      objetivo:   form.objetivo,
      duracaoSem: Number(form.duracaoSem),
      ativo:      form.ativo,
    };

    try {
      if (planoAEditar) {
        await apiClient.put(`/planos/${planoAEditar.id}`, payloadBase);
      } else {
        const payload = {
          ...payloadBase,
          clienteId: Number(form.clienteId),
          // Se admin escolher treinador → profissional; sem treinador → pessoal
          // Treinador normal → sempre profissional (o backend ignora o tipo enviado e usa req.user)
          tipo: (isAdmin && !form.treinadorId) ? 'pessoal' : 'profissional',
        };
        // Admin pode opcionalmente associar um treinador
        if (isAdmin && form.treinadorId) {
          payload.treinadorId = Number(form.treinadorId);
        }
        await apiClient.post('/planos', payload);
      }
      this.fecharModal();
      this.carregarDados();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar plano.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    // Informa o utilizador que os exercícios e sessões serão removidos em cascata
    const confirmMsg =
      'Tens a certeza que queres apagar este plano?\n\n' +
      'Serão também apagados em cascata:\n' +
      '• Todos os exercícios do plano\n' +
      '• Todas as sessões associadas a este plano';
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await apiClient.delete(`/planos/${id}`);
      // Mostra resumo do que foi apagado (exercícios + sessões)
      const msg = res.data?.mensagem;
      if (msg && msg.includes('removido')) {
        alert(msg);
      }
      this.carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar plano.');
    }
  }

  nomeCliente(plano) {
    if (!plano.clienteId) return null;
    if (plano.cliente) return plano.cliente.displayName || plano.cliente.username;
    const c = this.state.clientes.find((cl) => cl.id === plano.clienteId);
    return c ? (c.displayName || c.username) : null;
  }

  render() {
    const {
      planos, clientes, treinadores, loading, erro,
      filtroObjetivo, filtroCliente, filtroTreinador, filtroAtivo, filtroTipo,
      modalAberto, planoAEditar, form, formErro, formLoading,
    } = this.state;
    const isAdmin = this.props.trainerId === null;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    // Aplicar filtros
    let lista = planos;
    if (filtroObjetivo)  lista = lista.filter((p) => p.objetivo === filtroObjetivo);
    if (filtroCliente)   lista = lista.filter((p) => String(p.clienteId)   === filtroCliente);
    if (filtroTreinador) lista = lista.filter((p) => String(p.treinadorId) === filtroTreinador);
    if (filtroAtivo === 'ativo')   lista = lista.filter((p) => p.ativo !== false);
    if (filtroAtivo === 'inativo') lista = lista.filter((p) => p.ativo === false);
    if (filtroTipo)     lista = lista.filter((p) => p.tipo === filtroTipo);

    const opcoesCliente = [
      { value: '', label: 'Cliente' },
      ...clientes.map((c) => ({ value: String(c.id), label: c.displayName || c.username })),
    ];

    const opcoesTreinador = [
      { value: '', label: 'Treinador' },
      ...treinadores.map((t) => ({ value: String(t.id), label: t.displayName || t.username })),
    ];

    const opcoesObjetivo = [
      { value: '', label: 'Objetivo' },
      ...OBJETIVOS_PLANO,
    ];

    return (
      <div>
        <PageTopbar
          title={<>Os Meus<span>/</span>Planos</>}
          actions={
            <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
              + Novo Plano
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
            label="Objetivo"
            value={filtroObjetivo}
            onChange={this.handleFiltroObjetivo}
            options={opcoesObjetivo}
          />
          <FilterSelect
            label="Estado"
            value={filtroAtivo}
            onChange={this.handleFiltroAtivo}
            options={[
              { value: '', label: 'Estados' },
              { value: 'ativo', label: 'Ativos' },
              { value: 'inativo', label: 'Inativos' },
            ]}
          />
        </FilterBar>
        <ActiveFiltersBar
          filters={[
            {
              label:   'Cliente',
              value:   filtroCliente ? (clientes.find((c) => String(c.id) === filtroCliente)?.displayName || clientes.find((c) => String(c.id) === filtroCliente)?.username) : '',
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
              label:   'Objetivo',
              value:   filtroObjetivo ? labelObjetivoPlano(filtroObjetivo) : '',
              onClear: () => this.setState({ filtroObjetivo: '' }),
            },
            {
              label:   'Estado',
              value:   filtroAtivo === 'ativo' ? 'Ativos' : filtroAtivo === 'inativo' ? 'Inativos' : '',
              onClear: () => this.setState({ filtroAtivo: '' }),
            },
          ]}
        />

        {planos.length === 0 && (
          <EmptyState text="Ainda não criaste nenhum plano." />
        )}
        {planos.length > 0 && lista.length === 0 && (
          <EmptyState text="Nenhum plano com estes filtros." />
        )}

        <div className="pg-grid">
          {lista.map((plano) => (
            <PlanoCard
              key={plano.id}
              plano={plano}
              nomeCliente={this.nomeCliente(plano)}
              onVerExercicios={this.props.onVerExercicios ? () => this.props.onVerExercicios(plano) : null}
              onEditar={() => this.abrirModalEditar(plano)}
              onApagar={() => this.handleApagar(plano.id)}
            />
          ))}
        </div>

        <PageModal
          open={modalAberto}
          onClose={this.fecharModal}
          eyebrow="Plano Profissional"
          title={planoAEditar ? 'Editar Plano' : 'Novo Plano'}
          loading={formLoading}
        >
          <form onSubmit={this.handleSubmit} className="pg-form">
                {formErro && <div className="pg-form__error">{formErro}</div>}

                {/* Cliente - só na criação, a API não permite alterar */}
                {!planoAEditar ? (
                  <div className="pg-form__group">
                    <label className="pg-form__label">Cliente <span>*</span></label>
                    <select
                      name="clienteId" value={form.clienteId}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    >
                      <option value="">Seleciona o cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName || c.username}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="pg-form__group">
                    <label className="pg-form__label">Cliente</label>
                    <input
                      type="text"
                      className="pg-form__input"
                      value={this.nomeCliente(planoAEditar)}
                      disabled
                      readOnly
                    />
                    <p className="pg-form__hint">O cliente não pode ser alterado num plano existente.</p>
                  </div>
                )}

                {/* Treinador - só admin pode escolher, e só na criação */}
                {isAdmin && !planoAEditar && (
                  <div className="pg-form__group">
                    <label className="pg-form__label">Treinador <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
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
                    <p className="pg-form__hint">Se deixares em branco, o plano fica pessoal (sem treinador atribuído).</p>
                  </div>
                )}

                <div className="pg-form__group">
                  <label className="pg-form__label">Título <span>*</span></label>
                  <input
                    name="titulo" type="text" value={form.titulo}
                    onChange={this.handleFormChange} className="pg-form__input"
                    placeholder="Ex: Plano de Hipertrofia 12 semanas"
                    disabled={formLoading}
                  />
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Descrição</label>
                  <textarea
                    name="descricao" value={form.descricao}
                    onChange={this.handleFormChange}
                    className="pg-form__input pg-form__textarea"
                    placeholder="Descreve os objetivos e estrutura do plano..."
                    disabled={formLoading}
                  />
                </div>

                <div className="pg-form__row">
                  <div className="pg-form__group">
                    <label className="pg-form__label">Objetivo <span>*</span></label>
                    <select
                      name="objetivo" value={form.objetivo}
                      onChange={this.handleFormChange} className="pg-form__input"
                      disabled={formLoading}
                    >
                      {OBJETIVOS_PLANO.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pg-form__group pg-form__group--short">
                    <label className="pg-form__label">Semanas <span>*</span></label>
                    <input
                      name="duracaoSem" type="number" min="1" value={form.duracaoSem}
                      onChange={this.handleFormChange} className="pg-form__input"
                      placeholder="12" disabled={formLoading}
                    />
                  </div>
                </div>

                {planoAEditar && (
                  <div className="pg-form__group">
                    <label className="pg-form__label">
                      <input
                        id="ativo" name="ativo" type="checkbox"
                        checked={form.ativo} onChange={this.handleFormChange}
                        disabled={formLoading}
                      />
                      {' '}Plano ativo
                    </label>
                  </div>
                )}

                <FormFooter onCancel={this.fecharModal} loading={formLoading} />
              </form>
        </PageModal>
      </div>
    );
  }
}

PlanosPage.propTypes = {
  trainerId:            PropTypes.number,
  onVerExercicios:      PropTypes.func,
  filtroClienteInicial:  PropTypes.number,
  filtroTreinadorInicial: PropTypes.number,
};

PlanosPage.defaultProps = {
  trainerId:            null,
  onVerExercicios:      null,
  filtroClienteInicial:  null,
  filtroTreinadorInicial: null,
};

export default PlanosPage;