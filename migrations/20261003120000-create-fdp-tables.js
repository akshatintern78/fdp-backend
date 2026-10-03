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
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    await queryInterface.createTable(
      { schema, tableName: 'users' },
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(80), allowNull: false },
        email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        password_hash: { type: Sequelize.STRING(100), allowNull: false },
        mobile: { type: Sequelize.STRING(15), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      },
    );

    await queryInterface.createTable(
      { schema, tableName: 'receipts' },
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'users', schema }, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        serial_no: { type: Sequelize.INTEGER, allowNull: false, unique: true },
        receipt_date: { type: Sequelize.DATEONLY, allowNull: false },
        full_name: { type: Sequelize.STRING(80), allowNull: false },
        address: { type: Sequelize.TEXT, allowNull: false },
        mobile: { type: Sequelize.STRING(15), allowNull: false },
        amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        amount_in_words: { type: Sequelize.STRING(180), allowNull: false },
        payment_ref: { type: Sequelize.STRING(60), allowNull: false },
        signature_file: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      },
    );

    await queryInterface.addIndex({ schema, tableName: 'receipts' }, ['user_id']);
  },

  async down(queryInterface) {
    const schema = schemaName();
    await queryInterface.dropTable({ schema, tableName: 'receipts' });
    await queryInterface.dropTable({ schema, tableName: 'users' });
  },
};
