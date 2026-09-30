import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface CustomerAuthedRequest extends Request {
  customerId?: string;
}

interface CustomerJwtPayload {
  customerAccountId: string;
  type: 'customer';
}

/** Requires a valid customer login. Used for /me, /orders, checkout linking, etc. */
export function requireCustomer(req: CustomerAuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  try {
    const payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET!) as CustomerJwtPayload;
    // A `type` field on the token stops an admin's token being replayed here,
    // and a customer's token being replayed against admin routes, even though
    // both happen to be signed with the same JWT_SECRET.
    if (payload.type !== 'customer') {
      return res.status(401).json({ error: 'Invalid token type.' });
    }
    req.customerId = payload.customerAccountId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Like requireCustomer, but never rejects the request - it just sets
 * customerId when a valid customer token is present, and leaves it undefined
 * otherwise. Used at checkout, where both guest and logged-in orders are valid.
 */
export function optionalCustomer(req: CustomerAuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET!) as CustomerJwtPayload;
      if (payload.type === 'customer') req.customerId = payload.customerAccountId;
    } catch {
      // Invalid/expired token on checkout just falls back to guest - never blocks the order.
    }
  }
  next();
}
