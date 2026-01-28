import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  console.log('Loading from .env.local...');
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  if (!url || !url.startsWith('libsql')) {
    console.error('❌ Error: No remote LibSQL URL found in environment.');
    process.exit(1);
  }

  console.log('📡 Connecting to:', url.split('@').pop());
  const client = createClient({ url, authToken });

  try {
    console.log('🏗 Generating Migration SQL...');
    const sql = execSync('TURSO_DATABASE_URL= DATABASE_AUTH_TOKEN= DATABASE_URL=file:./dev.db npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script').toString();

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🚀 Pushing ${statements.length} statements to Cloud...`);

    for (let statement of statements) {
      // Remove comments
      statement = statement.replace(/^--.*$/gm, '').trim();
      if (!statement) continue;

      // Handle "table already exists" by adding IF NOT EXISTS if it's a CREATE TABLE
      if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          statement = statement.replace(/CREATE TABLE/i, 'CREATE TABLE IF NOT EXISTS');
      }
      
      // Handle "index already exists" by adding IF NOT EXISTS
      if (statement.toUpperCase().startsWith('CREATE UNIQUE INDEX')) {
          statement = statement.replace(/CREATE UNIQUE INDEX/i, 'CREATE UNIQUE INDEX IF NOT EXISTS');
      }

      try {
        await client.execute(statement);
      } catch (err: any) {
        if (err.message.includes('already exists')) {
            console.log('⏩ Skipping (already exists):', statement.substring(0, 30) + '...');
        } else {
            throw err;
        }
      }
    }

    const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tables = rs.rows.map(r => r.name).filter(n => !n.startsWith('sqlite_') && n !== '_prisma_migrations');
    console.log('✅ Success! Current Cloud Tables:', tables.join(', '));
    
  } catch (e: any) {
    console.error('❌ Sync Failed:', e.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
