import { useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../api/customerClient';

export function CustomerForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await customerApi.forgotPassword(email);
      setMessage(res.message);
    } catch {
      // The backend always returns a generic message, even on failure paths we
      // haven't anticipated, so show the same reassuring text either way.
      setMessage("If an account exists for that email, we've sent a reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ss-container" style={{ maxWidth: 420 }}>
      <h1>Reset your password</h1>
      {message ? (
        <p>{message}</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <input type="email" placeholder="Your account email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="ss-btn-primary" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
        </form>
      )}
      <p style={{ marginTop: '1rem' }}><Link to="/login">Back to sign in</Link></p>
    </div>
  );
}
