import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { generateMonthlyReport } from '@/lib/openai'

const COST = 200

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.userId as string

    const { fromDate, toDate } = await req.json()

    // 1. Check Balance and Limits (Similar to Polish)
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

    // Fetch Tasks - parse dates properly to include full day range
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
        where: {
            user_id: userId,
            created_at: {
                gte: startDate,
                lte: endDate
            }
        }
    })

    if (tasks.length === 0) {
        return NextResponse.json({ error: 'No tasks found in range' }, { status: 400 })
    }

    // 2. Generate Report
    let reportContent: string
    try {
        reportContent = await generateMonthlyReport(tasks as any, fromDate, toDate)
    } catch (e) {
        return NextResponse.json({ error: 'AI failure' }, { status: 503 })
    }

    // 3. Deduct, Log, Save Report
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
                description: 'Generate Monthly Report'
            }
        })

        await tx.usageLog.create({
            data: {
                user_id: userId,
                action: 'generate_report',
                coins_used: COST
            }
        })

        await tx.report.create({
            data: {
                user_id: userId,
                from_date: new Date(fromDate),
                to_date: new Date(toDate),
                report_content: reportContent
            }
        })
    })

    return NextResponse.json({ success: true, report: reportContent })
}
