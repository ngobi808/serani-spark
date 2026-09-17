import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { startStkPush, handleMpesaCallback } from '../controllers/paymentController';

const router = Router();

// Prevent someone from hammering STK push and spamming a customer's phone with prompts.
const stkLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: { error: 'Too many payment attempts. Please wait a minute.' } });

router.post('/stk-push', stkLimiter, startStkPush);       // POST /api/payments/stk-push
router.post('/mpesa-callback', handleMpesaCallback);       // POST /api/payments/mpesa-callback (Safaricom calls this)

export default router;
