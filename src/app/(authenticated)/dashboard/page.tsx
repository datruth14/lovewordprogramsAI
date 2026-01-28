'use client';
import { useEffect, useState } from 'react';
import CreateTaskModal from '@/components/CreateTaskModal';
import GenerateReportModal from '@/components/GenerateReportModal';

export default function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [wallet, setWallet] = useState<any>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [user, setUser] = useState<any>(null);

    async function fetchData() {
        const [tasksRes, walletRes, meRes] = await Promise.all([
            fetch('/api/tasks'),
            fetch('/api/wallet'),
            fetch('/api/auth/me')
        ]);
        if (tasksRes.ok) setTasks((await tasksRes.json()).tasks);
        if (walletRes.ok) setWallet(await walletRes.json());
        if (meRes.ok) setUser((await meRes.json()).user);
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 m-0">Dashboard</h1>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        className="btn btn-primary w-full sm:w-auto text-sm md:text-base px-4 py-2.5"
                        onClick={() => setShowTaskModal(true)}
                    >
                        + New Task
                    </button>
                    <button
                        className="btn btn-secondary w-full sm:w-auto text-sm md:text-base px-4 py-2.5"
                        onClick={() => setShowReportModal(true)}
                    >
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                <div className="stat-card p-4 md:p-6">
                    <div className="text-sm text-gray-500 mb-1">Wallet Balance</div>
                    <div className="text-2xl md:text-3xl font-bold text-indigo-600">
                        {wallet?.balance ?? '...'}
                        <span className="text-sm md:text-base font-normal ml-1">coins</span>
                    </div>
                    {wallet?.balance < 50 && (
                        <div className="text-orange-500 text-xs md:text-sm mt-2">
                            ⚠️ Low balance! Top up.
                        </div>
                    )}
                </div>
                <div className="stat-card p-4 md:p-6">
                    <div className="text-sm text-gray-500 mb-1">Daily Limit</div>
                    <div className="text-2xl md:text-3xl font-bold text-indigo-600">20</div>
                    <div className="text-xs md:text-sm text-gray-400">Requests/day</div>
                </div>
                <div className="stat-card p-4 md:p-6 sm:col-span-2 lg:col-span-1">
                    <div className="text-sm text-gray-500 mb-1">Monthly Limit</div>
                    <div className="text-2xl md:text-3xl font-bold text-indigo-600">
                        {user?.monthly_ai_limit ?? 300}
                    </div>
                    <div className="text-xs md:text-sm text-gray-400">Requests/month</div>
                </div>
            </div>

            {/* Tasks Section */}
            <h2 className="text-lg md:text-xl font-semibold mb-4">Your Tasks</h2>
            <div className="flex flex-col gap-4">
                {tasks.map((task: any) => (
                    <div key={task.id} className="task-item p-4 md:p-5">
                        <div className="w-full">
                            <div className="font-semibold text-sm md:text-base mb-1 break-words">
                                {task.task_assigned}
                            </div>
                            <div className="text-gray-500 text-xs md:text-sm break-words">
                                {task.work_done}
                            </div>
                            {task.ai_polished_content && (
                                <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500 text-xs md:text-sm break-words">
                                    <strong className="text-green-700">AI Polished:</strong>{' '}
                                    <span className="text-gray-700">{task.ai_polished_content}</span>
                                </div>
                            )}
                            <div className="text-xs text-gray-400 mt-3">
                                {new Date(task.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="text-center text-gray-400 py-10 md:py-16 bg-white rounded-lg border border-gray-200">
                        <div className="text-4xl mb-3">📝</div>
                        <p className="text-sm md:text-base">No tasks found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {showTaskModal && (
                <CreateTaskModal
                    onClose={() => setShowTaskModal(false)}
                    onSuccess={() => {
                        setShowTaskModal(false);
                        fetchData();
                    }}
                />
            )}

            {showReportModal && (
                <GenerateReportModal
                    onClose={() => setShowReportModal(false)}
                />
            )}
        </div>
    );
}
