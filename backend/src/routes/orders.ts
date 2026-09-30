import { Router } from 'express';
import { createOrder, getOrderStatus } from '../controllers/orderController';
import { optionalCustomer } from '../middleware/customerAuth';

const router = Router();

router.post('/', optionalCustomer, createOrder);  // POST /api/orders
router.get('/:id/status', getOrderStatus);         // GET /api/orders/:id/status

export default router;
