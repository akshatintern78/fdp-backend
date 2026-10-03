const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

const signatureDir = path.join(__dirname, '..', 'data', 'signatures');
fs.mkdirSync(signatureDir, { recursive: true });

function all(sql, replacements = [], transaction) {
  return sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });
}

async function one(sql, replacements = [], transaction) {
  const rows = await all(sql, replacements, transaction);
  return rows[0] || null;
}

module.exports = { sequelize, signatureDir, all, one };
