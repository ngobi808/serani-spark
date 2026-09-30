import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { customerApi } from '../api/customerClient';

export function CustomerResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      await customerApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="ss-container" style={{ maxWidth: 420 }}>
        <h1>Reset link missing</h1>
        <p>This page needs a reset link from your email. <Link to="/forgot-password">Request a new one</Link>.</p>
      </div>
    );
  }

  return (
    <div className="ss-container" style={{ maxWidth: 420 }}>
      <h1>Choose a new password</h1>
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      {done ? (
        <p style={{ color: 'var(--ss-success)' }}>Password changed. Taking you to sign in...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <input type="password" placeholder="New password (at least 8 characters)" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" placeholder="Repeat new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="ss-btn-primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Set new password'}</button>
        </form>
      )}
    </div>
  );
}
