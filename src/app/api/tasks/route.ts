import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tasks = await prisma.task.findMany({
        where: { user_id: session.userId as string },
        orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { task_assigned, work_done, ai_polished_content } = await req.json()

    const task = await prisma.task.create({
        data: {
            user_id: session.userId as string,
            task_assigned,
            work_done,
            ai_polished_content
        }
    })

    return NextResponse.json({ task })
}
