'use strict';

/**
 * Migration: adiciona ON DELETE CASCADE na FK plano_id da tabela sessoes,
 * e ON DELETE SET NULL na FK plano_id da tabela metas.
 *
 * Necessário porque a migration original não definiu estes comportamentos.
 * Executa com: npx sequelize-cli db:migrate
 */
module.exports = {
  async up(queryInterface) {
    // Descobre o nome atual da FK constraint em sessoes.plano_id
    const [sessoesConstraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'sessoes'
        AND COLUMN_NAME  = 'plano_id'
        AND REFERENCED_TABLE_NAME = 'planos_treino'
    `);

    for (const row of sessoesConstraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE sessoes DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
      );
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE sessoes
        ADD CONSTRAINT fk_sessoes_plano_id
        FOREIGN KEY (plano_id)
        REFERENCES planos_treino(id)
        ON DELETE CASCADE
    `);

    // Descobre o nome atual da FK constraint em metas.plano_id
    const [metasConstraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'metas'
        AND COLUMN_NAME  = 'plano_id'
        AND REFERENCED_TABLE_NAME = 'planos_treino'
    `);

    for (const row of metasConstraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE metas DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
      );
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE metas
        ADD CONSTRAINT fk_metas_plano_id
        FOREIGN KEY (plano_id)
        REFERENCES planos_treino(id)
        ON DELETE SET NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE sessoes DROP FOREIGN KEY fk_sessoes_plano_id'
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE sessoes
        ADD CONSTRAINT fk_sessoes_plano_id_orig
        FOREIGN KEY (plano_id) REFERENCES planos_treino(id)
    `);

    await queryInterface.sequelize.query(
      'ALTER TABLE metas DROP FOREIGN KEY fk_metas_plano_id'
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE metas
        ADD CONSTRAINT fk_metas_plano_id_orig
        FOREIGN KEY (plano_id) REFERENCES planos_treino(id)
    `);
  }
};
