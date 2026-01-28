import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/paystack'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get('reference')

    if (!reference) {
        return NextResponse.redirect(new URL('/wallet?error=NoReference', req.url))
    }

    try {
        const existingTx = await prisma.walletTransaction.findFirst({ where: { reference } })
        if (existingTx) {
            return NextResponse.redirect(new URL('/wallet?error=AlreadyProcessed', req.url))
        }

        const result = await verifyTransaction(reference)
        if (!result.status || result.data.status !== 'success') {
            return NextResponse.redirect(new URL('/wallet?error=VerificationFailed', req.url))
        }

        // Use user_id from metadata or find user by email?
        // Paystack returns customer email.
        const userEmail = result.data.customer.email
        const user = await prisma.user.findUnique({ where: { email: userEmail } })

        if (!user) {
            return NextResponse.redirect(new URL('/wallet?error=UserNotFound', req.url))
        }

        const amountPaidKobo = result.data.amount
        const amountPaidNaira = amountPaidKobo / 100
        const coinsToCredit = Math.floor(amountPaidNaira * 1.5)

        await prisma.$transaction(async (tx: any) => {
            await tx.wallet.update({
                where: { user_id: user.id },
                data: { balance: { increment: coinsToCredit } }
            })

            await tx.walletTransaction.create({
                data: {
                    user_id: user.id,
                    type: 'credit',
                    amount: coinsToCredit,
                    description: `Top-up: ${amountPaidNaira} NGN`,
                    reference: reference
                }
            })
        })

        return NextResponse.redirect(new URL('/wallet?success=TopUpComplete', req.url))
    } catch (error) {
        console.error('Callback error', error)
        return NextResponse.redirect(new URL('/wallet?error=ServerError', req.url))
    }
}
