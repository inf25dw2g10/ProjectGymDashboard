import React from 'react';
import PropTypes from 'prop-types';

import { labelGrupoMuscular } from '../../constants/filters';
import ListItemActions from '../common/ListItemActions';

/**
 * ExercicioItem
 * Componente Stateless - apresenta um exercício em forma de linha/card.
 * Usa `numero` (índice sequencial passado pelo pai) em vez do ID da BD.
 */
const ExercicioItem = ({ exercicio, numero, onEditar, onApagar }) => {
  const grupo = labelGrupoMuscular(exercicio.grupoMuscular);
  const ordemDisplay = numero != null ? numero : exercicio.ordem;

  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div>
          <h3 className="pg-card__title">
            {ordemDisplay != null && (
              <span className="pg-badge pg-badge--ordem">#{ordemDisplay}</span>
            )}
            {' '}{exercicio.nome}
          </h3>
          <div className="pg-stats">
            <span className="pg-badge">{grupo}</span>
            {exercicio.series != null && (
              <span className="pg-badge">{exercicio.series} séries</span>
            )}
            {exercicio.reps != null && (
              <span className="pg-badge">× {exercicio.reps} reps</span>
            )}
            {exercicio.pesoKg != null && (
              <span className="pg-badge">{exercicio.pesoKg} kg</span>
            )}
          </div>
          {exercicio.notas && (
            <p className="pg-card__sub">{exercicio.notas}</p>
          )}
        </div>

        <ListItemActions
          onEditar={onEditar ? () => onEditar(exercicio) : null}
          onApagar={onApagar ? () => onApagar(exercicio.id) : null}
        />
      </div>
    </div>
  );
};

ExercicioItem.propTypes = {
  exercicio: PropTypes.shape({
    id:            PropTypes.number.isRequired,
    nome:          PropTypes.string.isRequired,
    grupoMuscular: PropTypes.string,
    series:        PropTypes.number,
    reps:          PropTypes.number,
    pesoKg:        PropTypes.number,
    ordem:         PropTypes.number,
    notas:         PropTypes.string,
  }).isRequired,
  numero:   PropTypes.number,
  onEditar: PropTypes.func,
  onApagar: PropTypes.func,
};

ExercicioItem.defaultProps = {
  numero:   null,
  onEditar: null,
  onApagar: null,
};

export default ExercicioItem;
