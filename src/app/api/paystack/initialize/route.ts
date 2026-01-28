import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { initializeTransaction } from '@/lib/paystack'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amountInNaira } = await req.json()
    if (amountInNaira < 1000) {
        return NextResponse.json({ error: 'Minimum top-up is 1000 NGN' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId as string } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const result = await initializeTransaction(user.email, amountInNaira)
    if (!result.status) {
        return NextResponse.json({ error: result.message || 'Paystack initialization failed' }, { status: 400 })
    }

    return NextResponse.json({ authorization_url: result.data.authorization_url, reference: result.data.reference })
}
