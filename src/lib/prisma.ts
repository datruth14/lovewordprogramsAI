import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL!
    const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
    let url: string

    if (dbUrl.startsWith('file:./')) {
        const relativePath = dbUrl.replace('file:./', '')
        const absolutePath = path.resolve(process.cwd(), relativePath)
        url = `file://${absolutePath}`
    } else if (dbUrl.startsWith('file:')) {
        url = dbUrl.replace('file:', 'file://')
    } else {
        url = dbUrl
    }

    const adapter = new PrismaLibSql({ url, authToken })
    return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
