'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { useRouter } from 'next/navigation';

// Dynamically import CKEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg text-gray-500">Loading editor...</div>
});

type ViewState = 'form' | 'editing' | 'saved';

export default function ReportsPage() {
    const router = useRouter();
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState('');
    const [error, setError] = useState('');
    const [viewState, setViewState] = useState<ViewState>('form');
    const [saving, setSaving] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // AI Chat state
    const [aiMessage, setAiMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [showAiChat, setShowAiChat] = useState(false);

    // Fetch user data on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUserEmail(data.user?.email || '');
                }
            } catch (e) {
                console.error('Failed to fetch user:', e);
            }
        }
        fetchUser();
    }, []);

    // Generate filename: first 6 letters of email + today's date
    function getFileName(extension: string): string {
        const emailPrefix = userEmail.replace(/@.*/, '').slice(0, 6).toLowerCase() || 'report';
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const year = today.getFullYear();
        return `${emailPrefix}_${month}_${day}_${year}.${extension}`;
    }

    // Convert markdown to HTML for CKEditor
    function markdownToHtml(markdown: string): string {
        let html = markdown;
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        const lines = html.split('\n');
        let inList = false;
        const processedLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isBullet = /^[-*] (.+)$/.test(line.trim());

            if (isBullet) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                processedLines.push(`<li>${line.trim().slice(2)}</li>`);
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                if (line.trim() && !line.startsWith('<h')) {
                    processedLines.push(`<p>${line}</p>`);
                } else {
                    processedLines.push(line);
                }
            }
        }
        if (inList) processedLines.push('</ul>');
        return processedLines.join('\n');
    }

    // Parse HTML to DOCX paragraphs
    function parseHtmlToDocx(html: string) {
        const paragraphs: Paragraph[] = [];
        const temp = document.createElement('div');
        temp.innerHTML = html;

        function processNode(node: Node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text) {
                    paragraphs.push(new Paragraph({
                        children: [new TextRun({ text })],
                        spacing: { before: 100, after: 100 },
                    }));
                }
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const element = node as Element;
            const tagName = element.tagName.toLowerCase();

            switch (tagName) {
                case 'h1':
                    paragraphs.push(new Paragraph({
                        text: element.textContent || '',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    }));
                    break;
                case 'h2':
                    paragraphs.push(new Paragraph({
                        text: element.textContent || '',
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 300, after: 150 },
                    }));
                    break;
                case 'h3':
                    paragraphs.push(new Paragraph({
                        text: element.textContent || '',
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 200, after: 100 },
                    }));
                    break;
                case 'p':
                    const children: TextRun[] = [];
                    element.childNodes.forEach(child => {
                        if (child.nodeType === Node.TEXT_NODE) {
                            children.push(new TextRun({ text: child.textContent || '' }));
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            const childEl = child as Element;
                            const childTag = childEl.tagName.toLowerCase();
                            if (childTag === 'strong' || childTag === 'b') {
                                children.push(new TextRun({ text: childEl.textContent || '', bold: true }));
                            } else if (childTag === 'em' || childTag === 'i') {
                                children.push(new TextRun({ text: childEl.textContent || '', italics: true }));
                            } else {
                                children.push(new TextRun({ text: childEl.textContent || '' }));
                            }
                        }
                    });
                    if (children.length > 0) {
                        paragraphs.push(new Paragraph({ children, spacing: { before: 100, after: 100 } }));
                    }
                    break;
                case 'ul':
                case 'ol':
                    element.querySelectorAll('li').forEach(li => {
                        paragraphs.push(new Paragraph({
                            children: [new TextRun({ text: '• ' + (li.textContent || '') })],
                            indent: { left: 720 },
                            spacing: { before: 60, after: 60 },
                        }));
                    });
                    break;
                default:
                    element.childNodes.forEach(child => processNode(child));
            }
        }

        temp.childNodes.forEach(node => processNode(node));
        if (paragraphs.length === 0) {
            paragraphs.push(new Paragraph({ text: temp.textContent || '' }));
        }
        return paragraphs;
    }

    async function handleGenerate() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromDate, toDate })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const htmlContent = markdownToHtml(data.report);
            setReport(htmlContent);
            setViewState('editing');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAiEdit() {
        if (!aiMessage.trim()) return;

        setAiLoading(true);
        setError('');
        try {
            const res = await fetch('/api/reports/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: aiMessage, currentReport: report })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Convert the updated markdown to HTML
            const htmlContent = markdownToHtml(data.updatedReport);
            setReport(htmlContent);
            setAiMessage('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setAiLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaving(false);
        setViewState('saved');
    }

    async function downloadDocx() {
        const doc = new Document({
            sections: [{ properties: {}, children: parseHtmlToDocx(report) }],
        });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFileName('docx');
        a.click();
        URL.revokeObjectURL(url);
    }

    function downloadHtml() {
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monthly Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        h2 { color: #4F46E5; margin-top: 30px; }
        h3 { color: #555; }
    </style>
</head>
<body>${report}</body>
</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFileName('html');
        a.click();
        URL.revokeObjectURL(url);
    }

    // Quick AI suggestions
    const aiSuggestions = [
        'Make it more concise',
        'Add more details',
        'Make it more professional',
        'Fix grammar and spelling',
        'Summarize the key points',
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            📊 Generate Report
                        </h1>
                        <p className="text-gray-500 mt-1">Create and download your monthly activity report</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn btn-secondary"
                    >
                        ← Back
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
                        {error}
                    </div>
                )}

                {/* Step 1: Date Selection Form */}
                {viewState === 'form' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                        <h2 className="text-xl font-semibold mb-6">Select Date Range</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">From Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">To Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                className="btn btn-primary px-8 py-3 text-base"
                                onClick={handleGenerate}
                                disabled={loading || !fromDate || !toDate}
                            >
                                {loading ? (
                                    <><span className="spinner"></span> Generating...</>
                                ) : (
                                    'Generate Report (200 coins)'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Rich Text Editing */}
                {viewState === 'editing' && (
                    <div className="space-y-6">
                        {/* Editor Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                            <h2 className="text-xl font-semibold mb-6">📝 Edit Your Report</h2>
                            <div className="mb-6">
                                <RichTextEditor
                                    value={report}
                                    onChange={setReport}
                                    placeholder="Edit your report here..."
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setViewState('form')}
                                >
                                    ← Back to Dates
                                </button>
                                <button
                                    className="btn btn-primary px-8"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <><span className="spinner"></span> Saving...</>
                                    ) : (
                                        '💾 Save Report'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* AI Assistant Card */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🤖</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">AI Assistant</h3>
                                        <p className="text-sm text-gray-500">Ask AI to help edit your report</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAiChat(!showAiChat)}
                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                >
                                    {showAiChat ? 'Hide' : 'Show'} Assistant
                                </button>
                            </div>

                            {showAiChat && (
                                <div className="space-y-4">
                                    {/* Quick Suggestions */}
                                    <div className="flex flex-wrap gap-2">
                                        {aiSuggestions.map((suggestion, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setAiMessage(suggestion)}
                                                className="px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Chat Input */}
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={aiMessage}
                                            onChange={(e) => setAiMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !aiLoading && handleAiEdit()}
                                            placeholder="Tell AI what to change... (e.g., 'Add a conclusion section')"
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                            disabled={aiLoading}
                                        />
                                        <button
                                            onClick={handleAiEdit}
                                            disabled={aiLoading || !aiMessage.trim()}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        >
                                            {aiLoading ? (
                                                <><span className="spinner"></span> Working...</>
                                            ) : (
                                                <>✨ Apply</>
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-500">
                                        💡 Tip: Ask AI to summarize, expand, add sections, fix grammar, or change the tone of your report.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Download Options */}
                {viewState === 'saved' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">✓</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Saved Successfully!</h2>
                        <p className="text-gray-500 mb-8">Download your report in your preferred format</p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                            <button
                                onClick={downloadHtml}
                                className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                            >
                                <span className="text-2xl">🌐</span>
                                <div className="text-left">
                                    <div className="font-semibold">Download HTML</div>
                                    <div className="text-sm text-gray-500">Web format</div>
                                </div>
                            </button>
                            <button
                                onClick={downloadDocx}
                                className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
                            >
                                <span className="text-2xl">📄</span>
                                <div className="text-left">
                                    <div className="font-semibold">Download DOCX</div>
                                    <div className="text-sm text-indigo-200">Word format</div>
                                </div>
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t border-gray-200">
                            <button
                                onClick={() => setViewState('editing')}
                                className="btn btn-secondary"
                            >
                                ← Edit Report
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="btn btn-primary"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
