import React from 'react';
import PropTypes from 'prop-types';

/**
 * ActiveFiltersBar
 * Mostra uma linha de tags para cada filtro ativo.
 * Aparece automaticamente quando pelo menos um filtro tem valor.
 *
 * Uso:
 *   <ActiveFiltersBar
 *     filters={[
 *       { label: 'Cliente', value: nomeCliente, onClear: () => setState({ filtroCliente: '' }) },
 *       { label: 'Estado',  value: filtroEstado, onClear: () => setState({ filtroEstado: '' }) },
 *     ]}
 *   />
 *
 * Só renderiza os filtros que têm `value` não vazio.
 */
const ActiveFiltersBar = ({ filters }) => {
  const ativos = filters.filter((f) => f.value);
  if (ativos.length === 0) return null;

  return (
    <div className="af-bar">
      <span className="af-bar__label">Filtros ativos:</span>
      {ativos.map((f) => (
        <span key={f.label} className="af-tag">
          <span className="af-tag__name">{f.label}:</span>
          <span className="af-tag__value">{f.value}</span>
          <button
            type="button"
            className="af-tag__clear"
            onClick={f.onClear}
            aria-label={`Limpar filtro ${f.label}`}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        className="af-bar__clear-all"
        onClick={() => ativos.forEach((f) => f.onClear())}
      >
        Limpar filtros
      </button>
    </div>
  );
};

ActiveFiltersBar.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      label:   PropTypes.string.isRequired,
      value:   PropTypes.string,   // vazio/undefined = inativo
      onClear: PropTypes.func.isRequired,
    })
  ).isRequired,
};

export default ActiveFiltersBar;
