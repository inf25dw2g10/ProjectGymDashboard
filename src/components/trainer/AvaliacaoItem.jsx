import React from 'react';
import PropTypes from 'prop-types';
import { formatDateLongPt } from '../../utils/formatDate';
import { encontrarUtilizador, nomeUtilizador } from '../../utils/userDisplay';
import ListItemActions from '../common/ListItemActions';

/**
 * AvaliacaoItem
 * Componente Stateless - apresenta uma avaliação física em forma de card.
 *
 * isAdmin=true  → sempre mostra botões Editar/Apagar (admin pode tudo)
 * isAdmin=false → só mostra botões se tipo !== 'pessoal' (regra do treinador)
 */
const AvaliacaoItem = ({ avaliacao, clientes, onEditar, onApagar, isAdmin }) => {
  const clienteObj = encontrarUtilizador(clientes, avaliacao.clienteId);
  const clienteNome = nomeUtilizador(avaliacao.cliente || clienteObj, avaliacao.clienteId);
  const treinadorNome = avaliacao.treinador
    ? nomeUtilizador(avaliacao.treinador)
    : null;

  const dataFormatada = formatDateLongPt(avaliacao.data);

  const imcNum = avaliacao.imc != null ? Number(avaliacao.imc) : null;
  let imcDisplay = imcNum != null && !Number.isNaN(imcNum) ? imcNum.toFixed(1) : null;
  if (!imcDisplay && avaliacao.pesoKg && avaliacao.alturaCm) {
    const alturaM = Number(avaliacao.alturaCm) / 100;
    if (alturaM > 0) {
      imcDisplay = (Number(avaliacao.pesoKg) / (alturaM * alturaM)).toFixed(1);
    }
  }

  const podeEditar = isAdmin || avaliacao.tipo !== 'pessoal';

  const tipoBadgeClass = avaliacao.tipo === 'profissional'
    ? 'pg-badge pg-badge--ok'
    : 'pg-badge';
  const tipoLabel = avaliacao.tipo === 'profissional' ? 'Profissional' : 'Pessoal';

  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div>
          <h3 className="pg-card__title">{clienteNome}</h3>
          <p className="pg-card__sub">{dataFormatada}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem', alignItems: 'center' }}>
            {avaliacao.tipo && (
              <span className={tipoBadgeClass} style={{ fontSize: '0.7rem' }}>
                {tipoLabel}
              </span>
            )}
            {treinadorNome && (
              <span className="pg-card__sub" style={{ fontSize: '0.75rem', margin: 0 }}>
                Treinador: <strong>{treinadorNome}</strong>
              </span>
            )}
          </div>
        </div>
        {podeEditar && (
          <ListItemActions
            onEditar={() => onEditar(avaliacao)}
            onApagar={() => onApagar(avaliacao.id)}
          />
        )}
      </div>

      <div className="pg-stats">
        {avaliacao.pesoKg != null && (
          <div className="pg-stat">
            <span className="pg-stat__label">Peso</span>
            <span className="pg-stat__value">{avaliacao.pesoKg} kg</span>
          </div>
        )}
        {avaliacao.alturaCm != null && (
          <div className="pg-stat">
            <span className="pg-stat__label">Altura</span>
            <span className="pg-stat__value">{avaliacao.alturaCm} cm</span>
          </div>
        )}
        {imcDisplay && (
          <div className="pg-stat">
            <span className="pg-stat__label">IMC</span>
            <span className="pg-stat__value">{imcDisplay}</span>
          </div>
        )}
        {avaliacao.percGordura != null && (
          <div className="pg-stat">
            <span className="pg-stat__label">Gordura</span>
            <span className="pg-stat__value">{avaliacao.percGordura}%</span>
          </div>
        )}
      </div>

      {avaliacao.notas && (
        <p className="pg-notes">{avaliacao.notas}</p>
      )}
    </div>
  );
};

AvaliacaoItem.propTypes = {
  avaliacao: PropTypes.shape({
    id:          PropTypes.number.isRequired,
    clienteId:   PropTypes.number,
    tipo:        PropTypes.string,
    data:        PropTypes.string,
    pesoKg:      PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    alturaCm:    PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    percGordura: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    imc:         PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    notas:       PropTypes.string,
    cliente:     PropTypes.shape({ displayName: PropTypes.string, username: PropTypes.string }),
    treinador:   PropTypes.shape({ displayName: PropTypes.string, username: PropTypes.string }),
  }).isRequired,
  clientes: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.number, displayName: PropTypes.string, username: PropTypes.string })
  ).isRequired,
  onEditar:  PropTypes.func.isRequired,
  onApagar:  PropTypes.func.isRequired,
  isAdmin:   PropTypes.bool,
};

AvaliacaoItem.defaultProps = {
  isAdmin: false,
};

export default AvaliacaoItem;
