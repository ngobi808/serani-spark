import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { Permission, hasPermission } from '../config/permissions';

export interface AuthedRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRole?: string;
}

/**
 * Verifies the login token, then loads the admin from the database on EVERY
 * request instead of trusting whatever was true at login time. That means:
 *  - deactivating someone locks them out on their very next click
 *  - a role change takes effect immediately
 *  - nobody with "must change password" set can do anything except change it
 */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  let adminId: string;
  try {
    const payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET!) as { adminId: string };
    adminId = payload.adminId;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, role, is_active, must_change_password FROM admin_users WHERE id = $1`,
      [adminId]
    );
    const admin = result.rows[0];

    if (!admin || !admin.is_active) {
      return res.status(401).json({ error: 'This account is disabled or no longer exists.' });
    }

    req.adminId = admin.id;
    req.adminEmail = admin.email;
    req.adminRole = admin.role;

    // Inside this router, req.path is relative to /api/admin, so '/me...' is the
    // only area open to someone who still has to set their own password.
    if (admin.must_change_password && !req.path.startsWith('/me')) {
      return res.status(403).json({
        error: 'You must change your password before continuing.',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    next();
  } catch (err) {
    console.error('requireAdmin error', err);
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

/** Route guard: only lets through roles that hold the given permission. */
export function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!hasPermission(req.adminRole, permission)) {
      return res.status(403).json({ error: 'Your role does not have permission to do that.' });
    }
    next();
  };
}
