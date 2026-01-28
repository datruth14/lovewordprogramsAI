import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const wallet = await prisma.wallet.findUnique({
        where: { user_id: session.userId as string },
        include: {
            user: {
                select: {
                    transactions: {
                        orderBy: { created_at: 'desc' },
                        take: 20
                    }
                }
            }
        }
    })

    return NextResponse.json({
        balance: wallet?.balance || 0,
        transactions: wallet?.user.transactions || []
    })
}
