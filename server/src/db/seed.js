import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log(`Connecting to MySQL database at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connected to MySQL successfully!');

  // Look for schema.sql or init.sql in src/db
  const schemaPath = path.resolve('src/db/schema.sql');
  const initPath = path.resolve('src/db/init.sql');
  const sqlPath = fs.existsSync(schemaPath) ? schemaPath : initPath;

  console.log(`Executing SQL from ${sqlPath}...`);
  let sql = fs.readFileSync(sqlPath, 'utf8');

  // If using a cloud database (like Aiven/TiDB), strip top-level CREATE DATABASE / USE to avoid permission errors
  if (process.env.DB_NAME) {
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/gi, '')
             .replace(/USE [^;]+;/gi, '');
  }

  await connection.query(sql);

  console.log('✅ All tables and schema initialized successfully on database:', process.env.DB_NAME);
  await connection.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
