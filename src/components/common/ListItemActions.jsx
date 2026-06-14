import React from 'react';
import PropTypes from 'prop-types';

/**
 * ListItemActions - botões Editar / Apagar reutilizáveis nos *Item.
 */
const ListItemActions = ({ onEditar, onApagar, editLabel, deleteLabel, inline }) => {
  if (!onEditar && !onApagar) return null;

  const buttons = (
    <>
      {onEditar && (
        <button
          type="button"
          className="pg-btn pg-btn--ghost pg-btn--sm"
          onClick={onEditar}
        >
          {editLabel}
        </button>
      )}
      {onApagar && (
        <button
          type="button"
          className="pg-btn pg-btn--danger pg-btn--sm"
          onClick={onApagar}
        >
          {deleteLabel}
        </button>
      )}
    </>
  );

  if (inline) return buttons;

  return <div className="pg-card__actions">{buttons}</div>;
};

ListItemActions.propTypes = {
  onEditar:    PropTypes.func,
  onApagar:    PropTypes.func,
  editLabel:   PropTypes.string,
  deleteLabel: PropTypes.string,
  inline:      PropTypes.bool,
};

ListItemActions.defaultProps = {
  onEditar:    null,
  onApagar:    null,
  editLabel:   'Editar',
  deleteLabel: 'Apagar',
  inline:      false,
};

export default ListItemActions;
