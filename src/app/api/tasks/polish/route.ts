import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { polishText } from '@/lib/openai'

const COST = 50

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.userId as string

    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })

    // 1. Check Balance and Limits
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true }
    })

    if (!user || !user.wallet) return NextResponse.json({ error: 'User error' }, { status: 404 })

    if (user.wallet.balance < COST) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 403 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const dailyUsage = await prisma.usageLog.count({
        where: { user_id: userId, created_at: { gte: todayStart } }
    })

    const monthlyUsage = await prisma.usageLog.count({
        where: { user_id: userId, created_at: { gte: monthStart } }
    })

    if (dailyUsage >= user.daily_ai_limit) {
        return NextResponse.json({ error: 'Daily limit exceeded' }, { status: 429 })
    }

    if (monthlyUsage >= user.monthly_ai_limit) {
        return NextResponse.json({ error: 'Monthly limit exceeded' }, { status: 429 })
    }

    // 2. Call AI
    let polished: string
    try {
        polished = await polishText(text)
    } catch (e) {
        return NextResponse.json({ error: 'AI Service User unavailable' }, { status: 503 })
    }

    // 3. Deduct and Log
    await prisma.$transaction(async (tx: any) => {
        await tx.wallet.update({
            where: { user_id: userId },
            data: { balance: { decrement: COST } }
        })

        await tx.walletTransaction.create({
            data: {
                user_id: userId,
                type: 'debit',
                amount: COST,
                description: 'Polish Task with AI'
            }
        })

        await tx.usageLog.create({
            data: {
                user_id: userId,
                action: 'polish_task',
                coins_used: COST
            }
        })
    })

    return NextResponse.json({ polished })
}
