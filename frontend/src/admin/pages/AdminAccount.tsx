import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  operations: 'Operations & Support',
  finance: 'Finance',
};

const MIN_LENGTH = 10;

export function AdminAccount() {
  const { token, user, refreshUser } = useAdminAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;
  const forced = user.must_change_password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');

    if (next.length < MIN_LENGTH) return setError(`Your new password must be at least ${MIN_LENGTH} characters.`);
    if (next !== confirm) return setError('The two new passwords do not match.');

    setSaving(true);
    try {
      await adminApi.changeMyPassword(token, current, next);
      setDone(true);
      setCurrent(''); setNext(''); setConfirm('');
      await refreshUser(); // clears the "must change password" lock
      if (forced) navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1>My Account</h1>
      <p>
        <strong>{user.full_name || user.email}</strong><br />
        {user.email}<br />
        Role: {ROLE_LABELS[user.role] ?? user.role}
      </p>

      {forced && (
        <p style={{ background: '#fbf0dc', color: '#7a5a1a', padding: '0.75rem 1rem', borderRadius: 8 }}>
          You're using a temporary password. Choose your own now to continue.
        </p>
      )}

      <form onSubmit={handleSubmit} className="ss-card" style={{ display: 'grid', gap: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Change password</h3>
        {error && <p style={{ color: 'var(--ss-danger)', margin: 0 }}>{error}</p>}
        {done && !forced && <p style={{ color: 'var(--ss-success)', margin: 0 }}>Password changed.</p>}
        <input type="password" placeholder={forced ? 'Temporary password you were given' : 'Current password'} required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <input type="password" placeholder={`New password (at least ${MIN_LENGTH} characters)`} required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <input type="password" placeholder="Repeat new password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
          A long password made of a few unrelated words is easier to remember and harder to guess than a short complicated one. Don't reuse a password from anywhere else.
        </p>
        <button className="ss-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change password'}</button>
      </form>
    </div>
  );
}
