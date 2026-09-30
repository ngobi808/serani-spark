import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db';
import { CustomerAuthedRequest } from '../middleware/customerAuth';
import { sendEmail, passwordResetEmail } from '../utils/email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function signToken(customerAccountId: string): string {
  return jwt.sign({ customerAccountId, type: 'customer' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

const PUBLIC_FIELDS = `id, email, business_name, contact_name, phone_number, mpesa_phone_number,
                       delivery_zone, address, landmark, city_or_county, created_at, last_login_at`;

/** POST /api/customer/register */
export async function register(req: Request, res: Response) {
  const {
    email, password, business_name, contact_name, phone_number,
    mpesa_phone_number, delivery_zone, address, landmark, city_or_county,
  } = req.body;

  if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (!contact_name || !phone_number) {
    return res.status(400).json({ error: 'contact_name and phone_number are required.' });
  }

  const hash = await bcrypt.hash(String(password), 10);

  try {
    const result = await pool.query(
      `INSERT INTO customer_accounts
         (email, password_hash, business_name, contact_name, phone_number, mpesa_phone_number, delivery_zone, address, landmark, city_or_county, last_login_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
       RETURNING ${PUBLIC_FIELDS}`,
      [
        String(email).trim().toLowerCase(), hash, business_name?.trim() || null, contact_name.trim(),
        phone_number.trim(), mpesa_phone_number?.trim() || null, delivery_zone?.trim() || null,
        address?.trim() || null, landmark?.trim() || null, city_or_county?.trim() || null,
      ]
    );
    const account = result.rows[0];
    res.status(201).json({ token: signToken(account.id), account });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    throw err;
  }
}

/** POST /api/customer/login */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const result = await pool.query(
    `SELECT id, password_hash FROM customer_accounts WHERE LOWER(email) = LOWER($1)`,
    [String(email).trim()]
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const account = result.rows[0];
  const valid = await bcrypt.compare(String(password), account.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  await pool.query(`UPDATE customer_accounts SET last_login_at = now() WHERE id = $1`, [account.id]);
  res.json({ token: signToken(account.id) });
}

/**
 * POST /api/customer/forgot-password
 * Always returns the same generic message, whether or not the email exists,
 * so this endpoint can't be used to check which emails are registered.
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const generic = { message: "If an account exists for that email, we've sent a reset link." };
  if (!email) return res.json(generic);

  const result = await pool.query(`SELECT id FROM customer_accounts WHERE LOWER(email) = LOWER($1)`, [String(email).trim()]);
  if (result.rowCount === 0) return res.json(generic);

  const accountId = result.rows[0].id;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await pool.query(
    `UPDATE customer_accounts SET reset_token_hash = $1, reset_token_expires_at = $2 WHERE id = $3`,
    [tokenHash, expiresAt, accountId]
  );

  const frontendOrigin = process.env.FRONTEND_ORIGIN?.split(',')[0] || 'https://www.seranispark.co.ke';
  const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;
  const { subject, html } = passwordResetEmail(resetUrl);
  await sendEmail(String(email).trim(), subject, html);

  res.json(generic);
}

/** POST /api/customer/reset-password */
export async function resetPassword(req: Request, res: Response) {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ error: 'token and new_password are required.' });
  }
  if (String(new_password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const result = await pool.query(
    `SELECT id FROM customer_accounts WHERE reset_token_hash = $1 AND reset_token_expires_at > now()`,
    [tokenHash]
  );
  if (result.rowCount === 0) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
  }

  const newHash = await bcrypt.hash(String(new_password), 10);
  await pool.query(
    `UPDATE customer_accounts SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = $2`,
    [newHash, result.rows[0].id]
  );
  res.json({ message: 'Password has been reset. You can now log in.' });
}

/** GET /api/customer/me */
export async function getMe(req: CustomerAuthedRequest, res: Response) {
  const result = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM customer_accounts WHERE id = $1`, [req.customerId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Account not found.' });
  res.json(result.rows[0]);
}

const EDITABLE_FIELDS = ['business_name', 'contact_name', 'phone_number', 'mpesa_phone_number', 'delivery_zone', 'address', 'landmark', 'city_or_county'];

/** PUT /api/customer/me: update saved checkout details. */
export async function updateMe(req: CustomerAuthedRequest, res: Response) {
  const sets: string[] = [];
  const values: any[] = [];
  for (const field of EDITABLE_FIELDS) {
    if (field in req.body) {
      values.push(req.body[field]);
      sets.push(`${field} = $${values.length}`);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

  values.push(req.customerId);
  const result = await pool.query(
    `UPDATE customer_accounts SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${PUBLIC_FIELDS}`,
    values
  );
  res.json(result.rows[0]);
}
