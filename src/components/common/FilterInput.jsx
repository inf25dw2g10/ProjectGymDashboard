import React from 'react';
import PropTypes from 'prop-types';

/**
 * FilterInput - campo de pesquisa para barras de filtro.
 */
const FilterInput = ({ value, onChange, placeholder, className, ...rest }) => (
  <input
    type="text"
    className={`pg-filter-input${className ? ` ${className}` : ''}`}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    {...rest}
  />
);

FilterInput.propTypes = {
  value:       PropTypes.string.isRequired,
  onChange:    PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className:   PropTypes.string,
};

FilterInput.defaultProps = {
  placeholder: '',
  className:   '',
};

export default FilterInput;
