import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminClient';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await adminApi.login(email, password);
      login(token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ss-green-dark)' }}>
      <form onSubmit={handleSubmit} className="ss-card" style={{ width: 320, display: 'grid', gap: '0.9rem' }}>
        <h2 style={{ textAlign: 'center', margin: 0 }} className="ss-script">Serani Spark</h2>
        <p style={{ textAlign: 'center', margin: 0, color: '#666' }}>Admin sign in</p>
        {error && <p style={{ color: 'var(--ss-danger)', fontSize: '0.85rem' }}>{error}</p>}
        <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '0.6rem' }} />
        <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '0.6rem' }} />
        <button className="ss-btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}
