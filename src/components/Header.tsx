'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
    }

    return (
        <header className="header relative">
            <div className="container header-inner">
                {/* Logo */}
                <div style={{ fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                        src="https://www.cehillingdon.org.uk/wp-content/uploads/2024/02/lwp-logo.png"
                        alt="LWP Logo"
                        className="h-8 md:h-10 w-auto object-contain"
                    />
                    <span className="text-sm sm:text-base md:text-lg">
                        <span style={{ color: 'var(--primary)' }}>LWPAI</span> Assistant
                    </span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center">
                    <Link href="/dashboard" className="nav-link">Dashboard</Link>
                    <Link href="/reports" className="nav-link">Reports</Link>
                    <Link href="/wallet" className="nav-link">Wallet</Link>
                    <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none' }}>Logout</button>
                </nav>

                {/* Mobile Hamburger Button */}
                <button
                    className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`block w-5 h-0.5 bg-gray-600 transition-transform duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                    <span className={`block w-5 h-0.5 bg-gray-600 my-1 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-5 h-0.5 bg-gray-600 transition-transform duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            <div className={`md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg transition-all duration-300 overflow-hidden z-50 ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                <nav className="container py-4 flex flex-col gap-2">
                    <Link
                        href="/dashboard"
                        className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        📊 Dashboard
                    </Link>
                    <Link
                        href="/reports"
                        className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        📝 Reports
                    </Link>
                    <Link
                        href="/wallet"
                        className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        💰 Wallet
                    </Link>
                    <button
                        onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                        className="px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 font-medium text-left transition-colors"
                    >
                        🚪 Logout
                    </button>
                </nav>
            </div>
        </header>
    );
}
