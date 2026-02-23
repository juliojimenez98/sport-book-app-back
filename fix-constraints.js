#!/usr/bin/env node
// Script to add missing FK constraints so Sequelize alter can DROP & recreate them
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'booking_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const constraints = [
  {
    table: 'branch_sport',
    constraint: 'branch_sport_branch_id_fkey',
    sql: 'ALTER TABLE branch_sport ADD CONSTRAINT branch_sport_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE ON UPDATE CASCADE',
  },
  {
    table: 'branch_sport',
    constraint: 'branch_sport_sport_id_fkey',
    sql: 'ALTER TABLE branch_sport ADD CONSTRAINT branch_sport_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE ON UPDATE CASCADE',
  },
];

async function run() {
  await client.connect();
  console.log('Connected to database');

  for (const { table, constraint, sql } of constraints) {
    const check = await client.query(
      `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name=$1 AND table_name=$2`,
      [constraint, table]
    );
    if (check.rowCount === 0) {
      console.log(`Adding missing constraint: ${constraint}`);
      await client.query(sql);
      console.log(`  ✅ ${constraint} added`);
    } else {
      console.log(`  ✓  ${constraint} already exists`);
    }
  }

  await client.end();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
