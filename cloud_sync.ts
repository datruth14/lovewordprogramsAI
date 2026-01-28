import { createClient } from '@libsql/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load variables
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
    console.log('🏗 Generating SQL from Prisma schema...');
    // We force DATABASE_URL to a file: protocol for the CLI diffing part to avoid the P1013 error
    // The CLI just needs to see a file: protocol to match the "sqlite" provider during this offline step.
    const sql = execSync('DATABASE_URL=file:./dev.db npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script').toString();

    console.log('🚀 Pushing schema to Cloud...');

    // LibSQL batch execution
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await client.execute(statement);
    }

    console.log('✅ Success! Your cloud database is now in sync.');
  } catch (e: any) {
    console.error('❌ Sync Failed:', e.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
