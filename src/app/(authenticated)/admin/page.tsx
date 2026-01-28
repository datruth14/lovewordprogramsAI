'use client';
import { useEffect, useState } from 'react';

export default function AdminPage() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(res => res.json())
            .then(data => setStats(data));
    }, []);

    if (!stats) return <div>Loading...</div>;

    return (
        <div>
            <h1 style={{ marginBottom: 24 }}>Admin Dashboard</h1>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value">₦{stats.revenue.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Coins Sold</div>
                    <div className="stat-value">{stats.coinsSold.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total AI Requests</div>
                    <div className="stat-value">{stats.aiRequests.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{stats.users}</div>
                </div>
            </div>

            <h2>User Statistics</h2>
            <div className="card">
                <ul>
                    {stats.userStats.map((u: any, i: number) => (
                        <li key={i} style={{ marginBottom: 8 }}>
                            <strong>{u.email}</strong>: {u._count.usage_logs} request(s)
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
