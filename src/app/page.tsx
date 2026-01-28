'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">AI Report Assistant</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to access your dashboard' : 'Join today and get 1,000 free coins'}
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '24px', position: 'relative', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', borderTop: '1px solid #E5E7EB' }}></div>
          <span style={{ position: 'relative', background: 'white', padding: '0 8px', color: '#6B7280', fontSize: '12px' }}>OR</span>
        </div>

        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '16px' }}
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Create new account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
