import { Router } from 'express';
import { createOrder, getOrderStatus } from '../controllers/orderController';

const router = Router();

router.post('/', createOrder);                  // POST /api/orders
router.get('/:id/status', getOrderStatus);       // GET /api/orders/:id/status

export default router;
