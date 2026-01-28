'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
    }

    return (
        <header className="header">
            <div className="container header-inner">
                <div style={{ fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: 'var(--primary)', marginRight: 8 }}>AI</span> Assistant
                </div>
                <nav style={{ display: 'flex', alignItems: 'center' }}>
                    <Link href="/dashboard" className="nav-link">Dashboard</Link>
                    <Link href="/wallet" className="nav-link">Wallet</Link>
                    <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none' }}>Logout</button>
                </nav>
            </div>
        </header>
    );
}
