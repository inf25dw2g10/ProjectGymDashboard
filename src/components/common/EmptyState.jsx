import React from 'react';
import PropTypes from 'prop-types';

/**
 * EmptyState - mensagem quando não há dados ou filtros sem resultados.
 */
const EmptyState = ({ title, text, children }) => (
  <div className="pg-empty">
    {title && <p className="pg-empty__title">{title}</p>}
    {text && <p className="pg-empty__text">{text}</p>}
    {children}
  </div>
);

EmptyState.propTypes = {
  title:    PropTypes.string,
  text:     PropTypes.string,
  children: PropTypes.node,
};

EmptyState.defaultProps = {
  title:    null,
  text:     null,
  children: null,
};

export default EmptyState;
