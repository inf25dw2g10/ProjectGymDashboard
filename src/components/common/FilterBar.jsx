import React from 'react';
import PropTypes from 'prop-types';

/**
 * FilterBar - container flex para filtros (mesmo layout/tamanho do admin).
 */
const FilterBar = ({ children, className }) => (
  <div className={`pg-filter-bar${className ? ` ${className}` : ''}`}>
    {children}
  </div>
);

FilterBar.propTypes = {
  children:  PropTypes.node,
  className: PropTypes.string,
};

FilterBar.defaultProps = {
  children:  null,
  className: '',
};

export default FilterBar;
