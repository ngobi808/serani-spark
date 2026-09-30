import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireCustomer } from '../middleware/customerAuth';
import { register, login, forgotPassword, resetPassword, getMe, updateMe } from '../controllers/customerAuthController';
import { listMyOrders, getReorderItems } from '../controllers/customerOrdersController';

const router = Router();

// Same shape of protection as admin login: stop a brute-force guessing loop.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts. Try again later.' } });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

router.get('/me', requireCustomer, getMe);
router.put('/me', requireCustomer, updateMe);
router.get('/orders', requireCustomer, listMyOrders);
router.get('/orders/:id/reorder-items', requireCustomer, getReorderItems);

export default router;
