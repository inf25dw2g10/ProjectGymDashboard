import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import ExercicioItem from '../../components/trainer/ExercicioItem';
import {
  GRUPOS_MUSCULARES,
  buildOpcoesFiltroGrupos,
  filtrarPorGrupoMuscular,
  ordenarExercicios,
} from '../../constants/filters';

/**
 * ClientExerciciosPage
 * Class Component - Exercícios do cliente, agrupados por plano.
 *
 * Regras de negócio (role: cliente):
 *   - Plano PESSOAL      → CRUD completo: criar / editar todos os campos / apagar
 *   - Plano PROFISSIONAL → edição parcial: só series, reps, pesoKg, notas
 */

const FORM_COMPLETO = {
  nome:          '',
  descricao:     '',
  grupoMuscular: 'peito',
  series:        '',
  reps:          '',
  pesoKg:        '',
  notas:         '',
  ordem:         '',
};

const FORM_PARCIAL = {
  series: '',
  reps:   '',
  pesoKg: '',
  notas:  '',
};

class ClientExerciciosPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      exercicios:       [],
      planos:           [],
      loading:          true,
      erro:             null,
      semPlanos:        false,
      // Filtros
      filtroPlanoId:    props.filtroPlanoIdInicial ? String(props.filtroPlanoIdInicial) : '',
      filtroGrupo:      '',
      // Modal
      modalAberto:      false,
      exercicioAEditar: null,
      modoParcial:      false,
      planoIdModal:     null,   // plano do exercício sendo criado/editado
      form:             { ...FORM_COMPLETO },
      formErro:         null,
      formLoading:      false,
    };

    this.carregarDados      = this.carregarDados.bind(this);
    this.abrirModalCriar    = this.abrirModalCriar.bind(this);
    this.abrirModalEditar   = this.abrirModalEditar.bind(this);
    this.fecharModal        = this.fecharModal.bind(this);
    this.handleFormChange   = this.handleFormChange.bind(this);
    this.handleSubmit       = this.handleSubmit.bind(this);
    this.handleApagar       = this.handleApagar.bind(this);
    this.handleFiltroPlano  = this.handleFiltroPlano.bind(this);
    this.handleFiltroGrupo  = this.handleFiltroGrupo.bind(this);
  }

  componentDidMount() {
    this.carregarDados();
  }

  async carregarDados() {
    this.setState({ loading: true, erro: null });
    try {
      const [resExs, resPlanos] = await Promise.all([
        apiClient.get('/exercicios'),
        apiClient.get('/planos'),
      ]);
      this.setState({
        exercicios: resExs.data,
        planos:     resPlanos.data,
        loading:    false,
      });
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.erro || '';
      if (status === 404 && msg.includes('planos associados')) {
        this.setState({ semPlanos: true, loading: false });
      } else {
        this.setState({ erro: msg || 'Erro ao carregar exercícios.', loading: false });
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  tipoPlano(planoId) {
    const p = this.state.planos.find((pl) => pl.id === Number(planoId));
    return p ? p.tipo : null;
  }

  planosPessoais() {
    return this.state.planos.filter((p) => p.tipo === 'pessoal');
  }

  /** Calcula a próxima ordem disponível para um dado plano */
  proximaOrdem(planoId) {
    const { exercicios } = this.state;
    const ordens = exercicios
      .filter((ex) => ex.planoId === Number(planoId))
      .map((ex) => ex.ordem)
      .filter((o) => o != null);
    return ordens.length > 0 ? Math.max(...ordens) + 1 : 1;
  }

  ordemDuplicadaLocal(planoId, ordem, excludeId = null) {
    return this.state.exercicios.some(
      (ex) => ex.planoId === Number(planoId) && ex.ordem === Number(ordem) && ex.id !== excludeId
    );
  }

  // ─── Modal ───────────────────────────────────────────────────────────────

  abrirModalCriar() {
    const pessoais = this.planosPessoais();
    const { filtroPlanoId, planos } = this.state;
    const planoFiltrado = filtroPlanoId
      ? planos.find((p) => String(p.id) === filtroPlanoId && p.tipo === 'pessoal')
      : null;
    const planoId = planoFiltrado
      ? planoFiltrado.id
      : pessoais.length > 0 ? pessoais[0].id : null;

    this.setState({
      modalAberto:      true,
      exercicioAEditar: null,
      modoParcial:      false,
      planoIdModal:     planoId,
      formErro:         null,
      form: {
        ...FORM_COMPLETO,
        ordem: planoId ? String(this.proximaOrdem(planoId)) : '',
      },
    });
  }

  abrirModalEditar(exercicio) {
    const tipo    = this.tipoPlano(exercicio.planoId);
    const parcial = tipo === 'profissional';

    this.setState({
      modalAberto:      true,
      exercicioAEditar: exercicio,
      modoParcial:      parcial,
      planoIdModal:     exercicio.planoId,
      formErro:         null,
      form: parcial
        ? {
            ...FORM_PARCIAL,
            series: exercicio.series != null ? String(exercicio.series) : '',
            reps:   exercicio.reps   != null ? String(exercicio.reps)   : '',
            pesoKg: exercicio.pesoKg != null ? String(exercicio.pesoKg) : '',
            notas:  exercicio.notas  || '',
          }
        : {
            nome:          exercicio.nome          || '',
            descricao:     exercicio.descricao     || '',
            grupoMuscular: exercicio.grupoMuscular || 'peito',
            series:        exercicio.series != null ? String(exercicio.series) : '',
            reps:          exercicio.reps   != null ? String(exercicio.reps)   : '',
            pesoKg:        exercicio.pesoKg != null ? String(exercicio.pesoKg) : '',
            notas:         exercicio.notas  || '',
            ordem:         exercicio.ordem  != null ? String(exercicio.ordem)  : '',
          },
    });
  }

  fecharModal() {
    if (this.state.formLoading) return;
    this.setState({ modalAberto: false, exercicioAEditar: null, formErro: null, planoIdModal: null });
  }

  handleFormChange(e) {
    const { name, value } = e.target;
    // Quando muda o plano no criar, recalcula a próxima ordem
    if (name === 'planoId') {
      const planoId = Number(value);
      this.setState((prev) => ({
        planoIdModal: planoId || null,
        form: {
          ...prev.form,
          ordem: value ? String(this.proximaOrdem(planoId)) : '',
        },
        formErro: null,
      }));
      return;
    }
    this.setState((prev) => ({
      form:     { ...prev.form, [name]: value },
      formErro: null,
    }));
  }

  handleFiltroPlano(e) { this.setState({ filtroPlanoId: e.target.value }); }
  handleFiltroGrupo(e) { this.setState({ filtroGrupo:   e.target.value }); }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async handleSubmit(e) {
    e.preventDefault();
    const { form, exercicioAEditar, modoParcial, planoIdModal } = this.state;

    if (!modoParcial) {
      if (!planoIdModal) {
        this.setState({ formErro: 'Seleciona um plano.' });
        return;
      }
      if (!form.nome.trim()) {
        this.setState({ formErro: 'O nome do exercício é obrigatório.' });
        return;
      }
      if (!form.series || Number(form.series) < 1) {
        this.setState({ formErro: 'As séries são obrigatórias.' });
        return;
      }
      if (!form.reps || Number(form.reps) < 1) {
        this.setState({ formErro: 'As repetições são obrigatórias.' });
        return;
      }
      if (!form.ordem || Number(form.ordem) < 1) {
        this.setState({ formErro: 'A ordem é obrigatória.' });
        return;
      }
      if (this.ordemDuplicadaLocal(planoIdModal, form.ordem, exercicioAEditar?.id)) {
        this.setState({ formErro: 'Já existe um exercício com esta ordem neste plano.' });
        return;
      }
    }

    this.setState({ formLoading: true, formErro: null });

    // Nota: planoId NÃO é enviado no PUT - a API rejeita alterações de associação
    const payload = modoParcial
      ? {
          series: form.series ? Number(form.series) : null,
          reps:   form.reps   ? Number(form.reps)   : null,
          pesoKg: form.pesoKg ? Number(form.pesoKg) : null,
          notas:  form.notas.trim() || null,
        }
      : {
          nome:          form.nome.trim(),
          descricao:     form.descricao.trim() || null,
          grupoMuscular: form.grupoMuscular,
          series:        form.series ? Number(form.series) : null,
          reps:          form.reps   ? Number(form.reps)   : null,
          pesoKg:        form.pesoKg ? Number(form.pesoKg) : null,
          notas:         form.notas.trim() || null,
          ordem:         Number(form.ordem),
          // planoId só no POST (criação)
          ...(exercicioAEditar ? {} : { planoId: planoIdModal }),
        };

    try {
      if (exercicioAEditar) {
        await apiClient.put(`/exercicios/${exercicioAEditar.id}`, payload);
      } else {
        await apiClient.post('/exercicios', payload);
      }
      this.setState({ formLoading: false }, () => {
        this.fecharModal();
        this.carregarDados();
      });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar exercício.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Tens a certeza que queres apagar este exercício?')) return;
    try {
      await apiClient.delete(`/exercicios/${id}`);
      this.carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar exercício.');
    }
  }

  // ─── Modal ───────────────────────────────────────────────────────────────

  renderModal() {
    const { modalAberto, exercicioAEditar, modoParcial, planoIdModal, form, formErro, formLoading } = this.state;
    const tituloModal = exercicioAEditar ? 'Editar Exercício' : 'Novo Exercício';
    const req = <span className="pg-form__req">*</span>;

    return (
      <PageModal
        open={modalAberto}
        onClose={this.fecharModal}
        eyebrow="Exercício"
        title={tituloModal}
        loading={formLoading}
      >
        <form onSubmit={this.handleSubmit} className="pg-form">
            {formErro && <div className="pg-form__error">{formErro}</div>}

            {!modoParcial && (
              <>
                {/* Plano - só mostra no criar */}
                {!exercicioAEditar && (
                  <div className="pg-form__group">
                    <label className="pg-form__label">Plano {req}</label>
                    <select
                      name="planoId"
                      value={planoIdModal ? String(planoIdModal) : ''}
                      onChange={this.handleFormChange}
                      className="pg-form__input"
                      disabled={formLoading}
                    >
                      <option value="">Seleciona...</option>
                      {this.planosPessoais().map((p) => (
                        <option key={p.id} value={p.id}>{p.titulo}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pg-form__group">
                  <label className="pg-form__label">Nome {req}</label>
                  <input
                    name="nome" type="text" value={form.nome}
                    onChange={this.handleFormChange} className="pg-form__input"
                    placeholder="Ex: Supino Reto com Barra" disabled={formLoading}
                  />
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Grupo muscular {req}</label>
                  <select
                    name="grupoMuscular" value={form.grupoMuscular}
                    onChange={this.handleFormChange} className="pg-form__input"
                    disabled={formLoading}
                  >
                    {GRUPOS_MUSCULARES.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="pg-form__row">
              <div className="pg-form__group pg-form__group--short">
                <label className="pg-form__label">Séries {req}</label>
                <input
                  name="series" type="number" min="1" value={form.series}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder="4" disabled={formLoading}
                />
              </div>
              <div className="pg-form__group pg-form__group--short">
                <label className="pg-form__label">Repetições {req}</label>
                <input
                  name="reps" type="number" min="1" value={form.reps}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder="10" disabled={formLoading}
                />
              </div>
              <div className="pg-form__group pg-form__group--short">
                <label className="pg-form__label">Peso (kg)</label>
                <input
                  name="pesoKg" type="number" step="0.5" min="0" value={form.pesoKg}
                  onChange={this.handleFormChange} className="pg-form__input"
                  placeholder="60" disabled={formLoading}
                />
              </div>
              {!modoParcial && (
                <div className="pg-form__group pg-form__group--short">
                  <label className="pg-form__label">Ordem {req}</label>
                  <input
                    name="ordem" type="number" min="1" value={form.ordem}
                    onChange={this.handleFormChange} className="pg-form__input"
                    placeholder="1" disabled={formLoading}
                  />
                </div>
              )}
            </div>

            <div className="pg-form__group">
              <label className="pg-form__label">Notas</label>
              <textarea
                name="notas" value={form.notas}
                onChange={this.handleFormChange}
                className="pg-form__input pg-form__textarea"
                placeholder="Observações pessoais, progressão..."
                disabled={formLoading}
              />
            </div>

            <FormFooter onCancel={this.fecharModal} loading={formLoading} />
          </form>
      </PageModal>
    );
  }

  // ─── Render principal ────────────────────────────────────────────────────

  render() {
    const { exercicios, planos, loading, erro, semPlanos, filtroPlanoId, filtroGrupo } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    if (semPlanos) {
      return (
        <div>
          <PageTopbar title={<>Os Meus<span>/</span>Exercícios</>} />
          <EmptyState text="Ainda não tens exercícios. Começa por criar um plano para poderes criar exercicios ou aguarda que o teu treinador te atribua um plano." />
        </div>
      );
    }

    const exerciciosPorPlano = filtroPlanoId
      ? exercicios.filter((ex) => String(ex.planoId) === filtroPlanoId)
      : exercicios;

    const lista = filtrarPorGrupoMuscular(exerciciosPorPlano, filtroGrupo);

    const temPessoais  = this.planosPessoais().length > 0;
    const opcoesFiltro = buildOpcoesFiltroGrupos(exercicios);
    const opcoesPlanos = [
      { value: '', label: 'Plano' },
      ...planos.map((p) => ({ value: String(p.id), label: p.titulo })),
    ];

    const labelPlanoAtivo = filtroPlanoId
      ? (planos.find((p) => String(p.id) === filtroPlanoId)?.titulo || filtroPlanoId)
      : '';
    const labelGrupoAtivo = filtroGrupo
      ? (opcoesFiltro.find((o) => o.value === filtroGrupo)?.label || filtroGrupo)
      : '';

    return (
      <div>
        {this.renderModal()}

        <PageTopbar
          title={<>Os Meus<span>/</span>Exercícios</>}
          actions={
            temPessoais ? (
              <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
                + Novo Exercício
              </button>
            ) : null
          }
        />

        {planos.length > 0 && (
          <FilterBar>
            {planos.length > 1 && (
              <FilterSelect
                value={filtroPlanoId}
                onChange={this.handleFiltroPlano}
                options={opcoesPlanos}
              />
            )}
            <FilterSelect
              value={filtroGrupo}
              onChange={this.handleFiltroGrupo}
              options={opcoesFiltro}
            />
          </FilterBar>
        )}
        <ActiveFiltersBar
          filters={[
            { label: 'Plano', value: labelPlanoAtivo, onClear: () => this.setState({ filtroPlanoId: '' }) },
            { label: 'Grupo', value: labelGrupoAtivo, onClear: () => this.setState({ filtroGrupo:   '' }) },
          ]}
        />

        {lista.length === 0 && (
          <EmptyState
            text={
              exercicios.length === 0
                ? 'Ainda não tens exercícios. Cria um num plano pessoal ou aguarda que o teu treinador os defina.'
                : 'Nenhum exercício com estes filtros.'
            }
          />
        )}

        {planos
          .filter((p) => !filtroPlanoId || String(p.id) === filtroPlanoId)
          .map((p) => {
            const exsDoPlano = ordenarExercicios(lista.filter((ex) => ex.planoId === p.id));
            if (exsDoPlano.length === 0) return null;
            const isPessoal = p.tipo === 'pessoal';
            return (
              <section key={p.id} className="pg-plan-section">
                <PageTopbar section title={p.titulo} />
                <div className="pg-list">
                  {exsDoPlano.map((ex, i) => (
                    <ExercicioItem
                      key={ex.id}
                      exercicio={ex}
                      numero={i + 1}
                      onEditar={this.abrirModalEditar}
                      onApagar={isPessoal ? this.handleApagar : null}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    );
  }
}

ClientExerciciosPage.propTypes = {
  userId:               PropTypes.number,
  filtroPlanoIdInicial: PropTypes.number,
};

ClientExerciciosPage.defaultProps = {
  userId:               null,
  filtroPlanoIdInicial: null,
};

export default ClientExerciciosPage;