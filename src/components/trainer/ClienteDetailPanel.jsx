import React from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../api/apiClient';
import LoadingSpinner from '../common/LoadingSpinner';
import { labelEstadoSessao, badgeClassEstadoSessao } from '../../constants/filters';

/**
 * ClienteDetailPanel - drawer lateral com planos, sessões e avaliações do cliente.
 *
 * Clicar em "Ver Planos / Sessões / Avaliações" fecha o drawer e navega para
 * a aba correspondente com o filtro do cliente já aplicado (via onNavegar).
 */

const OBJETIVO_LABEL = {
  emagrecimento: 'Emagrecimento',
  hipertrofia:   'Hipertrofia',
  resistencia:   'Resistência',
  flexibilidade: 'Flexibilidade',
  saude_geral:   'Saúde Geral',
};

class ClienteDetailPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      planos:     [],
      sessoes:    [],
      avaliacoes: [],
      metas:      [],
      loading:    true,
      erro:       null,
      abaAtiva:  'planos',
    };
    this.mudarAba         = this.mudarAba.bind(this);
    this.irParaPlanos     = this.irParaPlanos.bind(this);
    this.irParaSessoes    = this.irParaSessoes.bind(this);
    this.irParaAvaliacoes = this.irParaAvaliacoes.bind(this);
    this.irParaMetas      = this.irParaMetas.bind(this);
  }

  componentDidMount() {
    this.carregarDados();
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') this.props.onFechar();
  };

  async carregarDados() {
    const { cliente, modo } = this.props;

    // Admin: apenas mostra perfil, sem carregar recursos
    if (modo === 'admin') {
      this.setState({ loading: false });
      return;
    }

    this.setState({ loading: true, erro: null });
    try {
      // Treinador: filtrar por treinador_id; Cliente: filtrar por cliente_id
      const params = modo === 'treinador'
        ? { treinador_id: cliente.id }
        : { cliente_id: cliente.id };

      const [resPlanos, resSessoes, resAval, resMetas] = await Promise.all([
        apiClient.get('/planos',     { params }),
        apiClient.get('/sessoes',    { params }),
        apiClient.get('/avaliacoes', { params }),
        apiClient.get('/metas',      { params }),
      ]);
      this.setState({
        planos:     resPlanos.data,
        sessoes:    resSessoes.data,
        avaliacoes: resAval.data,
        metas:      resMetas.data,
        loading:    false,
      });
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao carregar dados.';
      this.setState({ erro: msg, loading: false });
    }
  }

  mudarAba(aba) { this.setState({ abaAtiva: aba }); }

  irParaPlanos() {
    const { cliente, modo, onNavegar, onFechar } = this.props;
    onFechar();
    if (onNavegar) onNavegar('planos', cliente.id, modo);
  }

  irParaSessoes() {
    const { cliente, modo, onNavegar, onFechar } = this.props;
    onFechar();
    if (onNavegar) onNavegar('sessoes', cliente.id, modo);
  }

  irParaAvaliacoes() {
    const { cliente, modo, onNavegar, onFechar } = this.props;
    onFechar();
    if (onNavegar) onNavegar('avaliacoes', cliente.id, modo);
  }

  irParaMetas() {
    const { cliente, modo, onNavegar, onFechar } = this.props;
    onFechar();
    if (onNavegar) onNavegar('metas', cliente.id, modo);
  }

  renderPlanos() {
    const { planos } = this.state;
    if (planos.length === 0) return <p className="cdp-empty">Nenhum plano atribuído.</p>;
    return (
      <>
        {planos.map((p, idx) => (
          <div key={p.id} className="cdp-item">
            <div className="cdp-item__header">
              <span className="cdp-item__num">#{idx + 1}</span>
              <span className="cdp-item__titulo">{p.titulo}</span>
              <span className={`pg-badge${p.ativo ? ' pg-badge--ok' : ' pg-badge--error'}`}>
                {p.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="cdp-item__meta">
              <span className="pg-badge">{OBJETIVO_LABEL[p.objetivo] || p.objetivo}</span>
              <span className="pg-badge">{p.duracaoSem} sem.</span>
            </div>
            {p.descricao && <p className="cdp-item__notas">{p.descricao}</p>}
          </div>
        ))}
        <button type="button" className="cdp-nav-btn" onClick={this.irParaPlanos}>
          Gerir Planos →
        </button>
      </>
    );
  }

  renderSessoes() {
    const { sessoes } = this.state;
    if (sessoes.length === 0) return (
      <>
        <p className="cdp-empty">Nenhuma sessão registada.</p>
        <button type="button" className="cdp-nav-btn" onClick={this.irParaSessoes}>
          Gerir Sessões →
        </button>
      </>
    );
    const ordenadas = sessoes.slice().sort(
      (a, b) => new Date(b.dataSessao || b.data) - new Date(a.dataSessao || a.data)
    );
    return (
      <>
        {ordenadas.map((s, idx) => {
          const dataRaw = s.dataSessao || s.data;
          let dataFmt = '-';
          try { dataFmt = new Date(dataRaw).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }); }
          catch (_) { dataFmt = dataRaw; }
          const badgeClass = badgeClassEstadoSessao(s.estado);
          const duracao = s.duracaoMin != null ? s.duracaoMin : s.duracao;
          return (
            <div key={s.id} className="cdp-item">
              <div className="cdp-item__header">
                <span className="cdp-item__num">#{idx + 1}</span>
                <span className="cdp-item__titulo">{dataFmt}</span>
                <span className={badgeClass}>{labelEstadoSessao(s.estado)}</span>
              </div>
              <div className="cdp-item__meta">
                {s.plano && <span className="pg-badge">{s.plano.titulo}</span>}
                {duracao  && <span className="pg-badge">{duracao} min</span>}
              </div>
              {s.notas && <p className="cdp-item__notas">{s.notas}</p>}
            </div>
          );
        })}
        <button type="button" className="cdp-nav-btn" onClick={this.irParaSessoes}>
          Gerir Sessões →
        </button>
      </>
    );
  }

  renderAvaliacoes() {
    const { avaliacoes } = this.state;
    if (avaliacoes.length === 0) return (
      <>
        <p className="cdp-empty">Nenhuma avaliação registada.</p>
        <button type="button" className="cdp-nav-btn" onClick={this.irParaAvaliacoes}>
          Gerir Avaliações →
        </button>
      </>
    );
    const ordenadas = avaliacoes.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
    return (
      <>
        {ordenadas.map((a, idx) => {
          let dataFmt = '-';
          try { dataFmt = new Date(a.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }); }
          catch (_) { dataFmt = a.data; }
          let imcDisplay = null;
          const imcNum = a.imc != null ? Number(a.imc) : null;
          if (imcNum && !Number.isNaN(imcNum)) imcDisplay = imcNum.toFixed(1);
          else if (a.pesoKg && a.alturaCm) {
            const alt = Number(a.alturaCm) / 100;
            if (alt > 0) imcDisplay = (Number(a.pesoKg) / (alt * alt)).toFixed(1);
          }
          return (
            <div key={a.id} className="cdp-item">
              <div className="cdp-item__header">
                <span className="cdp-item__num">#{idx + 1}</span>
                <span className="cdp-item__titulo">{dataFmt}</span>
                <span className={`pg-badge${a.tipo === 'pessoal' ? '' : ' pg-badge--warn'}`}>
                  {a.tipo === 'pessoal' ? 'Pessoal' : 'Profissional'}
                </span>
              </div>
              <div className="pg-stats" style={{ marginTop: '8px' }}>
                {a.pesoKg     != null && <span className="pg-badge">{a.pesoKg} kg</span>}
                {a.alturaCm   != null && <span className="pg-badge">{a.alturaCm} cm</span>}
                {imcDisplay           && <span className="pg-badge">IMC {imcDisplay}</span>}
                {a.percGordura != null && <span className="pg-badge">{a.percGordura}% gordura</span>}
              </div>
              {a.notas && <p className="cdp-item__notas">{a.notas}</p>}
            </div>
          );
        })}
        <button type="button" className="cdp-nav-btn" onClick={this.irParaAvaliacoes}>
          Gerir Avaliações →
        </button>
      </>
    );
  }

  renderMetas() {
    const { metas } = this.state;
    if (metas.length === 0) return (
      <>
        <p className="cdp-empty">Nenhuma meta definida.</p>
        <button type="button" className="cdp-nav-btn" onClick={this.irParaMetas}>
          Gerir Metas →
        </button>
      </>
    );
    const ordenadas = metas.slice().sort((a, b) => {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo) - new Date(b.prazo);
    });
    const ESTADO_LABEL = { ativa: 'Ativa', concluida: 'Concluída', cancelada: 'Cancelada' };
    const ESTADO_BADGE = { ativa: 'pg-badge', concluida: 'pg-badge pg-badge--ok', cancelada: 'pg-badge pg-badge--error' };
    return (
      <>
        {ordenadas.map((m, idx) => {
          const prazoFmt = m.prazo
            ? new Date(m.prazo + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
            : null;
          const progresso = m.valorAlvo && m.valorAlvo > 0
            ? Math.min(100, Math.round((m.valorAtual / m.valorAlvo) * 100))
            : null;
          return (
            <div key={m.id} className="cdp-item">
              <div className="cdp-item__header">
                <span className="cdp-item__num">#{idx + 1}</span>
                <span className="cdp-item__titulo">{m.descricao}</span>
                <span className={ESTADO_BADGE[m.estado] || 'pg-badge'}>
                  {ESTADO_LABEL[m.estado] || m.estado}
                </span>
              </div>
              <div className="cdp-item__meta">
                {m.plano && <span className="pg-badge">{m.plano.titulo}</span>}
                {prazoFmt && <span className="pg-badge">Prazo: {prazoFmt}</span>}
              </div>
              {progresso !== null && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #888)', marginBottom: '4px' }}>
                    <span>{m.valorAtual} / {m.valorAlvo} {m.unidade || ''}</span>
                    <span>{progresso}%</span>
                  </div>
                  <div className="meta-item__progress-bar">
                    <div
                      className={`meta-item__progress-fill${progresso >= 100 ? ' meta-item__progress-fill--done' : ''}`}
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button type="button" className="cdp-nav-btn" onClick={this.irParaMetas}>
          Gerir Metas →
        </button>
      </>
    );
  }

  render() {
    const { cliente, modo, onFechar } = this.props;
    const { loading, erro, abaAtiva, planos, sessoes, avaliacoes, metas } = this.state;

    const nome = cliente.displayName || cliente.username || 'Sem nome';
    const iniciais = nome.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');

    // Eyebrow label consoante o modo
    const eyebrowLabel = modo === 'admin' ? 'Admin' : modo === 'treinador' ? 'Treinador' : 'Cliente';

    // Derivar treinador a partir dos planos profissionais carregados
    const planoComTreinador = planos.find((p) => p.tipo === 'profissional' && p.treinador);
    const treinadorObj      = planoComTreinador?.treinador ?? null;
    const temTreinador      = !!treinadorObj;
    const nomeTreinador     = treinadorObj
      ? (treinadorObj.displayName || treinadorObj.username)
      : null;

    return (
      <div className="cdp-overlay" onClick={onFechar}>
        <div className="cdp-panel" onClick={(e) => e.stopPropagation()}>
          {/* Cabeçalho */}
          <div className="cdp-header">
            <div className="cdp-header__info">
              <div className="cdp-avatar">
                {cliente.avatarUrl
                  ? <img src={cliente.avatarUrl} alt="avatar" className="cdp-avatar__img" referrerPolicy="no-referrer" />
                  : <span className="cdp-avatar__initials">{iniciais}</span>}
              </div>
              <div>
                <p className="cdp-header__eyebrow">{eyebrowLabel}</p>
                <h2 className="cdp-header__nome">{nome}</h2>
                {cliente.email && <p className="cdp-header__email">{cliente.email}</p>}
                {/* Mostrar badge de treinador só para clientes */}
                {modo === 'cliente' && (temTreinador ? (
                  <span className="pg-badge" style={{ marginTop: '6px', display: 'inline-block', color: 'var(--text-sub)', borderColor: 'var(--border)' }}>
                    {nomeTreinador}
                  </span>
                ) : (
                  <span className="pg-badge cc-badge--no-trainer" style={{ marginTop: '6px', display: 'inline-block' }}>
                    Sem Treinador
                  </span>
                ))}
              </div>
            </div>
            <button type="button" className="cdp-close" onClick={onFechar}>✕</button>
          </div>

          {/* Modo admin: só perfil, sem abas de recursos */}
          {modo === 'admin' ? (
            <div className="cdp-body">
              <p className="cdp-empty" style={{ color: 'var(--text-muted)' }}>
                Conta de administrador - sem recursos associados.
              </p>
            </div>
          ) : (
            <>
              {/* Abas */}
              <div className="cdp-tabs">
                {[
                  { id: 'planos',     label: `Planos (${planos.length})`          },
                  { id: 'sessoes',    label: `Sessões (${sessoes.length})`         },
                  { id: 'avaliacoes', label: `Avaliações (${avaliacoes.length})`   },
                  { id: 'metas',      label: `Metas (${metas.length})`             },
                ].map((aba) => (
                  <button
                    key={aba.id}
                    type="button"
                    className={`cdp-tab${abaAtiva === aba.id ? ' cdp-tab--active' : ''}`}
                    onClick={() => this.mudarAba(aba.id)}
                  >
                    {aba.label}
                  </button>
                ))}
              </div>

              {/* Conteúdo */}
              <div className="cdp-body">
                {loading && <LoadingSpinner />}
                {!loading && erro && <p className="cdp-empty" style={{ color: 'var(--error-text)' }}>{erro}</p>}
                {!loading && !erro && (
                  <>
                    {abaAtiva === 'planos'     && this.renderPlanos()}
                    {abaAtiva === 'sessoes'    && this.renderSessoes()}
                    {abaAtiva === 'avaliacoes' && this.renderAvaliacoes()}
                    {abaAtiva === 'metas'      && this.renderMetas()}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}

ClienteDetailPanel.propTypes = {
  cliente: PropTypes.shape({
    id:          PropTypes.number.isRequired,
    username:    PropTypes.string,
    displayName: PropTypes.string,
    email:       PropTypes.string,
    avatarUrl:   PropTypes.string,
  }).isRequired,
  modo:         PropTypes.oneOf(['cliente', 'treinador', 'admin']),
  temTreinador: PropTypes.bool,
  onFechar:     PropTypes.func.isRequired,
  onNavegar:    PropTypes.func,  // (tab, userId, modo) => void
};

ClienteDetailPanel.defaultProps = {
  modo:         'cliente',
  temTreinador: false,
  onNavegar:    null,
};

export default ClienteDetailPanel;
