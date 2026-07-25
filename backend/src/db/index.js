const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbClient = null;
let isPGlite = false;

/**
 * Initializes the database connection.
 * Attempts to connect to PostgreSQL via DATABASE_URL if provided,
 * otherwise falls back to embedded PGlite in-memory PostgreSQL engine.
 */
async function initDB() {
  if (dbClient) return dbClient;

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && dbUrl.trim() !== '') {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
      });
      await pool.query('SELECT 1;');
      console.log('✅ Connected to live PostgreSQL database.');
      dbClient = {
        query: async (text, params) => pool.query(text, params),
        getClient: async () => pool.connect(),
        isPGlite: false
      };
      isPGlite = false;

      // Ensure schema exists and seed if empty
      try {
        const checkTable = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');");
        if (!checkTable.rows[0].exists) {
          console.log('⚡ Initializing schema on live PostgreSQL...');
          const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
          await pool.query(schemaSql);
        }
        const checkUsers = await pool.query('SELECT COUNT(*) as count FROM users;');
        if (parseInt(checkUsers.rows[0].count, 10) === 0) {
          console.log('🌱 Seeding live PostgreSQL with B2B marketplace dataset...');
          const seeder = require('./seeder');
          await seeder.seed(dbClient);
          console.log('✅ Seeding completed.');
        }
      } catch (seedErr) {
        console.warn('⚠️ Auto-seed check warning:', seedErr.message);
      }

      return dbClient;
    } catch (err) {
      console.warn('⚠️ Could not connect to DATABASE_URL. Falling back to embedded PGlite engine:', err.message);
    }
  }

  // Fallback to embedded PGlite (In-memory real PostgreSQL Wasm engine)
  console.log('⚡ Initializing embedded PGlite (PostgreSQL v15+ compatible engine)...');
  const { PGlite } = require('@electric-sql/pglite');
  const pglite = new PGlite();
  
  dbClient = {
    query: async (text, params) => {
      // Convert $1, $2 to syntax if needed by pglite, but PGlite natively supports $1, $2 params!
      return pglite.query(text, params);
    },
    exec: async (sql) => pglite.exec(sql),
    isPGlite: true
  };
  isPGlite = true;

  // Run schema DDL
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pglite.exec(schemaSql);
  console.log('✅ Executed schema.sql cleanly in embedded PGlite engine.');

  // Seed data if empty
  const checkUsers = await pglite.query('SELECT COUNT(*) as count FROM users;');
  if (parseInt(checkUsers.rows[0].count, 10) === 0) {
    console.log('🌱 Seeding initial Ethiopian B2B marketplace dataset...');
    const seeder = require('./seeder');
    await seeder.seed(dbClient);
    console.log('✅ Seeding completed.');
  }

  return dbClient;
}

/**
 * Executes a query against the database.
 */
async function query(text, params = []) {
  const db = await initDB();
  return db.query(text, params);
}

/**
 * Transaction wrapper enforcing Section 7 Best Practices.
 * Wraps critical checkout / concurrency lock operations in explicit BEGIN/COMMIT blocks.
 */
async function withTransaction(callback) {
  const db = await initDB();
  
  if (db.isPGlite) {
    await db.query('BEGIN;');
    try {
      const txClient = {
        query: (text, params) => db.query(text, params)
      };
      const result = await callback(txClient);
      await db.query('COMMIT;');
      return result;
    } catch (err) {
      await db.query('ROLLBACK;');
      throw err;
    }
  } else {
    const client = await db.getClient();
    try {
      await client.query('BEGIN;');
      const result = await callback(client);
      await client.query('COMMIT;');
      return result;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  initDB,
  query,
  withTransaction
};
