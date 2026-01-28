import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/paystack'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { reference } = await req.json()
    if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 })

    // Check if reference already processed
    const existingTx = await prisma.walletTransaction.findFirst({ where: { reference } })
    if (existingTx) {
        return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 })
    }

    const result = await verifyTransaction(reference)

    if (!result.status || result.data.status !== 'success') {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const amountPaidKobo = result.data.amount
    const amountPaidNaira = amountPaidKobo / 100
    // Conversion: 1000 Naira = 1500 coins. Ratio = 1.5
    const coinsToCredit = Math.floor(amountPaidNaira * 1.5)

    await prisma.$transaction(async (tx: any) => {
        // Credit Wallet
        await tx.wallet.update({
            where: { user_id: session.userId as string },
            data: {
                balance: { increment: coinsToCredit }
            }
        })

        // Log Transaction
        await tx.walletTransaction.create({
            data: {
                user_id: session.userId as string,
                type: 'credit',
                amount: coinsToCredit,
                description: `Top-up: ${amountPaidNaira} NGN`,
                reference: reference
            }
        })
    })

    return NextResponse.json({ success: true, coinsCredited: coinsToCredit })
}
