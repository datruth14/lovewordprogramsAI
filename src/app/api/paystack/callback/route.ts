import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/paystack'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get('reference')
    const baseUrl = new URL(req.url).origin

    if (!reference) {
        return NextResponse.redirect(`${baseUrl}/dashboard?payment=error&message=NoReference`)
    }

    try {
        const existingTx = await prisma.walletTransaction.findFirst({ where: { reference } })
        if (existingTx) {
            return NextResponse.redirect(`${baseUrl}/dashboard?payment=error&message=AlreadyProcessed`)
        }

        const result = await verifyTransaction(reference)
        if (!result.status || result.data.status !== 'success') {
            return NextResponse.redirect(`${baseUrl}/dashboard?payment=error&message=VerificationFailed`)
        }

        // Use user_id from metadata or find user by email?
        // Paystack returns customer email.
        const userEmail = result.data.customer.email
        const user = await prisma.user.findUnique({ where: { email: userEmail } })

        if (!user) {
            return NextResponse.redirect(`${baseUrl}/dashboard?payment=error&message=UserNotFound`)
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

        return NextResponse.redirect(`${baseUrl}/dashboard?payment=success&coins=${coinsToCredit}&amount=${amountPaidNaira}`)
    } catch (error) {
        console.error('Callback error', error)
        return NextResponse.redirect(`${baseUrl}/dashboard?payment=error&message=ServerError`)
    }
}
