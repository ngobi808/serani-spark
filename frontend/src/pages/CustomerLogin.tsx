import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi } from '../api/customerClient';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export function CustomerLogin() {
  const { login } = useCustomerAuth();
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
      const { token } = await customerApi.login(email, password);
      login(token);
      navigate('/account');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ss-container" style={{ maxWidth: 420 }}>
      <h1>Sign in</h1>
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="ss-btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        <Link to="/forgot-password">Forgot your password?</Link>
      </p>
      <p>
        New here? <Link to="/register">Create an account</Link>, or just <Link to="/">check out as a guest</Link>.
      </p>
    </div>
  );
}
