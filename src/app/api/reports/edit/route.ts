import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const EDIT_COST = 10

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.userId as string

    const { message, currentReport } = await req.json()

    if (!message || !currentReport) {
        return NextResponse.json({ error: 'Message and current report are required' }, { status: 400 })
    }

    try {
        // 1. Check Balance and Limits
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true }
        })

        if (!user || !user.wallet) return NextResponse.json({ error: 'User error' }, { status: 404 })

        if (user.wallet.balance < EDIT_COST) {
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

        // 2. AI Edit
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are an AI assistant helping to edit and improve a professional report. 
                    
Your job is to:
- Follow the user's instructions to modify the report
- Maintain the same formatting style (Markdown with emojis, bold text, headers)
- Keep the professional corporate tone
- Return ONLY the modified report content, no explanations

Always return the complete updated report in Markdown format.`
                },
                {
                    role: 'user',
                    content: `Here is the current report:\n\n${currentReport}\n\n---\n\nUser request: ${message}\n\nPlease apply the requested changes and return the updated report.`
                }
            ],
            temperature: 0.7,
        })

        const updatedReport = response.choices[0].message.content

        // 3. Deduct, Log
        await prisma.$transaction(async (tx: any) => {
            await tx.wallet.update({
                where: { user_id: userId },
                data: { balance: { decrement: EDIT_COST } }
            })

            await tx.walletTransaction.create({
                data: {
                    user_id: userId,
                    type: 'debit',
                    amount: EDIT_COST,
                    description: 'AI Report Edit Instruction'
                }
            })

            await tx.usageLog.create({
                data: {
                    user_id: userId,
                    action: 'ai_report_edit',
                    coins_used: EDIT_COST
                }
            })
        })

        return NextResponse.json({ success: true, updatedReport })
    } catch (e) {
        console.error('AI Edit Error:', e)
        return NextResponse.json({ error: 'AI edit failed' }, { status: 503 })
    }
}
