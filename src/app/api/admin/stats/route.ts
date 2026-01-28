import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // In a real app, verify admin role. For now, assuming only one user or open.
    // Or check against a hardcoded admin email.
    // const user = await prisma.user.findUnique({ where: { id: session.userId } })
    // if (user.email !== 'admin@example.com') ...

    const totalUsers = await prisma.user.count()
    const totalAIRequests = await prisma.usageLog.count()

    // Revenue: Sum of credits from Paystack (reference is not null)
    const txs = await prisma.walletTransaction.findMany({
        where: { type: 'credit', reference: { not: null } }
    })

    const totalRevenue = txs.reduce((acc: number, tx: any) => {
        // Parse NGN from description "Top-up: 1000 NGN" or store in DB?
        // Stored amount in coins. 
        // We should probably have stored revenue in proper currency in DB, 
        // but we can infer from coins (1000 NGN = 1500 coins => coins / 1.5)
        return acc + (tx.amount / 1.5)
    }, 0)

    const totalCoinsSold = txs.reduce((acc: number, tx: any) => acc + tx.amount, 0)

    const activeUsers = await prisma.user.count({
        where: {
            tasks: { some: {} } // Users who have created at least one task?
        }
    })

    // Per user usage
    const userStats = await prisma.user.findMany({
        select: {
            email: true,
            _count: {
                select: { usage_logs: true }
            }
        },
        take: 50
    })

    return NextResponse.json({
        revenue: totalRevenue,
        coinsSold: totalCoinsSold,
        aiRequests: totalAIRequests,
        users: totalUsers,
        activeUsers,
        userStats
    })
}
