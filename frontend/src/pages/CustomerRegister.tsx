import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerApi } from '../api/customerClient';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const EMPTY = {
  email: '', password: '', business_name: '', contact_name: '', phone_number: '',
  mpesa_phone_number: '', delivery_zone: '', address: '', landmark: '', city_or_county: '',
};

export function CustomerRegister() {
  const { login } = useCustomerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await customerApi.register(form);
      login(token);
      navigate('/account');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ss-container" style={{ maxWidth: 480 }}>
      <h1>Create an account</h1>
      <p style={{ color: '#666' }}>Save your details for faster checkout, and see your order history and reorder in one tap.</p>
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <input type="email" placeholder="Email *" required value={form.email} onChange={(e) => update('email', e.target.value)} />
        <input type="password" placeholder="Password (at least 8 characters) *" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
        <input placeholder="Contact name *" required value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} />
        <input placeholder="Business name (optional)" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} />
        <input placeholder="Phone number *" required value={form.phone_number} onChange={(e) => update('phone_number', e.target.value)} />
        <input placeholder="M-Pesa phone number (2547...)" value={form.mpesa_phone_number} onChange={(e) => update('mpesa_phone_number', e.target.value)} />
        <input placeholder="Delivery zone" value={form.delivery_zone} onChange={(e) => update('delivery_zone', e.target.value)} />
        <input placeholder="Address" value={form.address} onChange={(e) => update('address', e.target.value)} />
        <input placeholder="Landmark" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} />
        <input placeholder="City / County" value={form.city_or_county} onChange={(e) => update('city_or_county', e.target.value)} />
        <button className="ss-btn-primary" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p style={{ marginTop: '1rem' }}>Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
