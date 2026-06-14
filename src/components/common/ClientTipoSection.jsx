import React from 'react';
import PropTypes from 'prop-types';

/**
 * ClientTipoSection - secção Profissionais / Pessoais nas páginas do cliente.
 */
const SECTION_META = {
  profissional: { title: 'Profissionais', badge: 'Só leitura', editable: false },
  pessoal:      { title: 'Pessoais',      badge: 'Editável',   editable: true  },
};

const ClientTipoSection = ({ tipo, layout, children }) => {
  const meta = SECTION_META[tipo];
  if (!meta) return null;

  const badgeClass = meta.editable
    ? 'pg-section__badge pg-section__badge--edit'
    : 'pg-section__badge';
  const contentClass = layout === 'grid' ? 'pg-grid' : 'pg-list';

  return (
    <section className="pg-section">
      <div className="pg-section__header">
        <h3 className="pg-section__title">{meta.title}</h3>
        <span className={badgeClass}>{meta.badge}</span>
      </div>
      <div className={contentClass}>{children}</div>
    </section>
  );
};

ClientTipoSection.propTypes = {
  tipo:     PropTypes.oneOf(['profissional', 'pessoal']).isRequired,
  layout:   PropTypes.oneOf(['grid', 'list']),
  children: PropTypes.node,
};

ClientTipoSection.defaultProps = {
  layout:   'list',
  children: null,
};

export default ClientTipoSection;
