import React from 'react';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';

/**
 * OAuthCallbackPage
 * Class Component - página de retorno após autenticação OAuth (GitHub / Google).
 */
class OAuthCallbackPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pronto: false,
      erro:   null,
      role:   null,
    };
  }

  componentDidMount() {
    this.processarCallback();
  }

  processarCallback() {
    const params = new URLSearchParams(this.props.location.search);

    const apiKey = params.get('apiKey');
    const role   = params.get('role');
    const userId = params.get('userId');

    if (!apiKey || !role) {
      this.setState({
        erro: 'Autenticação OAuth falhou: parâmetros em falta na resposta do servidor.',
      });
      return;
    }

    localStorage.setItem('gymApiKey', apiKey);
    localStorage.setItem('gymUserRole', role);
    if (userId) {
      localStorage.setItem('gymUserId', userId);
    }

    this.setState({ pronto: true, role });
  }

  render() {
    const { pronto, erro, role } = this.state;

    if (pronto) {
      if (role === 'admin')     return <Redirect to="/admin" />;
      if (role === 'treinador') return <Redirect to="/trainer" />;
      return <Redirect to="/client" />;
    }

    if (erro) {
      return (
        <div className="misc-page">
          <div className="misc-card">
            <p className="misc-card__eyebrow">OAuth</p>
            <h2 className="misc-card__title">Erro</h2>
            <p className="misc-card__text">{erro}</p>
            <a href="/login" className="misc-card__link misc-card__link--ghost">
              Voltar ao login
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="misc-page">
        <div className="misc-card">
          <p className="misc-card__eyebrow">OAuth</p>
          <h2 className="misc-card__title">A processar</h2>
          <p className="misc-card__text">Aguarda um momento.</p>
        </div>
      </div>
    );
  }
}

OAuthCallbackPage.propTypes = {
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }).isRequired,
};

export default OAuthCallbackPage;
