import React from 'react';
import PropTypes from 'prop-types';

/**
 * FilterSelect - select estilizado para barras de filtro das páginas.
 * O label acima do select foi removido; a primeira <option> serve como placeholder.
 *
 * Props `sort`: alinha à direita (ordenção).
 */
const FilterSelect = ({ label, value, onChange, options, className, sort }) => (
  <select
    value={value}
    onChange={onChange}
    className={`pg-filter-select${value ? ' pg-filter-select--active' : ''}${sort ? ' pg-filter-select--sort' : ''}${className ? ` ${className}` : ''}`}
    aria-label={label || 'Filtro'}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

FilterSelect.propTypes = {
  label:     PropTypes.string,
  value:     PropTypes.string.isRequired,
  onChange:  PropTypes.func.isRequired,
  options:   PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  className: PropTypes.string,
  sort:      PropTypes.bool,
};

FilterSelect.defaultProps = {
  label:     '',
  className: '',
  sort:      false,
};

export default FilterSelect;
