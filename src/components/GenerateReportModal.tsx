'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// Dynamically import CKEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
    ssr: false,
    loading: () => <div className="editor-loading">Loading editor...</div>
});

type ViewState = 'form' | 'editing' | 'saved';

export default function GenerateReportModal({ onClose }: { onClose: () => void }) {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState('');
    const [error, setError] = useState('');
    const [viewState, setViewState] = useState<ViewState>('form');
    const [saving, setSaving] = useState(false);
    const [userEmail, setUserEmail] = useState('');

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

        // Convert headings
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Convert bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Convert italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Convert bullet lists
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
                // Wrap non-empty, non-heading lines in paragraphs
                if (line.trim() && !line.startsWith('<h')) {
                    processedLines.push(`<p>${line}</p>`);
                } else {
                    processedLines.push(line);
                }
            }
        }

        if (inList) {
            processedLines.push('</ul>');
        }

        return processedLines.join('\n');
    }

    // Convert HTML to plain text for DOCX
    function htmlToPlainText(html: string): string {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
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
                            } else if (childTag === 'u') {
                                children.push(new TextRun({ text: childEl.textContent || '', underline: {} }));
                            } else {
                                children.push(new TextRun({ text: childEl.textContent || '' }));
                            }
                        }
                    });
                    if (children.length > 0) {
                        paragraphs.push(new Paragraph({
                            children,
                            spacing: { before: 100, after: 100 },
                        }));
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
                case 'blockquote':
                    paragraphs.push(new Paragraph({
                        children: [new TextRun({ text: element.textContent || '', italics: true })],
                        indent: { left: 720 },
                        spacing: { before: 100, after: 100 },
                    }));
                    break;
                default:
                    element.childNodes.forEach(child => processNode(child));
            }
        }

        temp.childNodes.forEach(node => processNode(node));

        if (paragraphs.length === 0) {
            paragraphs.push(new Paragraph({ text: htmlToPlainText(html) }));
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
            // Convert markdown response to HTML for CKEditor
            const htmlContent = markdownToHtml(data.report);
            setReport(htmlContent);
            setViewState('editing');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        // Simulate save - in real app, would save to backend
        await new Promise(resolve => setTimeout(resolve, 500));
        setSaving(false);
        setViewState('saved');
    }

    async function downloadDocx() {
        const doc = new Document({
            sections: [{
                properties: {},
                children: parseHtmlToDocx(report),
            }],
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
    <title>Monthly Report ${fromDate} to ${toDate}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        h2 { color: #4F46E5; margin-top: 30px; }
        h3 { color: #555; }
        ul, ol { padding-left: 30px; }
        blockquote { border-left: 4px solid #4F46E5; padding-left: 16px; margin: 16px 0; background: #f5f5f5; padding: 12px 16px; }
    </style>
</head>
<body>
${report}
</body>
</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFileName('html');
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal ${viewState !== 'form' ? 'modal-large' : ''}`}>
                <div className="modal-header">
                    <h2 style={{ margin: 0 }}>
                        {viewState === 'form' && '📊 Generate Monthly Report'}
                        {viewState === 'editing' && '📝 Edit Your Report'}
                        {viewState === 'saved' && '✅ Report Saved Successfully'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {error && <div className="error-banner">{error}</div>}

                {viewState === 'form' && (
                    <div className="report-form">
                        <div className="form-group">
                            <label className="label">From Date</label>
                            <input
                                type="date"
                                className="input"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">To Date</label>
                            <input
                                type="date"
                                className="input"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                            />
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerate}
                                disabled={loading || !fromDate || !toDate}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Generating...
                                    </>
                                ) : (
                                    'Generate Report (200 coins)'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {viewState === 'editing' && (
                    <div className="report-editor">
                        <div className="editor-wrapper">
                            <RichTextEditor
                                value={report}
                                onChange={setReport}
                                placeholder="Edit your report here..."
                            />
                        </div>
                        <div className="editor-actions">
                            <button className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <div className="action-buttons">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        '💾 Save Report'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {viewState === 'saved' && (
                    <div className="saved-state">
                        <div className="success-message">
                            <div className="success-icon">✓</div>
                            <p>Your report has been saved successfully!</p>
                            <p className="success-subtitle">Now you can download it in your preferred format:</p>
                        </div>
                        <div className="download-options">
                            <button className="btn btn-download" onClick={downloadHtml}>
                                <span className="download-icon">🌐</span>
                                <span className="download-text">
                                    <strong>Download HTML</strong>
                                    <small>Web-ready format</small>
                                </span>
                            </button>
                            <button className="btn btn-download btn-download-primary" onClick={downloadDocx}>
                                <span className="download-icon">📄</span>
                                <span className="download-text">
                                    <strong>Download DOCX</strong>
                                    <small>Microsoft Word format</small>
                                </span>
                            </button>
                        </div>
                        <div className="saved-actions">
                            <button className="btn btn-secondary" onClick={() => setViewState('editing')}>
                                ← Back to Edit
                            </button>
                            <button className="btn btn-primary" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
