/**
 * migrate-neon.mjs
 * Connects directly to Neon and applies all schema migrations.
 * Run with: node scripts/migrate-neon.mjs
 */
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_SwpcZsGgx6K1@ep-odd-hall-a5tabuwm-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
  max: 2,
});

async function run(label, sql, params = []) {
  try {
    const res = await pool.query(sql, params);
    console.log(`  OK ${label}`);
    return res;
  } catch (err) {
    console.error(`  FAIL ${label} -- ${err.message}`);
    throw err;
  }
}

async function migrate() {
  console.log('\nConnecting to Neon...\n');

  // 1. Create attendees table
  await run('Create attendees table', `
    CREATE TABLE IF NOT EXISTS attendees (
      id              SERIAL PRIMARY KEY,
      qr_id           VARCHAR(50) UNIQUE NOT NULL,
      name            VARCHAR(255) NOT NULL,
      email           VARCHAR(255),
      company         VARCHAR(255),
      ticket_type     VARCHAR(50) DEFAULT 'General',
      checked_in_at   TIMESTAMPTZ,
      badge_printed   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 2. Create organizers table
  await run('Create organizers table', `
    CREATE TABLE IF NOT EXISTS organizers (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(100) UNIQUE NOT NULL,
      display_name  VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 3. Add badge_printed column if it does not exist (safe migration for existing DBs)
  await run('Add badge_printed column (if missing)', `
    ALTER TABLE attendees
    ADD COLUMN IF NOT EXISTS badge_printed BOOLEAN NOT NULL DEFAULT FALSE
  `);

  // 4. Indexes
  await run('Index on qr_id', `
    CREATE INDEX IF NOT EXISTS idx_attendees_qr_id ON attendees(qr_id)
  `);
  await run('Index on badge_printed', `
    CREATE INDEX IF NOT EXISTS idx_attendees_badge_printed ON attendees(badge_printed)
  `);

  // 5. Verify schema
  const schema = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'attendees'
    ORDER BY ordinal_position
  `);

  console.log('\nCurrent attendees schema:');
  schema.rows.forEach(r => {
    console.log('  ' + r.column_name.padEnd(22) + r.data_type.padEnd(22) + 'nullable=' + r.is_nullable);
  });

  // 6. Row counts
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM attendees)  AS attendees,
      (SELECT COUNT(*) FROM organizers) AS organizers
  `);
  console.log('\nRow counts: attendees=' + counts.rows[0].attendees + ', organizers=' + counts.rows[0].organizers);
  console.log('\nMigration complete!\n');
  await pool.end();
}

migrate().catch(err => {
  console.error('\nMigration failed:', err.message);
  pool.end();
  process.exit(1);
});
