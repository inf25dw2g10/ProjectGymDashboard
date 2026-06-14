import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ClienteCard from '../../components/trainer/ClienteCard';
import ClienteDetailPanel from '../../components/trainer/ClienteDetailPanel';
import FilterBar from '../../components/common/FilterBar';
import FilterInput from '../../components/common/FilterInput';
import PageTopbar from '../../components/common/PageTopbar';
import EmptyState from '../../components/common/EmptyState';

/**
 * ClientesPage - lista clientes do treinador.
 *
 * O backend GET /users (para treinador) devolve:
 *   - Clientes do âmbito deste treinador (têm plano OU avaliação profissional com ele)
 *   - Clientes sem qualquer treinador (disponíveis para associar)
 *
 * Cada utilizador tem o flag `temTreinador` calculado autoritativamente pelo backend
 * (true = está no âmbito deste treinador; false = ainda sem treinador atribuído).
 * Usamos esse flag directamente - não recalculamos no frontend a partir de /planos
 * ou /avaliacoes, pois isso duplicava lógica e causava inconsistências.
 */
class ClientesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clientes:           [],
      loading:            true,
      erro:               null,
      pesquisa:           '',
      clienteSelecionado: null,
    };

    this.handlePesquisa = this.handlePesquisa.bind(this);
    this.abrirDetalhe   = this.abrirDetalhe.bind(this);
    this.fecharDetalhe  = this.fecharDetalhe.bind(this);
  }

  componentDidMount() {
    if (this.props.trainerId) {
      this.carregarDados();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.trainerId !== this.props.trainerId && this.props.trainerId) {
      this.carregarDados();
    }
  }

  async carregarDados() {
    this.setState({ loading: true, erro: null });
    try {
      const resClientes = await apiClient.get('/users');
      // O backend já devolve só clientes relevantes (âmbito + sem treinador) com flag temTreinador
      const clientes = resClientes.data.filter((u) => u.role === 'cliente');
      this.setState({ clientes, loading: false });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar clientes.';
      this.setState({ erro: msg, loading: false });
    }
  }

  handlePesquisa(e) {
    this.setState({ pesquisa: e.target.value });
  }

  abrirDetalhe(cliente) {
    this.setState({ clienteSelecionado: cliente });
  }

  fecharDetalhe() {
    this.setState({ clienteSelecionado: null });
  }

  render() {
    const { clientes, loading, erro, pesquisa, clienteSelecionado } = this.state;
    const { onNavegar } = this.props;

    if (loading) return <LoadingSpinner />;
    if (erro)    return <ErrorMessage message={erro} />;

    const termo = pesquisa.toLowerCase().trim();
    const clientesFiltrados = termo
      ? clientes.filter((c) => {
          const nome  = (c.displayName || c.username || '').toLowerCase();
          const email = (c.email || '').toLowerCase();
          return nome.includes(termo) || email.includes(termo);
        })
      : clientes;

    // temTreinador vem directamente do backend - não recalcular
    const semTreinador = clientes.filter((c) => !c.temTreinador).length;

    return (
      <div>
        <PageTopbar
          title={<>Os Meus<span>/</span>Clientes</>}
          actions={
            <>
              {semTreinador > 0 && (
                <span className="pg-badge cc-badge--no-trainer">
                  {semTreinador} sem treinador
                </span>
              )}
              <span className="pg-counter">
                {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
              </span>
            </>
          }
        />

        <FilterBar>
          <FilterInput
            placeholder="Pesquisar por nome ou email..."
            value={pesquisa}
            onChange={this.handlePesquisa}
          />
        </FilterBar>

        {clientes.length === 0 && (
          <EmptyState text="Ainda não tens clientes atribuídos." />
        )}
        {clientes.length > 0 && clientesFiltrados.length === 0 && (
          <EmptyState text={`Nenhum cliente encontrado para "${pesquisa}".`} />
        )}

        <div className="pg-grid">
          {clientesFiltrados.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              temTreinador={!!cliente.temTreinador}  // usa o flag do backend directamente
              onClick={this.abrirDetalhe}
            />
          ))}
        </div>

        {clienteSelecionado && (
          <ClienteDetailPanel
            cliente={clienteSelecionado}
            temTreinador={!!clienteSelecionado.temTreinador}
            onFechar={this.fecharDetalhe}
            onNavegar={onNavegar}
          />
        )}
      </div>
    );
  }
}

ClientesPage.propTypes = {
  trainerId: PropTypes.number,
  onNavegar: PropTypes.func,
};

ClientesPage.defaultProps = {
  trainerId: null,
  onNavegar: null,
};

export default ClientesPage;
