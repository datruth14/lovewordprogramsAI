import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 })
        }

        const passwordHash = await hashPassword(password)

        // Transaction: Create User -> Create Wallet -> Credit Bonus -> Log Log
        const user = await prisma.$transaction(async (tx: any) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    password_hash: passwordHash,
                },
            })

            // Create Wallet
            await tx.wallet.create({
                data: {
                    user_id: newUser.id,
                    balance: 1000, // Bonus
                },
            })

            // Log Transaction
            await tx.walletTransaction.create({
                data: {
                    user_id: newUser.id,
                    type: 'credit',
                    amount: 1000,
                    description: 'Signup Bonus',
                },
            })

            return newUser
        })

        await createSession(user.id)

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } })
    } catch (error: any) {
        console.error('Signup error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
