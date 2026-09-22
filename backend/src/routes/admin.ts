import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../middleware/auth';
import { adminLogin, getDashboard } from '../controllers/adminController';
import {
  listAdminProducts, createProduct, updateProduct, deactivateProduct, bulkStockTake, getAdminProductDetail,
} from '../controllers/productController';
import {
  listAdminOrders, getAdminOrderDetail, updateOrderStatus,
} from '../controllers/orderController';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts. Try again later.' } });

router.post('/login', loginLimiter, adminLogin);              // POST /api/admin/login (public, rate-limited)

router.use(requireAdmin); // everything below requires a valid JWT

router.get('/dashboard', getDashboard);

router.get('/products', listAdminProducts);
router.get('/products/:id/detail', getAdminProductDetail);
router.post('/products', createProduct);
router.put('/products/stock-take', bulkStockTake);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deactivateProduct);            // soft delete (deactivate)

router.get('/orders', listAdminOrders);
router.get('/orders/:id', getAdminOrderDetail);
router.put('/orders/:id', updateOrderStatus);

export default router;
