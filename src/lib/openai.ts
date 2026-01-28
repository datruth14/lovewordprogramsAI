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

export async function generateMonthlyReport(
    tasks: { task_assigned: string; work_done: string; ai_polished_content: string | null; created_at: Date }[],
    fromDate: string,
    toDate: string
): Promise<string> {
    // Format dates for display
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const startMonth = formatMonth(startDate);
    const endMonth = formatMonth(endDate);

    // Determine report period title
    let periodTitle = startMonth;
    if (startMonth !== endMonth) {
        periodTitle = `${startMonth} - ${endMonth}`;
    }

    const taskDescriptions = tasks.map(t =>
        `- Date: ${t.created_at.toISOString().split('T')[0]}\n  Task: ${t.task_assigned}\n  Done: ${t.ai_polished_content || t.work_done}`
    ).join('\n\n');

    const prompt = `
Generate a beautifully formatted, professional monthly activity report for the period: **${periodTitle}**

REPORT PERIOD: ${fromDate} to ${toDate}
TOTAL TASKS: ${tasks.length}

FORMATTING REQUIREMENTS:
- Use proper Markdown formatting with clear hierarchy
- Use **bold text** for emphasis on key achievements and metrics
- Use proper heading levels (# for main title, ## for sections, ### for subsections)
- Add bullet points for lists using - or *
- Include relevant emojis for visual appeal (📊 for data, ✅ for completed, 🎯 for goals, 💡 for insights)
- Add horizontal lines (---) between major sections
- Keep paragraphs short and scannable
- Highlight numbers and metrics in **bold**

REQUIRED STRUCTURE:

# 📅 ${periodTitle} Report

## 📋 Executive Summary
Write a compelling 2-3 sentence overview highlighting the main accomplishments and impact for this period.

---

## ✅ Key Achievements
List the most significant accomplishments as bullet points with **bold** key terms.

---

## 📊 Detailed Activities
Group activities by week or date. For each:
### 📆 [Date or Week]
- **Task:** [description]
- **Outcome:** [result achieved]
- **Impact:** [business value]

---

## 💡 Impact Analysis
Summarize the overall impact with quantifiable benefits where possible.

---

## 🎯 Recommendations & Next Steps
Brief actionable recommendations based on the work completed.

TONE: Professional, Corporate, Impactful, Achievement-focused.

Tasks to include:
${taskDescriptions}
`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an elite corporate report writer. Create visually appealing, well-structured reports with proper formatting, spacing, and emphasis. Use Markdown effectively for professional presentation.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
    });

    return response.choices[0].message.content || 'Failed to generate report.';
}
