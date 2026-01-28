'use client';
import { useState } from 'react';

export default function CreateTaskModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [taskAssigned, setTaskAssigned] = useState('');
    const [workDone, setWorkDone] = useState('');
    const [polished, setPolished] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handlePolish() {
        if (!taskAssigned && !workDone) {
            setError('Please fill in task details first');
            return;
        }
        setLoading(true);
        setError('');

        // Concatenate for context
        const textToPolish = `Task Assigned: ${taskAssigned}\nWork Done: ${workDone}`;

        try {
            const res = await fetch('/api/tasks/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToPolish })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPolished(data.polished);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setLoading(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_assigned: taskAssigned,
                    work_done: workDone,
                    ai_polished_content: polished || null
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            onSuccess();
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2 style={{ marginTop: 0 }}>Create New Task</h2>
                {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

                <div style={{ marginBottom: 16 }}>
                    <label className="label">Task Assigned</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={taskAssigned}
                        onChange={e => setTaskAssigned(e.target.value)}
                        placeholder="What was assigned to you?"
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="label">Work Done</label>
                    <input
                        className="input"
                        value={workDone}
                        onChange={e => setWorkDone(e.target.value)}
                        placeholder="What did you achieve?"
                    />
                </div>

                {polished && (
                    <div style={{ marginBottom: 16 }}>
                        <label className="label" style={{ color: 'var(--success)' }}>AI Polished Result</label>
                        <textarea
                            className="input"
                            rows={4}
                            value={polished}
                            onChange={e => setPolished(e.target.value)}
                            style={{ borderColor: 'var(--success)', background: '#F0FDF4' }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>

                    <button
                        type="button"
                        className="btn"
                        style={{ background: '#8B5CF6', color: 'white' }}
                        onClick={handlePolish}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : '✨ Polish (50C)'}
                    </button>

                    <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                        Save Task
                    </button>
                </div>
            </div>
        </div>
    );
}
