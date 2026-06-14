import React from 'react';
import PropTypes from 'prop-types';
import apiClient    from '../../api/apiClient';
import PlanoCard    from '../../components/planos/PlanoCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage   from '../../components/common/ErrorMessage';
import FilterSelect   from '../../components/common/FilterSelect';
import FilterBar from '../../components/common/FilterBar';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import ClientTipoSection from '../../components/common/ClientTipoSection';
import { OBJETIVOS_PLANO } from '../../constants/planos';

/**
 * ClientPlanosPage
 * Class Component - lista e gere os planos de treino do cliente.
 *
 * Regras de negócio:
 *   tipo === 'pessoal'       → CRUD completo (criar / editar / apagar)
 *   tipo === 'profissional'  → apenas leitura
 *
 * Estado gerido aqui (Lifting State Up para PlanoCard):
 *   planos, loading, erro
 *   modalAberto, planoAEditar (null = criar, objeto = editar)
 *   form, formErro, formLoading
 */

const FORM_INICIAL = {
  titulo:     '',
  descricao:  '',
  objetivo:   'hipertrofia',
  duracaoSem: '',
  ativo:      true,
};

class ClientPlanosPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      planos:       [],
      loading:      true,
      erro:         null,
      modalAberto:  false,
      planoAEditar: null,
      form:         { ...FORM_INICIAL },
      formErro:     null,
      formLoading:  false,
      // Filtros
      filtroAtivo:  '',   // '' | 'ativos' | 'inativos'
      filtroTipo:   '',   // '' | 'pessoal' | 'profissional'
    };

    this.carregarPlanos   = this.carregarPlanos.bind(this);
    this.abrirModalCriar  = this.abrirModalCriar.bind(this);
    this.abrirModalEditar = this.abrirModalEditar.bind(this);
    this.fecharModal      = this.fecharModal.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleSubmit     = this.handleSubmit.bind(this);
    this.handleApagar     = this.handleApagar.bind(this);
    this.handleFiltroAtivo = this.handleFiltroAtivo.bind(this);
    this.handleFiltroTipo  = this.handleFiltroTipo.bind(this);
  }

  componentDidMount() {
    this.carregarPlanos();
  }

  // ─── API ──────────────────────────────────────────────────────────────────

  async carregarPlanos() {
    this.setState({ loading: true, erro: null });
    try {
      const res = await apiClient.get('/planos');
      this.setState({ planos: res.data, loading: false });
    } catch (err) {
      this.setState({
        erro:    err.response?.data?.erro || 'Erro ao carregar planos.',
        loading: false,
      });
    }
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  abrirModalCriar() {
    this.setState({
      modalAberto:  true,
      planoAEditar: null,
      form:         { ...FORM_INICIAL },
      formErro:     null,
    });
  }

  abrirModalEditar(plano) {
    this.setState({
      modalAberto:  true,
      planoAEditar: plano,
      form: {
        titulo:     plano.titulo,
        descricao:  plano.descricao || '',
        objetivo:   plano.objetivo,
        duracaoSem: plano.duracaoSem,
        ativo:      plano.ativo ?? true,
      },
      formErro: null,
    });
  }

  fecharModal() {
    if (this.state.formLoading) return;          // bloqueia fechar durante submit
    this.setState({ modalAberto: false, planoAEditar: null, formErro: null });
  }

  // ─── Formulário ───────────────────────────────────────────────────────────

  handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    this.setState((prev) => ({
      form: {
        ...prev.form,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  }

  async handleSubmit(e) {
    e.preventDefault();
    const { form, planoAEditar } = this.state;

    // Validação client-side
    if (!form.titulo.trim()) {
      this.setState({ formErro: 'O título é obrigatório.' });
      return;
    }
    if (!form.duracaoSem || Number(form.duracaoSem) < 1) {
      this.setState({ formErro: 'A duração deve ser de pelo menos 1 semana.' });
      return;
    }

    this.setState({ formLoading: true, formErro: null });

    const payload = {
      titulo:     form.titulo.trim(),
      descricao:  form.descricao.trim() || undefined,
      objetivo:   form.objetivo,
      duracaoSem: Number(form.duracaoSem),
      ativo:      form.ativo,
      // 'tipo' só é enviado na criação (POST), não na edição (PUT),
      // para evitar o erro "Não pode alterar treinadorId, clienteId ou tipo do plano."
      ...(!planoAEditar && { tipo: 'pessoal' }),
    };

    try {
      if (planoAEditar) {
        await apiClient.put(`/planos/${planoAEditar.id}`, payload);
      } else {
        await apiClient.post('/planos', payload);
      }
      // Repõe formLoading ANTES de fechar/recarregar para desbloquear a UI
      this.setState({ formLoading: false }, async () => {
        this.fecharModal();
        await this.carregarPlanos();
      });
    } catch (err) {
      this.setState({
        formErro:    err.response?.data?.erro || 'Erro ao guardar plano.',
        formLoading: false,
      });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Apagar este plano? A ação é irreversível.')) return;
    try {
      await apiClient.delete(`/planos/${id}`);
      await this.carregarPlanos();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar plano.');
    }
  }

  handleFiltroAtivo(e)  { this.setState({ filtroAtivo: e.target.value }); }
  handleFiltroTipo(e)   { this.setState({ filtroTipo:  e.target.value }); }

  // ─── Render: modal ────────────────────────────────────────────────────────

  renderModal() {
    const { modalAberto, planoAEditar, form, formErro, formLoading } = this.state;
    const modoEditar = Boolean(planoAEditar);
    const req = <span className="pg-form__req">*</span>;

    return (
      <PageModal
        open={modalAberto}
        onClose={this.fecharModal}
        eyebrow="Plano Pessoal"
        title={modoEditar ? 'Editar Plano' : 'Novo Plano'}
        loading={formLoading}
      >
        <form onSubmit={this.handleSubmit} className="pg-form">
          <div className="pg-form__group">
            <label className="pg-form__label" htmlFor="titulo">
              Título {req}
            </label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              className="pg-form__input"
              value={form.titulo}
              onChange={this.handleFormChange}
              placeholder="Ex: Treino de Força - 3×/semana"
              maxLength={100}
              disabled={formLoading}
            />
          </div>

          <div className="pg-form__group">
            <label className="pg-form__label" htmlFor="descricao">
              Descrição
            </label>
            <textarea
              id="descricao"
              name="descricao"
              className="pg-form__input pg-form__textarea"
              value={form.descricao}
              onChange={this.handleFormChange}
              placeholder="Opcional - descreve o foco deste plano"
              disabled={formLoading}
            />
          </div>

          <div className="pg-form__row">
            <div className="pg-form__group" style={{ flex: 1 }}>
              <label className="pg-form__label" htmlFor="objetivo">
                Objetivo {req}
              </label>
              <select
                id="objetivo"
                name="objetivo"
                className="pg-form__input"
                value={form.objetivo}
                onChange={this.handleFormChange}
                disabled={formLoading}
              >
                {OBJETIVOS_PLANO.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pg-form__group pg-form__group--short">
              <label className="pg-form__label" htmlFor="duracaoSem">
                Semanas {req}
              </label>
              <input
                id="duracaoSem"
                name="duracaoSem"
                type="number"
                className="pg-form__input"
                value={form.duracaoSem}
                onChange={this.handleFormChange}
                min="1"
                max="52"
                placeholder="12"
                disabled={formLoading}
              />
            </div>
          </div>

          <label className="pg-form__checkbox-row">
            <input
              type="checkbox"
              name="ativo"
              checked={form.ativo}
              onChange={this.handleFormChange}
              disabled={formLoading}
            />
            <span className="pg-form__label" style={{ margin: 0 }}>
              Plano ativo
            </span>
          </label>

          {formErro && <div className="pg-form__error">{formErro}</div>}

          <FormFooter
            onCancel={this.fecharModal}
            loading={formLoading}
            submitLabel={modoEditar ? 'Guardar Alterações' : 'Criar Plano'}
            loadingLabel="A guardar…"
          />
        </form>
      </PageModal>
    );
  }

  // ─── Render principal ─────────────────────────────────────────────────────

  render() {
    const { planos, loading, erro, filtroAtivo, filtroTipo } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    // Aplicar filtros
    let planosFiltrados = planos;
    if (filtroAtivo === 'ativos')       planosFiltrados = planosFiltrados.filter((p) => p.ativo);
    if (filtroAtivo === 'inativos')     planosFiltrados = planosFiltrados.filter((p) => !p.ativo);
    if (filtroTipo  === 'pessoal')      planosFiltrados = planosFiltrados.filter((p) => p.tipo === 'pessoal');
    if (filtroTipo  === 'profissional') planosFiltrados = planosFiltrados.filter((p) => p.tipo === 'profissional');

    const pessoais      = planosFiltrados.filter((p) => p.tipo === 'pessoal');
    const profissionais = planosFiltrados.filter((p) => p.tipo === 'profissional');

    return (
      <div>
        {this.renderModal()}

        <PageTopbar
          title={<>Os Meus<span>/</span>Planos</>}
          actions={
            <button
              type="button"
              className="pg-btn pg-btn--primary"
              onClick={this.abrirModalCriar}
            >
              + Novo Plano
            </button>
          }
        />

        {/* Filtros */}
        <FilterBar>
          <FilterSelect
            value={filtroAtivo}
            onChange={this.handleFiltroAtivo}
            options={[
              { value: '',          label: 'Estado'   },
              { value: 'ativos',    label: 'Ativos'   },
              { value: 'inativos',  label: 'Inativos' },
            ]}
          />
          <FilterSelect
            value={filtroTipo}
            onChange={this.handleFiltroTipo}
            options={[
              { value: '',               label: 'Tipo'          },
              { value: 'pessoal',        label: 'Pessoal'       },
              { value: 'profissional',   label: 'Profissional'  },
            ]}
          />
        </FilterBar>
        <ActiveFiltersBar
          filters={[
            { label: 'Estado', value: filtroAtivo  === '' ? '' : filtroAtivo  === 'ativos' ? 'Ativos' : 'Inativos',      onClear: () => this.setState({ filtroAtivo:  '' }) },
            { label: 'Tipo',   value: filtroTipo   === '' ? '' : filtroTipo   === 'pessoal' ? 'Pessoal' : 'Profissional', onClear: () => this.setState({ filtroTipo:   '' }) },
          ]}
        />

        {planosFiltrados.length === 0 && (
          <EmptyState
            title={planos.length === 0 ? 'Sem planos ainda' : 'Sem planos com estes filtros'}
            text={
              planos.length === 0
                ? 'Cria o teu primeiro plano pessoal ou fala com o teu treinador.'
                : 'Tenta ajustar os filtros acima.'
            }
          />
        )}

        {profissionais.length > 0 && (
          <ClientTipoSection tipo="profissional" layout="grid">
            {profissionais.map((plano) => (
              <PlanoCard
                key={plano.id}
                plano={plano}
                onVerExercicios={this.props.onVerExercicios}
              />
            ))}
          </ClientTipoSection>
        )}

        {pessoais.length > 0 && (
          <ClientTipoSection tipo="pessoal" layout="grid">
            {pessoais.map((plano) => (
              <PlanoCard
                key={plano.id}
                plano={plano}
                onEditar={this.abrirModalEditar}
                onApagar={this.handleApagar}
                onVerExercicios={this.props.onVerExercicios}
              />
            ))}
          </ClientTipoSection>
        )}
      </div>
    );
  }
}

ClientPlanosPage.propTypes = {
  userId:          PropTypes.number,
  onVerExercicios: PropTypes.func,
};

ClientPlanosPage.defaultProps = {
  userId:          null,
  onVerExercicios: null,
};

export default ClientPlanosPage;
