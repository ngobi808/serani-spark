import { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi, AdminUserRow } from '../api/adminClient';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  operations: 'Operations & Support',
  finance: 'Finance',
};

const ROLE_HELP: Record<string, string> = {
  owner: 'Everything, including managing users.',
  operations: 'Orders, products, stock. Cannot see buying prices, profit or sales totals, and cannot delete anything.',
  finance: 'Sales, cost and profit reports, read-only. Cannot change anything.',
};

// No look-alike characters (0/O, 1/l/I) so a temporary password is easy to read out or type.
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generatePassword(length = 14): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

interface Notice { email: string; password: string; kind: 'created' | 'reset' }

export function AdminUsers() {
  const { token, user: me } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'operations', temp: '' });
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');

  function load() {
    if (!token) return;
    adminApi.listUsers(token).then((r) => setUsers(r.users)).catch((e) => setError(e.message));
  }
  useEffect(load, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(''); setSaving(true);
    try {
      await adminApi.createUser(token, {
        email: form.email.trim(), full_name: form.full_name.trim() || undefined,
        role: form.role, temporary_password: form.temp,
      });
      setNotice({ email: form.email.trim().toLowerCase(), password: form.temp, kind: 'created' });
      setCopied(false);
      setForm({ email: '', full_name: '', role: 'operations', temp: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(u: AdminUserRow, role: string) {
    if (!token || role === u.role) return;
    if (!confirm(`Change ${u.email} to ${ROLE_LABELS[role]}? It takes effect immediately.`)) return;
    setError('');
    try { await adminApi.updateUser(token, u.id, { role }); load(); }
    catch (err: any) { setError(err.message); load(); }
  }

  async function toggleActive(u: AdminUserRow) {
    if (!token) return;
    const verb = u.is_active ? 'Deactivate' : 'Reactivate';
    if (!confirm(`${verb} ${u.email}?${u.is_active ? ' They will be signed out on their next click.' : ''}`)) return;
    setError('');
    try { await adminApi.updateUser(token, u.id, { is_active: !u.is_active }); load(); }
    catch (err: any) { setError(err.message); }
  }

  async function handleReset(u: AdminUserRow) {
    if (!token) return;
    setError('');
    try {
      await adminApi.updateUser(token, u.id, { temporary_password: resetPw });
      setNotice({ email: u.email, password: resetPw, kind: 'reset' });
      setCopied(false);
      setResetFor(null); setResetPw('');
      load();
    } catch (err: any) { setError(err.message); }
  }

  async function copyPassword() {
    if (!notice) return;
    try { await navigator.clipboard.writeText(notice.password); setCopied(true); } catch { /* user can select it manually */ }
  }

  return (
    <div>
      <h1>Users</h1>
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}

      {notice && (
        <div className="ss-card" style={{ border: '2px solid var(--ss-gold)', marginBottom: '1.5rem' }}>
          <strong>{notice.kind === 'created' ? 'Account created' : 'Password reset'} for {notice.email}</strong>
          <p style={{ margin: '0.5rem 0' }}>Temporary password (shown only now, so copy it before closing):</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.2rem', margin: '0.25rem 0 0.75rem' }}>{notice.password}</p>
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
            Give it to them privately, then delete the message. They'll be made to choose their own password the first time they sign in.
          </p>
          <button className="ss-btn-secondary" onClick={copyPassword} style={{ marginRight: '0.5rem' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
          <button className="ss-btn-secondary" onClick={() => setNotice(null)}>Done, hide it</button>
        </div>
      )}

      <form onSubmit={handleCreate} className="ss-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        <h3 style={{ gridColumn: '1 / -1', margin: 0 }}>Add a team member</h3>
        <input type="email" placeholder="Email *" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="operations">Operations & Support</option>
          <option value="finance">Finance</option>
          <option value="owner">Owner</option>
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input style={{ flex: 1 }} placeholder="Temporary password (10+ chars) *" required minLength={10} value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} />
          <button type="button" className="ss-btn-secondary" onClick={() => setForm({ ...form, temp: generatePassword() })}>Generate</button>
        </div>
        <p style={{ gridColumn: '1 / -1', margin: 0, color: '#666', fontSize: '0.85rem' }}>{ROLE_HELP[form.role]}</p>
        <button className="ss-btn-primary" type="submit" disabled={saving} style={{ gridColumn: '1 / -1' }}>{saving ? 'Creating...' : 'Create account'}</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '0.5rem' }}>Person</th>
            <th style={{ padding: '0.5rem' }}>Role</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
            <th style={{ padding: '0.5rem' }}>Last sign-in</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isMe = u.id === me?.id;
            return (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee', opacity: u.is_active ? 1 : 0.5, verticalAlign: 'top' }}>
                <td style={{ padding: '0.5rem' }}>
                  <strong>{u.full_name || u.email}</strong>{isMe && ' (you)'}<br />
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>{u.full_name ? u.email : ''}</span>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <select value={u.role} disabled={isMe} onChange={(e) => changeRole(u, e.target.value)} title={isMe ? "You can't change your own role" : ''}>
                    <option value="operations">Operations & Support</option>
                    <option value="finance">Finance</option>
                    <option value="owner">Owner</option>
                  </select>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {u.is_active ? 'Active' : 'Deactivated'}
                  {u.must_change_password && u.is_active && <><br /><span style={{ color: 'var(--ss-warning)', fontSize: '0.8rem' }}>hasn't set own password yet</span></>}
                </td>
                <td style={{ padding: '0.5rem' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                <td style={{ padding: '0.5rem' }}>
                  {!isMe && (
                    <>
                      <button className="ss-btn-secondary" onClick={() => toggleActive(u)} style={{ marginRight: '0.4rem', padding: '0.35rem 0.8rem' }}>
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button className="ss-btn-secondary" onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setResetPw(''); }} style={{ padding: '0.35rem 0.8rem' }}>
                        Reset password
                      </button>
                      {resetFor === u.id && (
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                          <input placeholder="New temporary password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} style={{ flex: 1 }} />
                          <button type="button" className="ss-btn-secondary" onClick={() => setResetPw(generatePassword())}>Generate</button>
                          <button type="button" className="ss-btn-primary" disabled={resetPw.length < 10} onClick={() => handleReset(u)} style={{ padding: '0.35rem 0.8rem' }}>Save</button>
                        </div>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
