import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.local')) {
  console.error('Found .env.local');
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
      process.env[k] = envConfig[k];
  }
} else {
  console.error('.env.local NOT found');
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
  
  if (!url) {
      console.error('DATABASE_URL is missing');
      return;
  }

  console.error('Connecting to:', url.split('@').pop());
  const client = createClient({ url, authToken });

  try {
    const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.error('Tables found:', rs.rows.map(r => r.name));
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    client.close();
  }
}

main();
