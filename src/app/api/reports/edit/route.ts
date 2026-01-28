import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, currentReport } = await req.json()

    if (!message || !currentReport) {
        return NextResponse.json({ error: 'Message and current report are required' }, { status: 400 })
    }

    try {
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

If the user asks to:
- "summarize" - make the content more concise
- "expand" - add more details
- "make it more professional" - improve the tone
- "fix grammar" - correct any errors
- "add section about X" - add new content
- "remove X" - delete that content
- "reword X" - rephrase specific parts

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

        return NextResponse.json({ success: true, updatedReport })
    } catch (e) {
        console.error('AI Edit Error:', e)
        return NextResponse.json({ error: 'AI edit failed' }, { status: 503 })
    }
}
