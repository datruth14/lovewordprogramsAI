import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    // Convert relative file: path to absolute for libsql
    // DATABASE_URL is like "file:./data/app.db" - we need "file:///absolute/path/data/app.db"
    const dbUrl = process.env.DATABASE_URL!
    let url: string

    if (dbUrl.startsWith('file:./')) {
        // Relative path - resolve to absolute
        const relativePath = dbUrl.replace('file:./', '')
        const absolutePath = path.resolve(process.cwd(), relativePath)
        url = `file://${absolutePath}`
    } else if (dbUrl.startsWith('file:')) {
        // Already has file:, ensure proper format
        url = dbUrl.replace('file:', 'file://')
    } else {
        // Other URL types (http, https for Turso etc)
        url = dbUrl
    }

    const adapter = new PrismaLibSql({ url })
    return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
