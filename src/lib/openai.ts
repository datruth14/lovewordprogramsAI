import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function polishText(text: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o', // or gpt-3.5-turbo if preferred
        messages: [
            { role: 'system', content: 'You are a professional corporate assistant. Polish the following task description to be clear, professional, and impactful. Remove fluff. Use bullet points if multiple items. Keep it concise.' },
            { role: 'user', content: text },
        ],
        temperature: 0.7,
    });

    return response.choices[0].message.content || text;
}

export async function generateMonthlyReport(tasks: { task_assigned: string; work_done: string; ai_polished_content: string | null; created_at: Date }[]): Promise<string> {
    const taskDescriptions = tasks.map(t =>
        `- Date: ${t.created_at.toISOString().split('T')[0]}\n  Task: ${t.task_assigned}\n  Done: ${t.ai_polished_content || t.work_done}`
    ).join('\n\n');

    const prompt = `
    Generate a professional monthly activity report based on the following tasks.
    Structure the report with sections:
    1. Executive Summary
    2. Key Achievements
    3. Detailed Activities
    4. Impact Analysis
    
    Tone: Professional, Corporate, Impactful.
    Format: Markdown.
    
    Tasks:
    ${taskDescriptions}
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an elite report writer for corporate executives.' },
            { role: 'user', content: prompt }
        ],
    });

    return response.choices[0].message.content || 'Failed to generate report.';
}
