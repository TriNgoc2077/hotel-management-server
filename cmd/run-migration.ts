import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  dotenv.config();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const migration_name = '';
  try {
    const migrationPath = path.join(
      __dirname,
      'src',
      'database',
      'db',
      'migrations',
      migration_name,
    );
    console.log(`Reading migration from: ${migrationPath}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await connection.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.stack || error.message);
  } finally {
    await connection.end();
  }
}

run();
