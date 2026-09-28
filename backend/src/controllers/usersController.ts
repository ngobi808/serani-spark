import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { AuthedRequest } from '../middleware/auth';
import { isRole } from '../config/permissions';

const MIN_PASSWORD_LENGTH = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET /api/admin/users: owner only. Never returns password hashes. */
export async function listAdminUsers(_req: AuthedRequest, res: Response) {
  const result = await pool.query(
    `SELECT id, email, full_name, role, is_active, must_change_password, created_at, last_login_at
     FROM admin_users ORDER BY created_at ASC`
  );
  res.json({ users: result.rows });
}

/**
 * POST /api/admin/users: owner only.
 * Creates an account with a temporary password the owner hands over privately.
 * The person is forced to choose their own password at first login.
 */
export async function createAdminUser(req: AuthedRequest, res: Response) {
  const { email, full_name, role, temporary_password } = req.body;

  if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!isRole(role)) {
    return res.status(400).json({ error: 'role must be one of: owner, operations, finance.' });
  }
  if (!temporary_password || String(temporary_password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  const hash = await bcrypt.hash(String(temporary_password), 10);

  try {
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, full_name, role, must_change_password)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name, role, is_active, must_change_password, created_at`,
      [String(email).trim().toLowerCase(), hash, full_name?.trim() || null, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    throw err;
  }
}

/**
 * PUT /api/admin/users/:id: owner only.
 * Can change role, activate/deactivate, rename, or reset the password (which forces
 * the person to choose a new one at next login).
 *
 * Protections: you can't change your own role, deactivate yourself, or reset your own
 * password here (use My Account), and the last active owner can never be removed.
 */
export async function updateAdminUser(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { role, is_active, full_name, temporary_password } = req.body;

  const targetResult = await pool.query(`SELECT id, role, is_active FROM admin_users WHERE id = $1`, [id]);
  if (targetResult.rowCount === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }
  const target = targetResult.rows[0];
  const isSelf = target.id === req.adminId;

  if (role !== undefined && !isRole(role)) {
    return res.status(400).json({ error: 'role must be one of: owner, operations, finance.' });
  }
  if (temporary_password !== undefined && String(temporary_password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  const changingRole = role !== undefined && role !== target.role;
  const deactivating = is_active === false && target.is_active;

  if (isSelf && (changingRole || deactivating)) {
    return res.status(400).json({ error: "You can't change your own role or deactivate your own account." });
  }
  if (isSelf && temporary_password !== undefined) {
    return res.status(400).json({ error: 'Change your own password from My Account instead.' });
  }

  // Never leave the business without an active owner.
  const losingOwner = target.role === 'owner' && (changingRole || deactivating);
  if (losingOwner) {
    const others = await pool.query(
      `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'owner' AND is_active = true AND id <> $1`,
      [id]
    );
    if (Number(others.rows[0].n) === 0) {
      return res.status(400).json({ error: 'There must always be at least one active owner.' });
    }
  }

  const sets: string[] = [];
  const values: any[] = [];

  if (role !== undefined) { values.push(role); sets.push(`role = $${values.length}`); }
  if (is_active !== undefined) { values.push(Boolean(is_active)); sets.push(`is_active = $${values.length}`); }
  if (full_name !== undefined) { values.push(String(full_name).trim() || null); sets.push(`full_name = $${values.length}`); }
  if (temporary_password !== undefined) {
    values.push(await bcrypt.hash(String(temporary_password), 10));
    sets.push(`password_hash = $${values.length}`);
    sets.push(`must_change_password = true`);
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${values.length}
     RETURNING id, email, full_name, role, is_active, must_change_password, created_at, last_login_at`,
    values
  );
  res.json(result.rows[0]);
}
