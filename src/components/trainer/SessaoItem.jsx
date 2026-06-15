import React from 'react';
import PropTypes from 'prop-types';
import { badgeClassEstadoSessao, labelEstadoSessao } from '../../constants/filters';
import { formatDateShortPt } from '../../utils/formatDate';
import { nomeUtilizador } from '../../utils/userDisplay';
import ListItemActions from '../common/ListItemActions';

/**
 * SessaoItem
 * Componente Stateless - apresenta uma sessão de treino em forma de linha.
 */
const SessaoItem = ({ sessao, onEditar, onApagar }) => {
  const badgeClass = badgeClassEstadoSessao(sessao.estado);
  const treinadorNome = sessao.treinador
    ? nomeUtilizador(sessao.treinador)
    : null;
  const dataRaw = sessao.dataSessao || sessao.data;
  const dataFormatada = formatDateShortPt(dataRaw);
  const clienteNome = nomeUtilizador(sessao.cliente, sessao.clienteId);
  const planoTitulo = sessao.plano ? sessao.plano.titulo : nomeUtilizador(null, sessao.planoId);
  const duracao = sessao.duracaoMin != null ? sessao.duracaoMin : sessao.duracao;

  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="sessao-item__info">
          <h3 className="pg-card__title">{dataFormatada}</h3>
          <p className="pg-card__sub sessao-item__sub">
            {clienteNome} · {planoTitulo}
            {duracao ? ` · ${duracao} min` : ''}
          </p>
          {treinadorNome && (
            <p className="pg-card__sub" style={{ fontSize: '0.75rem', margin: '0.15rem 0 0' }}>
              Treinador: <strong>{treinadorNome}</strong>
            </p>
          )}
          {sessao.notas && (
            <p className="pg-notes sessao-item__notes">{sessao.notas}</p>
          )}
        </div>

        <div className="pg-card__actions sessao-item__actions">
          <span className={badgeClass}>
            {labelEstadoSessao(sessao.estado)}
          </span>
          <ListItemActions
            inline
            onEditar={onEditar ? () => onEditar(sessao) : null}
            onApagar={onApagar ? () => onApagar(sessao.id) : null}
          />
        </div>
      </div>
    </div>
  );
};

SessaoItem.propTypes = {
  sessao: PropTypes.shape({
    id:          PropTypes.number.isRequired,
    dataSessao:  PropTypes.string,
    data:        PropTypes.string,
    duracaoMin:  PropTypes.number,
    duracao:     PropTypes.number,
    estado:      PropTypes.string,
    notas:       PropTypes.string,
    clienteId:   PropTypes.number,
    planoId:     PropTypes.number,
    cliente:     PropTypes.shape({ displayName: PropTypes.string, username: PropTypes.string }),
    treinador:   PropTypes.shape({ displayName: PropTypes.string, username: PropTypes.string }),
    plano:       PropTypes.shape({ titulo: PropTypes.string }),
  }).isRequired,
  onEditar: PropTypes.func,
  onApagar: PropTypes.func,
};

SessaoItem.defaultProps = {
  onEditar: null,
  onApagar: null,
};

export default SessaoItem;
