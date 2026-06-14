import React from 'react';
import PropTypes from 'prop-types';

/**
 * FormFooter - botões Cancelar / Guardar dentro de modais CRUD.
 */
const FormFooter = ({
  onCancel,
  loading,
  cancelLabel,
  submitLabel,
  loadingLabel,
}) => (
  <div className="pg-form__footer">
    <button
      type="button"
      className="pg-btn pg-btn--ghost"
      onClick={onCancel}
      disabled={loading}
    >
      {cancelLabel}
    </button>
    <button type="submit" className="pg-btn pg-btn--primary" disabled={loading}>
      {loading ? loadingLabel : submitLabel}
    </button>
  </div>
);

FormFooter.propTypes = {
  onCancel:     PropTypes.func.isRequired,
  loading:      PropTypes.bool,
  cancelLabel:  PropTypes.string,
  submitLabel:  PropTypes.string,
  loadingLabel: PropTypes.string,
};

FormFooter.defaultProps = {
  loading:      false,
  cancelLabel:  'Cancelar',
  submitLabel:  'Guardar',
  loadingLabel: 'A guardar...',
};

export default FormFooter;
