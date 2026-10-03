const { Sequelize } = require('sequelize');
const config = require('./config');

const selected = config._selected;

const sequelize = new Sequelize(selected.database, selected.username, selected.password, {
  host: selected.host,
  port: selected.port,
  dialect: 'postgres',
  logging: false,
  define: selected.define,
  searchPath: selected.searchPath,
});

module.exports = sequelize;
