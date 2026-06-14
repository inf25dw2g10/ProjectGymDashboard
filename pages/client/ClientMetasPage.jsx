import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import MetaItem from '../../components/metas/MetaItem';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import ClientTipoSection from '../../components/common/ClientTipoSection';

/**
 * ClientMetasPage
 * Class Component - CRUD completo de metas para o cliente.
 *
 * Campos da API (Meta): descricao, valorAlvo, valorAtual, unidade, prazo, estado, planoId
 * Regras: cliente só pode criar/editar/apagar em planos pessoais próprios.
 *         Metas profissionais são só leitura para o cliente.
 */

const FORM_INICIAL = {
  descricao:  '',
  valorAlvo:  '',
  valorAtual: '',
  unidade:    '',
  prazo:      '',
  estado:     'ativa',
  planoId:    '',
};

class ClientMetasPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      metas:          [],
      planosPessoais: [],
      loading:        true,
      erro:           null,
      // Filtros
      filtroTipo:     '',
      filtroEstado:   '',
      filtroPrazo:    '',      // '' | 'futuras' | 'passadas'
      filtroPeriodo:  '',      // '' | 'futuras' | 'passadas'
      sortPrazo:      'asc',   // 'asc' = prazo mais próximo primeiro
      // Modal
      modalAberto:    false,
      metaAEditar:    null,
      form:           { ...FORM_INICIAL },
      formErro:       null,
      formLoading:    false,
    };

    this.carregarDados     = this.carregarDados.bind(this);
    this.abrirModalCriar   = this.abrirModalCriar.bind(this);
    this.abrirModalEditar  = this.abrirModalEditar.bind(this);
    this.fecharModal       = this.fecharModal.bind(this);
    this.handleFormChange  = this.handleFormChange.bind(this);
    this.handleSubmit      = this.handleSubmit.bind(this);
    this.handleApagar      = this.handleApagar.bind(this);
    this.handleFiltroTipo    = this.handleFiltroTipo.bind(this);
    this.handleFiltroEstado  = this.handleFiltroEstado.bind(this);
    this.handleFiltroPeriodo = this.handleFiltroPeriodo.bind(this);
    this.handleSort          = this.handleSort.bind(this);
  }

  componentDidMount() {
    this.carregarDados();
  }

  async carregarDados() {
    this.setState({ loading: true, erro: null });
    try {
      const [resMetas, resPlanos] = await Promise.all([
        apiClient.get('/metas'),
        apiClient.get('/planos'),
      ]);
      const planosPessoais = resPlanos.data.filter((p) => p.tipo === 'pessoal');
      this.setState({ metas: resMetas.data, planosPessoais, loading: false });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar dados.';
      this.setState({ erro: msg, loading: false });
    }
  }

  // ─── Modal ───────────────────────────────────────────────────────────────

  abrirModalCriar() {
    this.setState({
      modalAberto:  true,
      metaAEditar:  null,
      formErro:     null,
      formLoading:  false,
      form:         { ...FORM_INICIAL },
    });
  }

  abrirModalEditar(meta) {
    this.setState({
      modalAberto:  true,
      metaAEditar:  meta,
      formErro:     null,
      formLoading:  false,  // FIX: reset ao abrir
      form: {
        descricao:  meta.descricao  || '',
        valorAlvo:  meta.valorAlvo  != null ? String(meta.valorAlvo)  : '',
        valorAtual: meta.valorAtual != null ? String(meta.valorAtual) : '',
        unidade:    meta.unidade    || '',
        prazo:      meta.prazo      || '',
        estado:     meta.estado     || 'ativa',
        planoId:    meta.planoId    ? String(meta.planoId) : '',
      },
    });
  }

  fecharModal() {
    // FIX: resetar formLoading - era a causa do "a guardar" infinito
    this.setState({ modalAberto: false, metaAEditar: null, formErro: null, formLoading: false });
  }

  handleFormChange(e) {
    const { name, value } = e.target;
    this.setState((prev) => {
      const novoForm = { ...prev.form, [name]: value };
      // FIX: quando estado muda para 'concluida', valorAtual = valorAlvo (→ 100%)
      if (name === 'estado' && value === 'concluida' && novoForm.valorAlvo) {
        novoForm.valorAtual = novoForm.valorAlvo;
      }
      return { form: novoForm, formErro: null };
    });
  }

  handleFiltroTipo(e)    { this.setState({ filtroTipo:    e.target.value }); }
  handleFiltroEstado(e)  { this.setState({ filtroEstado:  e.target.value }); }
  handleFiltroPeriodo(e) { this.setState({ filtroPeriodo: e.target.value }); }
  handleSort(e)          { this.setState({ sortPrazo:     e.target.value }); }

  // ─── CRUD ────────────────────────────────────────────────────────────────

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
      descricao:  form.descricao.trim(),
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
        await apiClient.post('/metas', { ...payload, planoId: Number(form.planoId) });
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

  // ─── Render ──────────────────────────────────────────────────────────────

  render() {
    const {
      metas, planosPessoais, loading, erro,
      modalAberto, metaAEditar, form, formErro, formLoading,
      filtroTipo, filtroEstado, filtroPeriodo, sortPrazo,
    } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    // Filtros
    let lista = metas;
    if (filtroTipo)   lista = lista.filter((m) => m.tipo   === filtroTipo);
    if (filtroEstado) lista = lista.filter((m) => m.estado === filtroEstado);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (filtroPeriodo === 'futuras') {
      lista = lista.filter((m) => m.prazo && new Date(m.prazo) >= hoje);
    } else if (filtroPeriodo === 'passadas') {
      lista = lista.filter((m) => m.prazo && new Date(m.prazo) < hoje);
    }

    // Sort por prazo (metas sem prazo vão para o fim)
    const listaOrdenada = lista.slice().sort((a, b) => {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return sortPrazo === 'asc'
        ? new Date(a.prazo) - new Date(b.prazo)
        : new Date(b.prazo) - new Date(a.prazo);
    });

    // Secções (só quando não há filtro de tipo activo)
    const comFiltroTipo     = filtroTipo !== '';
    const profissionais     = listaOrdenada.filter((m) => m.tipo === 'profissional');
    const pessoais          = listaOrdenada.filter((m) => m.tipo === 'pessoal');

    const ESTADO_LABEL = { ativa: 'Ativa', concluida: 'Concluída', cancelada: 'Cancelada' };

    return (
      <div>
        <PageTopbar
          title={<>As Minhas<span>/</span>Metas</>}
          actions={
            planosPessoais.length > 0 ? (
              <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
                + Nova Meta
              </button>
            ) : null
          }
        />

        {/* Filtros */}
        <FilterBar>
          <FilterSelect
            label="Estado"
            value={filtroEstado}
            onChange={this.handleFiltroEstado}
            options={[
              { value: '', label: 'Estados' },
              { value: 'ativa', label: 'Ativa' },
              { value: 'concluida', label: 'Concluída' },
              { value: 'cancelada', label: 'Cancelada' },
            ]}
          />
          <FilterSelect
            label="Tipo"
            value={filtroTipo}
            onChange={this.handleFiltroTipo}
            options={[
              { value: '', label: 'Metas' },
              { value: 'pessoal', label: 'Pessoais' },
              { value: 'profissional', label: 'Profissionais' },
            ]}
          />
          <FilterSelect
            label="Data"
            value={filtroPeriodo}
            onChange={this.handleFiltroPeriodo}
            options={[
              { value: '', label: 'Data' },
              { value: 'futuras', label: 'Metas Futuras' },
              { value: 'passadas', label: 'Metas Passadas' },
            ]}
          />
          <FilterSelect
            label="Ordenar"
            value={sortPrazo}
            onChange={this.handleSort}
            sort
            options={[
              { value: 'asc', label: 'Prazo mais Próximo' },
              { value: 'desc', label: 'Prazo mais Distante' },
            ]}
          />
        </FilterBar>

        <ActiveFiltersBar
          filters={[
            {
              label:   'Tipo',
              value:   filtroTipo ? (filtroTipo === 'pessoal' ? 'Pessoais' : 'Profissionais') : '',
              onClear: () => this.setState({ filtroTipo: '' }),
            },
            {
              label:   'Estado',
              value:   filtroEstado ? ESTADO_LABEL[filtroEstado] : '',
              onClear: () => this.setState({ filtroEstado: '' }),
            },
            {
              label:   'Período',
              value:   filtroPeriodo === 'futuras' ? 'Prazo futuro' : filtroPeriodo === 'passadas' ? 'Prazo passado' : '',
              onClear: () => this.setState({ filtroPeriodo: '' }),
            },
          ]}
        />

        {metas.length === 0 && (
          <EmptyState text="Ainda não tens metas definidas." />
        )}
        {metas.length > 0 && listaOrdenada.length === 0 && (
          <EmptyState text="Nenhuma meta com estes filtros." />
        )}

        {/* Com filtro de tipo activo: lista plana */}
        {comFiltroTipo && listaOrdenada.length > 0 && (
          <div className="pg-list">
            {listaOrdenada.map((meta) => (
              <MetaItem
                key={meta.id}
                meta={meta}
                // FIX: no contexto cliente, soPessoal=true sempre - esconde editar/apagar em profissionais
                soPessoal={true}
                onEditar={this.abrirModalEditar}
                onApagar={this.handleApagar}
              />
            ))}
          </div>
        )}

        {/* Sem filtro de tipo: secções com títulos */}
        {!comFiltroTipo && listaOrdenada.length > 0 && (
          <>
            {profissionais.length > 0 && (
              <ClientTipoSection tipo="profissional">
                {profissionais.map((meta) => (
                  <MetaItem
                    key={meta.id}
                    meta={meta}
                    soPessoal={true}
                    onEditar={this.abrirModalEditar}
                    onApagar={this.handleApagar}
                  />
                ))}
              </ClientTipoSection>
            )}
            {pessoais.length > 0 && (
              <ClientTipoSection tipo="pessoal">
                {pessoais.map((meta) => (
                  <MetaItem
                    key={meta.id}
                    meta={meta}
                    soPessoal={true}
                    onEditar={this.abrirModalEditar}
                    onApagar={this.handleApagar}
                  />
                ))}
              </ClientTipoSection>
            )}
          </>
        )}

        {/* Modal criar/editar */}
        <PageModal
          open={modalAberto}
          onClose={this.fecharModal}
          eyebrow="Meta Pessoal"
          title={metaAEditar ? 'Editar Meta' : 'Nova Meta'}
          loading={formLoading}
        >
          <form onSubmit={this.handleSubmit} className="pg-form">
                {formErro && <div className="pg-form__error">{formErro}</div>}

                {!metaAEditar && (
                  <div className="pg-form__group">
                    <label className="pg-form__label">Plano <span>*</span></label>
                    <select
                      name="planoId"
                      value={form.planoId}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      disabled={formLoading}
                    >
                      <option value="">Seleciona um plano...</option>
                      {planosPessoais.map((p) => (
                        <option key={p.id} value={p.id}>{p.titulo}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pg-form__group">
                  <label className="pg-form__label">Descrição <span>*</span></label>
                  <input
                    name="descricao"
                    type="text"
                    value={form.descricao}
                    onChange={this.handleFormChange}
                    className="pg-form__input"
                    placeholder="Ex: Perder 5kg em 2 meses"
                    disabled={formLoading}
                  />
                </div>

                <div className="pg-form__row">
                  <div className="pg-form__group">
                    <label className="pg-form__label">Valor alvo</label>
                    <input
                      name="valorAlvo"
                      type="number"
                      value={form.valorAlvo}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      placeholder="70"
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
                      placeholder="78"
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
                      placeholder="kg"
                      disabled={formLoading}
                    />
                  </div>
                </div>

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
                        <option value="ativa">Ativa</option>
                        <option value="concluida">Concluída</option>
                        <option value="cancelada">Cancelada</option>
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

ClientMetasPage.propTypes = {
  userId: PropTypes.number,
};

export default ClientMetasPage;