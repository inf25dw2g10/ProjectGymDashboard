import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageTopbar - cabeçalho de página com título e acções à direita.
 */
const PageTopbar = ({ title, subtitle, section, actions, children }) => {
  const barClass = section ? 'pg-topbar pg-topbar--section' : 'pg-topbar';
  const titleClass = section ? 'pg-title pg-title--section' : 'pg-title';
  const right = actions || children;

  return (
    <div className={barClass}>
      <div>
        <h2 className={titleClass}>{title}</h2>
        {subtitle && (
          <p className="pg-card__sub" style={{ marginTop: '6px' }}>{subtitle}</p>
        )}
      </div>
      {right && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {right}
        </div>
      )}
    </div>
  );
};

PageTopbar.propTypes = {
  title:    PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  section:  PropTypes.bool,
  actions:  PropTypes.node,
  children: PropTypes.node,
};

PageTopbar.defaultProps = {
  subtitle: null,
  section:  false,
  actions:  null,
  children: null,
};

export default PageTopbar;
