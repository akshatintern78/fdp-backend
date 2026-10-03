'use strict';

const bcrypt = require('bcryptjs');
require('dotenv').config();

function schemaName() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  const suffix = env === 'production' ? 'PROD' : env === 'test' ? 'TEST' : 'DEV';
  return process.env[`DB_SCHEMA_${suffix}`] || process.env.DB_SCHEMA || 'fdp_schema';
}

module.exports = {
  async up(queryInterface) {
    const schema = schemaName();
    await queryInterface.bulkInsert({ schema, tableName: 'admins' }, [
      {
        name: 'Chapersons Admin',
        email: 'admin@chapersons.com',
        password_hash: bcrypt.hashSync('admin123', 10),
        created_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    const schema = schemaName();
    await queryInterface.bulkDelete({ schema, tableName: 'admins' }, { email: 'admin@chapersons.com' });
  },
};
