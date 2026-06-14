import React from 'react';

/**
 * LoadingSpinner
 * Componente Stateless de apresentação.
 * RESTYLED: Dark Minimalist
 */
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="loading-spinner__ring" />
    <p className="loading-spinner__text">A carregar</p>
  </div>
);

export default LoadingSpinner;
