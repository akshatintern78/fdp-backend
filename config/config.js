require('dotenv').config();

const suffixFor = (env) => (env === 'production' ? 'PROD' : env === 'test' ? 'TEST' : 'DEV');

const build = (env) => {
  const suffix = suffixFor(env);
  const schema = process.env[`DB_SCHEMA_${suffix}`] || process.env.DB_SCHEMA || 'fdp_schema';
  return {
    username: process.env[`DB_USER_${suffix}`] || process.env.DB_USER || 'fdp_user',
    password: process.env[`DB_PASSWORD_${suffix}`] || process.env.DB_PASSWORD || 'fdp_user@2026',
    database: process.env[`DB_NAME_${suffix}`] || process.env.DB_NAME || 'fdp_db',
    host: process.env[`DB_HOST_${suffix}`] || process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env[`DB_PORT_${suffix}`] || process.env.DB_PORT || 5432, 10),
    dialect: 'postgres',
    logging: false,
    define: { schema },
    migrationStorageTableSchema: schema,
    searchPath: schema,
  };
};

const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();

module.exports = {
  development: build('development'),
  test: build('test'),
  production: build('production'),
  _selected: build(appEnv === 'production' ? 'production' : appEnv === 'test' ? 'test' : 'development'),
};
