require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'memory';

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl,
  useMemory: databaseUrl === 'memory',
};
