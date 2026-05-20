const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const adapter = new PrismaBetterSqlite3({ url: "file:./smartbudget.db" });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
