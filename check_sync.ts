import { prisma } from './src/lib/prisma'

async function main() {
  try {
    console.log('--- Database Sync Check ---')
    const users = await prisma.user.count()
    console.log('✅ Connection Successful!')
    console.log('✅ Tables found. User count:', users)
  } catch (e: any) {
    console.error('❌ Sync Error:', e.message)
    if (e.message.includes('no such table')) {
      console.error('💡 TIP: Your tables are missing. Run the sync command!')
    }
  }
}

main().finally(() => prisma.$disconnect())
