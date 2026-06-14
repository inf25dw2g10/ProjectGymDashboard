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
import ClientTipoSection from '../../components/common/ClientTipoSection';
import { formatDateLongPt } from '../../utils/formatDate';

/**
 * ClientAvaliacoesPage
 * Class Component - Avaliações físicas do cliente.
 *
 * Regras de negócio (role: cliente):
 *   - Avaliações PESSOAIS      → CRUD completo: criar / editar / apagar
 *   - Avaliações PROFISSIONAIS → apenas leitura (criadas pelo treinador)
 *
 * Campos da API (AvaliacaoFisica):
 *   data, pesoKg, alturaCm, percGordura, imc, notas, tipo
 *   (massaMuscular NÃO existe na BD)
 *
 * Endpoints:
 *   GET    /avaliacoes      → lista avaliações do cliente
 *   POST   /avaliacoes      → criar avaliação pessoal
 *   PUT    /avaliacoes/:id  → editar avaliação pessoal
 *   DELETE /avaliacoes/:id  → apagar avaliação pessoal
 */

// FIX: campos alinhados com a API - pesoKg, alturaCm, percGordura (massaMuscular não existe)
const FORM_INICIAL = {
  data:        '',
  pesoKg:      '',
  alturaCm:    '',
  percGordura: '',
  imc:         '',
  notas:       '',
};

function calcularImc(pesoKg, alturaCm) {
  const p = parseFloat(pesoKg);
  const a = parseFloat(alturaCm);
  if (!p || !a || a <= 0) return null;
  return (p / ((a / 100) * (a / 100))).toFixed(1);
}

class ClientAvaliacoesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      avaliacoes:       [],
      loading:          true,
      erro:             null,
      filtroTipo:       '',
      sortDir:          'desc',
      // Modal
      modalAberto:      false,
      avaliacaoAEditar: null,
      form:             { ...FORM_INICIAL },
      formErro:         null,
      formLoading:      false,
    };

    this.carregarAvaliacoes  = this.carregarAvaliacoes.bind(this);
    this.abrirModalCriar     = this.abrirModalCriar.bind(this);
    this.abrirModalEditar    = this.abrirModalEditar.bind(this);
    this.fecharModal         = this.fecharModal.bind(this);
    this.handleFormChange    = this.handleFormChange.bind(this);
    this.handleSubmit        = this.handleSubmit.bind(this);
    this.handleApagar        = this.handleApagar.bind(this);
    this.handleFiltro        = this.handleFiltro.bind(this);
    this.handleSort          = this.handleSort.bind(this);
  }

  componentDidMount() {
    this.carregarAvaliacoes();
  }

  async carregarAvaliacoes() {
    this.setState({ loading: true, erro: null });
    try {
      const res = await apiClient.get('/avaliacoes');
      this.setState({ avaliacoes: res.data, loading: false });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar avaliações.';
      this.setState({ erro: msg, loading: false });
    }
  }

  // ─── Modal ───────────────────────────────────────────────────────────────

  abrirModalCriar() {
    this.setState({
      modalAberto:      true,
      avaliacaoAEditar: null,
      form:             { ...FORM_INICIAL },
      formErro:         null,
      formLoading:      false,  // FIX: garantir reset ao abrir
    });
  }

  abrirModalEditar(avaliacao) {
    this.setState({
      modalAberto:      true,
      avaliacaoAEditar: avaliacao,
      formErro:         null,
      formLoading:      false,  // FIX: garantir reset ao abrir
      form: {
        data:        avaliacao.data        ? avaliacao.data.split('T')[0] : '',
        // FIX: campos corretos da API - pesoKg, alturaCm, percGordura
        pesoKg:      avaliacao.pesoKg      != null ? String(avaliacao.pesoKg)      : '',
        alturaCm:    avaliacao.alturaCm    != null ? String(avaliacao.alturaCm)    : '',
        percGordura: avaliacao.percGordura != null ? String(avaliacao.percGordura) : '',
        imc:         avaliacao.imc         != null ? String(avaliacao.imc)         : '',
        notas:       avaliacao.notas       || '',
      },
    });
  }

  fecharModal() {
    // FIX: resetar formLoading também - era a causa do "a guardar" infinito
    this.setState({ modalAberto: false, avaliacaoAEditar: null, formErro: null, formLoading: false });
  }

handleFormChange(e) {
  const { name, value } = e.target;
  this.setState((prev) => {
    const novoForm = { ...prev.form, [name]: value };
    if (name === 'pesoKg' || name === 'alturaCm') {
      const imc = calcularImc(novoForm.pesoKg, novoForm.alturaCm);
      if (imc) novoForm.imc = imc;
    }
    return { form: novoForm, formErro: null };
  });
}

  handleFiltro(e) {
    this.setState({ filtroTipo: e.target.value });
  }

  handleSort(e) {
    this.setState({ sortDir: e.target.value });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async handleSubmit(e) {
    e.preventDefault();
    const { form, avaliacaoAEditar } = this.state;

    if (!form.data) {
      this.setState({ formErro: 'A data é obrigatória.' });
      return;
    }
    if (!form.pesoKg) {
      this.setState({ formErro: 'O peso é obrigatório.' });
      return;
    }
    if (!form.alturaCm) {
      this.setState({ formErro: 'A altura é obrigatória.' });
      return;
    }

    this.setState({ formLoading: true, formErro: null });

    // FIX: payload com os nomes de campos corretos da API
    const payload = {
      data:        form.data,
      pesoKg:      form.pesoKg      ? Number(form.pesoKg)      : null,
      alturaCm:    form.alturaCm    ? Number(form.alturaCm)    : null,
      percGordura: form.percGordura ? Number(form.percGordura) : null,
      imc:         form.imc         ? Number(form.imc)         : null,
      notas:       form.notas.trim() || null,
    };

    try {
      if (avaliacaoAEditar) {
        await apiClient.put(`/avaliacoes/${avaliacaoAEditar.id}`, payload);
      } else {
        await apiClient.post('/avaliacoes', payload);
      }
      this.fecharModal();
      await this.carregarAvaliacoes();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar avaliação.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Tens a certeza que queres apagar esta avaliação?')) return;
    try {
      await apiClient.delete(`/avaliacoes/${id}`);
      await this.carregarAvaliacoes();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar avaliação.');
    }
  }

  // ─── Sub-renders ─────────────────────────────────────────────────────────

  renderStat(label, value) {
    return (
      <div className="pg-stat" key={label}>
        <span className="pg-stat__label">{label}</span>
        <span className="pg-stat__value">{value}</span>
      </div>
    );
  }

  renderAvaliacaoCard(av) {
    const isPessoal = av.tipo === 'pessoal';
    // Calcular IMC se não vier da API mas tivermos peso e altura
    const imcNum = av.imc != null ? Number(av.imc) : null;
    const imcDisplay = imcNum != null && !Number.isNaN(imcNum)
      ? imcNum.toFixed(1)
      : (av.pesoKg && av.alturaCm ? calcularImc(av.pesoKg, av.alturaCm) : null);

    const treinadorNome = !isPessoal && av.treinador
      ? (av.treinador.displayName || av.treinador.username)
      : null;

    return (
      <div key={av.id} className="pg-card">
        <div className="pg-card__header">
          <div>
            <h3 className="pg-card__title">{formatDateLongPt(av.data)}</h3>
          </div>
          {isPessoal ? (
            <div className="pg-card__actions">
              <button
                type="button"
                className="pg-btn pg-btn--ghost pg-btn--sm"
                onClick={() => this.abrirModalEditar(av)}
              >
                Editar
              </button>
              <button
                type="button"
                className="pg-btn pg-btn--danger pg-btn--sm"
                onClick={() => this.handleApagar(av.id)}
              >
                Apagar
              </button>
            </div>
          ) : treinadorNome ? (
            <span className="pg-badge">{treinadorNome}</span>
          ) : null}
        </div>

        {/* FIX: mostrar todos os campos disponíveis (igual ao trainer) - pesoKg, alturaCm, imc, percGordura */}
        <div className="pg-stats">
          {av.pesoKg      != null && this.renderStat('Peso',    `${Number(av.pesoKg).toFixed(1)} kg`)}
          {av.alturaCm    != null && this.renderStat('Altura',  `${Number(av.alturaCm).toFixed(0)} cm`)}
          {imcDisplay             && this.renderStat('IMC',     imcDisplay)}
          {av.percGordura != null && this.renderStat('Gordura', `${Number(av.percGordura).toFixed(1)}%`)}
        </div>

        {av.notas && (
          <p className="pg-notes">{av.notas}</p>
        )}
      </div>
    );
  }

  renderModal() {
    const { modalAberto, avaliacaoAEditar, form, formErro, formLoading } = this.state;
    const imcSugerido = calcularImc(form.pesoKg, form.alturaCm);

    return (
      <PageModal
        open={modalAberto}
        onClose={this.fecharModal}
        eyebrow="Avaliação Pessoal"
        title={avaliacaoAEditar ? 'Editar Avaliação' : 'Nova Avaliação'}
        loading={formLoading}
      >
        <form onSubmit={this.handleSubmit} className="pg-form">
            {formErro && <div className="pg-form__error">{formErro}</div>}

            <div className="pg-form__group">
              <label className="pg-form__label">Data <span>*</span></label>
              <input
                name="data" type="date" value={form.data}
                onChange={this.handleFormChange} className="pg-form__input"
                disabled={formLoading}
              />
            </div>

            <div className="pg-form__row">
              <div className="pg-form__group">
                <label className="pg-form__label">Peso (kg) <span>*</span></label>
                {/* FIX: name="pesoKg" em vez de name="peso" */}
                <input
                  name="pesoKg" type="number" step="0.1" min="0" value={form.pesoKg}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder="75.5" disabled={formLoading}
                />
              </div>
              <div className="pg-form__group">
                <label className="pg-form__label">Altura (cm) <span>*</span></label>
                {/* FIX: name="alturaCm" em vez de name="altura" */}
                <input
                  name="alturaCm" type="number" step="0.1" min="0" value={form.alturaCm}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder="175" disabled={formLoading}
                />
              </div>
              <div className="pg-form__group pg-form__group--short">
                <label className="pg-form__label">IMC</label>
                {/* FIX: ao editar, preenche o campo com o IMC calculado em vez de mostrar label acima */}
                <input
                  name="imc" type="number" step="0.01" min="0" value={form.imc}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder={imcSugerido || '24.7'} disabled={formLoading}
                />
              </div>
            </div>

            <div className="pg-form__row">
              <div className="pg-form__group">
                <label className="pg-form__label">% Gordura</label>
                {/* FIX: name="percGordura" em vez de name="percentagemGordura" */}
                <input
                  name="percGordura" type="number" step="0.1" min="0" max="100"
                  value={form.percGordura}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder="18.5" disabled={formLoading}
                />
              </div>
            </div>

            <div className="pg-form__group">
              <label className="pg-form__label">Notas / Observações</label>
              <textarea
                name="notas" value={form.notas}
                onChange={this.handleFormChange}
                className="pg-form__input pg-form__textarea"
                placeholder="Como te sentes? Que mudanças notaste?"
                disabled={formLoading}
              />
            </div>

          <FormFooter
            onCancel={this.fecharModal}
            loading={formLoading}
            submitLabel={avaliacaoAEditar ? 'Guardar Alterações' : 'Criar Avaliação'}
          />
        </form>
      </PageModal>
    );
  }

  // ─── Render principal ────────────────────────────────────────────────────

  render() {
    const { avaliacoes, loading, erro, filtroTipo, sortDir } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    const lista = filtroTipo
      ? avaliacoes.filter((a) => a.tipo === filtroTipo)
      : avaliacoes;

    const listaOrdenada = lista.slice().sort((a, b) =>
      sortDir === 'asc'
        ? new Date(a.data) - new Date(b.data)
        : new Date(b.data) - new Date(a.data)
    );

    // FIX: separar em profissionais e pessoais para mostrar com títulos de secção
    const profissionais = listaOrdenada.filter((a) => a.tipo === 'profissional');
    const pessoais      = listaOrdenada.filter((a) => a.tipo === 'pessoal');

    // Quando há filtro activo, não dividir por secções - mostrar tudo junto
    const comFiltro = filtroTipo !== '';

    return (
      <div>
        {this.renderModal()}

        <PageTopbar
          title={<>As Minhas<span>/</span>Avaliações</>}
          actions={
            <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
              + Nova Avaliação
            </button>
          }
        />

        <FilterBar>
          <FilterSelect
            label="Tipo"
            value={filtroTipo}
            onChange={this.handleFiltro}
            options={[
              { value: '', label: 'Tipo' },
              { value: 'pessoal', label: 'Pessoais' },
              { value: 'profissional', label: 'Profissionais' },
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
              label:   'Tipo',
              value:   filtroTipo === 'pessoal' ? 'Pessoais' : filtroTipo === 'profissional' ? 'Profissionais' : '',
              onClear: () => this.setState({ filtroTipo: '' }),
            },
          ]}
        />

        {avaliacoes.length === 0 && (
          <EmptyState text="Ainda não tens avaliações. Cria uma pessoal ou aguarda que o teu treinador registe uma." />
        )}
        {avaliacoes.length > 0 && listaOrdenada.length === 0 && (
          <EmptyState text="Nenhuma avaliação nesta categoria." />
        )}

        {/* FIX: quando não há filtro activo, mostrar por secções com título */}
        {!comFiltro && listaOrdenada.length > 0 && (
          <>
            {profissionais.length > 0 && (
              <ClientTipoSection tipo="profissional">
                {profissionais.map((av) => this.renderAvaliacaoCard(av))}
              </ClientTipoSection>
            )}
            {pessoais.length > 0 && (
              <ClientTipoSection tipo="pessoal">
                {pessoais.map((av) => this.renderAvaliacaoCard(av))}
              </ClientTipoSection>
            )}
          </>
        )}

        {/* Com filtro activo: lista plana sem secções */}
        {comFiltro && listaOrdenada.length > 0 && (
          <div className="pg-list">
            {listaOrdenada.map((av) => this.renderAvaliacaoCard(av))}
          </div>
        )}
      </div>
    );
  }
}

ClientAvaliacoesPage.propTypes = {
  userId: PropTypes.number,
};

ClientAvaliacoesPage.defaultProps = {
  userId: null,
};

export default ClientAvaliacoesPage;
