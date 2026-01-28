import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ user: null })
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId as string },
        select: { id: true, email: true, daily_ai_limit: true, monthly_ai_limit: true },
    })

    return NextResponse.json({ user })
}
