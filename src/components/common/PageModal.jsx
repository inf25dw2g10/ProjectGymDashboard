import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageModal - overlay + modal com cabeçalho reutilizável.
 */
const PageModal = ({ open, onClose, eyebrow, title, loading, children }) => {
  if (!open) return null;

  return (
    <div className="pg-overlay" onClick={onClose}>
      <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal__header">
          <div>
            {eyebrow && <p className="pg-modal__eyebrow">{eyebrow}</p>}
            <h3 className="pg-modal__title">{title}</h3>
          </div>
          <button
            type="button"
            className="pg-modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

PageModal.propTypes = {
  open:     PropTypes.bool.isRequired,
  onClose:  PropTypes.func.isRequired,
  eyebrow:  PropTypes.string,
  title:    PropTypes.string.isRequired,
  loading:  PropTypes.bool,
  children: PropTypes.node,
};

PageModal.defaultProps = {
  eyebrow:  null,
  loading:  false,
  children: null,
};

export default PageModal;
