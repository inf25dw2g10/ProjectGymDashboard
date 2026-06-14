import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import FilterBar from '../../components/common/FilterBar';
import FilterSelect from '../../components/common/FilterSelect';
import ActiveFiltersBar from '../../components/common/ActiveFiltersBar';
import ExercicioItem from '../../components/trainer/ExercicioItem';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';
import PageModal from '../../components/common/PageModal';
import FormFooter from '../../components/common/FormFooter';
import { GRUPOS_MUSCULARES, buildOpcoesFiltroGrupos, filtrarPorGrupoMuscular, ordenarExercicios } from '../../constants/filters';

const FORM_INICIAL = {
  nome:          '',
  grupoMuscular: 'peito',
  series:        '',
  reps:          '',
  pesoKg:        '',
  notas:         '',
  ordem:         '',
};

class ExerciciosPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      exercicios:       [],
      loading:          false,
      erro:             null,
      filtroGrupo:      '',
      modalAberto:      false,
      exercicioAEditar: null,
      form:             { ...FORM_INICIAL },
      formErro:         null,
      formLoading:      false,
    };

    this.abrirModalCriar   = this.abrirModalCriar.bind(this);
    this.abrirModalEditar  = this.abrirModalEditar.bind(this);
    this.fecharModal       = this.fecharModal.bind(this);
    this.handleFormChange  = this.handleFormChange.bind(this);
    this.handleSubmit      = this.handleSubmit.bind(this);
    this.handleApagar      = this.handleApagar.bind(this);
    this.handleFiltroGrupo = this.handleFiltroGrupo.bind(this);
  }

  componentDidMount() {
    if (this.props.planoSelecionado) {
      this.carregarExercicios();
    }
  }

  componentDidUpdate(prevProps) {
    const planoAtual = this.props.planoSelecionado;
    const planoAnterior = prevProps.planoSelecionado;
    if (planoAtual?.id !== planoAnterior?.id) {
      if (planoAtual) {
        this.carregarExercicios();
      } else {
        this.setState({ exercicios: [], erro: null, loading: false });
      }
    }
  }

  async carregarExercicios() {
    const { planoSelecionado } = this.props;
    if (!planoSelecionado?.id) return;

    this.setState({ loading: true, erro: null });
    try {
      const res = await apiClient.get('/exercicios', {
        params: { plano_id: planoSelecionado.id },
      });
      this.setState({ exercicios: res.data, loading: false });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar exercícios.';
      this.setState({ erro: msg, loading: false });
    }
  }

  abrirModalCriar() {
    const proximaOrdem = this.calcularProximaOrdem();
    this.setState({
      modalAberto:      true,
      exercicioAEditar: null,
      formErro:         null,
      formLoading:      false,
      form:             { ...FORM_INICIAL, ordem: proximaOrdem },
    });
  }

  calcularProximaOrdem() {
    const { exercicios } = this.state;
    if (exercicios.length === 0) return '1';
    const ordensUsadas = exercicios.map((e) => e.ordem).filter((o) => o != null);
    if (ordensUsadas.length === 0) return '1';
    return String(Math.max(...ordensUsadas) + 1);
  }

  ordemDuplicadaLocal(ordem, excludeId = null) {
    return this.state.exercicios.some(
      (ex) => ex.ordem === ordem && ex.id !== excludeId
    );
  }

  abrirModalEditar(exercicio) {
    this.setState({
      modalAberto:      true,
      exercicioAEditar: exercicio,
      formErro:         null,
      formLoading:      false,
      form: {
        nome:          exercicio.nome          || '',
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
    this.setState({ modalAberto: false, exercicioAEditar: null, formErro: null, formLoading: false });
  }

  handleFormChange(e) {
    const { name, value } = e.target;
    this.setState((prev) => ({
      form:     { ...prev.form, [name]: value },
      formErro: null,
    }));
  }

  handleFiltroGrupo(e) {
    this.setState({ filtroGrupo: e.target.value });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const { form, exercicioAEditar } = this.state;
    const { planoSelecionado } = this.props;

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
      this.setState({ formErro: 'A ordem é obrigatória (número positivo).' });
      return;
    }

    const ordemNum = Number(form.ordem);
    if (this.ordemDuplicadaLocal(ordemNum, exercicioAEditar?.id)) {
      this.setState({ formErro: 'Já existe um exercício com esta ordem neste plano.' });
      return;
    }

    this.setState({ formLoading: true, formErro: null });

    const payload = {
      nome:          form.nome.trim(),
      grupoMuscular: form.grupoMuscular,
      series:        Number(form.series),
      reps:          Number(form.reps),
      pesoKg:        form.pesoKg ? Number(form.pesoKg) : null,
      notas:         form.notas.trim() || null,
      ordem:         ordemNum,
    };

    try {
      if (exercicioAEditar) {
        await apiClient.put(`/exercicios/${exercicioAEditar.id}`, payload);
      } else {
        await apiClient.post('/exercicios', {
          ...payload,
          planoId: planoSelecionado.id,
        });
      }
      this.fecharModal();
      this.carregarExercicios();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao guardar exercício.';
      this.setState({ formErro: msg, formLoading: false });
    }
  }

  async handleApagar(id) {
    if (!window.confirm('Tens a certeza que queres apagar este exercício?')) return;
    try {
      await apiClient.delete(`/exercicios/${id}`);
      this.carregarExercicios();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao apagar exercício.');
    }
  }

  renderSemPlano() {
    return (
      <EmptyState text="Seleciona um plano na aba Planos para ver e gerir os exercícios.">
        <button
          type="button"
          className="pg-btn pg-btn--primary"
          style={{ marginTop: '16px' }}
          onClick={this.props.onIrParaPlanos}
        >
          Ir para Planos
        </button>
      </EmptyState>
    );
  }

  render() {
    const { planoSelecionado } = this.props;

    if (!planoSelecionado) {
      return (
        <div>
          <PageTopbar title="Exercícios" />
          {this.renderSemPlano()}
        </div>
      );
    }

    const {
      exercicios, loading, erro, filtroGrupo,
      modalAberto, exercicioAEditar, form, formErro, formLoading,
    } = this.state;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    const listaFiltrada = filtrarPorGrupoMuscular(exercicios, filtroGrupo);
    const lista = ordenarExercicios(listaFiltrada);
    const opcoesFiltro = buildOpcoesFiltroGrupos(exercicios);

    return (
      <div>
        <PageTopbar
          title="Exercícios"
          subtitle={<>Plano: <strong>{planoSelecionado.titulo}</strong></>}
          actions={
            <>
              <button type="button" className="pg-btn pg-btn--ghost" onClick={this.props.onTrocarPlano}>
                Trocar plano
              </button>
              <button type="button" className="pg-btn pg-btn--primary" onClick={this.abrirModalCriar}>
                + Novo Exercício
              </button>
            </>
          }
        />

        <FilterBar>
          <FilterSelect
            label="Grupo muscular"
            value={filtroGrupo}
            onChange={this.handleFiltroGrupo}
            options={opcoesFiltro}
          />
        </FilterBar>
        <ActiveFiltersBar
          filters={[
            {
              label:   'Grupo muscular',
              value:   filtroGrupo ? (opcoesFiltro.find((o) => o.value === filtroGrupo)?.label || filtroGrupo) : '',
              onClear: () => this.setState({ filtroGrupo: '' }),
            },
          ]}
        />

        {exercicios.length === 0 && (
          <EmptyState text="Este plano ainda não tem exercícios." />
        )}
        {exercicios.length > 0 && lista.length === 0 && (
          <EmptyState text="Nenhum exercício neste grupo muscular." />
        )}

        <div className="pg-list">
          {lista.map((ex) => (
            <ExercicioItem
              key={ex.id}
              exercicio={ex}
              onEditar={this.abrirModalEditar}
              onApagar={this.handleApagar}
            />
          ))}
        </div>

        <PageModal
          open={modalAberto}
          onClose={this.fecharModal}
          eyebrow="Exercício"
          title={exercicioAEditar ? 'Editar Exercício' : 'Novo Exercício'}
          loading={formLoading}
        >
          <form onSubmit={this.handleSubmit} className="pg-form">
                {formErro && <div className="pg-form__error">{formErro}</div>}

                <div className="pg-form__group">
                  <label className="pg-form__label">Nome <span>*</span></label>
                  <input
                    name="nome" type="text" value={form.nome}
                    onChange={this.handleFormChange} className="pg-form__input"
                    placeholder="Ex: Supino Reto com Barra"
                    disabled={formLoading}
                  />
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Grupo muscular <span>*</span></label>
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

                <div className="pg-form__row">
                  <div className="pg-form__group pg-form__group--short">
                    <label className="pg-form__label">Séries <span>*</span></label>
                    <input
                      name="series" type="number" min="1" value={form.series}
                      onChange={this.handleFormChange} className="pg-form__input"
                      placeholder="4" disabled={formLoading}
                    />
                  </div>
                  <div className="pg-form__group pg-form__group--short">
                    <label className="pg-form__label">Repetições <span>*</span></label>
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
                      placeholder="20" disabled={formLoading}
                    />
                  </div>
                  <div className="pg-form__group pg-form__group--short">
                    <label className="pg-form__label">Ordem <span>*</span></label>
                    <input
                      name="ordem" type="number" min="1" value={form.ordem}
                      onChange={this.handleFormChange} className="pg-form__input"
                      placeholder="1" disabled={formLoading}
                      required
                    />
                  </div>
                </div>

                <div className="pg-form__group">
                  <label className="pg-form__label">Notas / Instruções</label>
                  <textarea
                    name="notas" value={form.notas}
                    onChange={this.handleFormChange}
                    className="pg-form__input pg-form__textarea"
                    placeholder="Posição inicial, execução, erros comuns..."
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

ExerciciosPage.propTypes = {
  trainerId:        PropTypes.number,
  planoSelecionado: PropTypes.shape({
    id:     PropTypes.number.isRequired,
    titulo: PropTypes.string.isRequired,
  }),
  onLimparPlano:    PropTypes.func.isRequired,
  onTrocarPlano:    PropTypes.func.isRequired,
  onIrParaPlanos:   PropTypes.func.isRequired,
};

ExerciciosPage.defaultProps = {
  trainerId:        null,
  planoSelecionado: null,
};

export default ExerciciosPage;