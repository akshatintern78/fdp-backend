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
    await queryInterface.createTable(
      { schema, tableName: 'admins' },
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(80), allowNull: false },
        email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        password_hash: { type: Sequelize.STRING(100), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      },
    );
  },

  async down(queryInterface) {
    const schema = schemaName();
    await queryInterface.dropTable({ schema, tableName: 'admins' });
  },
};
