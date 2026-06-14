import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorMessage
 * Componente Stateless de apresentação.
 * RESTYLED: Dark Minimalist
 */
const ErrorMessage = ({ message }) => (
  <div className="error-message">
    <span className="error-message__dot" />
    <span className="error-message__text">{message}</span>
  </div>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

export default ErrorMessage;
