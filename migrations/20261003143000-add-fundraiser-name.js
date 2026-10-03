'use strict';

require('dotenv').config();

function schemaName() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  const suffix = env === 'production' ? 'PROD' : env === 'test' ? 'TEST' : 'DEV';
  return process.env[`DB_SCHEMA_${suffix}`] || process.env.DB_SCHEMA || 'fdp_schema';
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = schemaName();
    await queryInterface.addColumn({ schema, tableName: 'receipts' }, 'fundraiser_name', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const schema = schemaName();
    await queryInterface.removeColumn({ schema, tableName: 'receipts' }, 'fundraiser_name');
  },
};
