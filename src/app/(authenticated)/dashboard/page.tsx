'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CreateTaskModal from '@/components/CreateTaskModal';

export default function Dashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tasks, setTasks] = useState([]);
    const [wallet, setWallet] = useState<any>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

        // Check for payment callback params
        const payment = searchParams.get('payment');
        const coins = searchParams.get('coins');
        const amount = searchParams.get('amount');
        const message = searchParams.get('message');

        if (payment === 'success' && coins) {
            setNotification({
                type: 'success',
                message: `🎉 Payment successful! ${coins} coins have been added to your wallet.`
            });
            // Clean up URL params
            router.replace('/dashboard');
        } else if (payment === 'error') {
            const errorMessages: Record<string, string> = {
                NoReference: 'No payment reference found',
                AlreadyProcessed: 'This payment has already been processed',
                VerificationFailed: 'Payment verification failed',
                UserNotFound: 'User account not found',
                ServerError: 'Server error occurred'
            };
            setNotification({
                type: 'error',
                message: `Payment failed: ${errorMessages[message || ''] || message || 'Unknown error'}`
            });
            router.replace('/dashboard');
        }
    }, [searchParams, router]);

    // Auto-hide notification after 8 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Payment Notification */}
            {notification && (
                <div className={`mb-6 p-4 rounded-xl flex items-center justify-between transition-all ${notification.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{notification.type === 'success' ? '✅' : '❌'}</span>
                        <span className="font-medium">{notification.message}</span>
                    </div>
                    <button
                        onClick={() => setNotification(null)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>
            )}

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
                        onClick={() => router.push('/reports')}
                    >
                        📊 Generate Report
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
        </div>
    );
}
