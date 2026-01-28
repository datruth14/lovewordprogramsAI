import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    // Priority: TURSO_DATABASE_URL > DATABASE_URL
    const tursoUrl = process.env.TURSO_DATABASE_URL
    const defaultUrl = process.env.DATABASE_URL
    const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN

    let rawUrl = tursoUrl || defaultUrl!
    let url: string

    // If we have both, and the default one is a local file but the turso one is remote, use turso
    if (defaultUrl?.startsWith('file:') && tursoUrl?.startsWith('libsql')) {
        rawUrl = tursoUrl
    }

    if (rawUrl.startsWith('file:./')) {
        const relativePath = rawUrl.replace('file:./', '')
        const absolutePath = path.resolve(process.cwd(), relativePath)
        url = `file://${absolutePath}`
    } else if (rawUrl.startsWith('file:')) {
        url = rawUrl.replace('file:', 'file://')
    } else {
        url = rawUrl
    }

    if (process.env.NODE_ENV === 'production') {
        console.log('Using Database URL:', url.split('@').pop()); // Log only the host part for security
    }

    const adapter = new PrismaLibSql({ url, authToken })
    return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
