import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin, requirePermission } from '../middleware/auth';
import { adminLogin, getDashboard, getMe, changeMyPassword } from '../controllers/adminController';
import {
  listAdminProducts, createProduct, updateProduct, deactivateProduct, bulkStockTake, getAdminProductDetail,
} from '../controllers/productController';
import {
  listAdminOrders, getAdminOrderDetail, updateOrderStatus, deleteOrder,
} from '../controllers/orderController';
import {
  listDiscountCodes, createDiscountCode, updateDiscountCode,
} from '../controllers/discountController';
import { getSalesReport } from '../controllers/reportsController';
import { listAdminUsers, createAdminUser, updateAdminUser } from '../controllers/usersController';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts. Try again later.' } });

router.post('/login', loginLimiter, adminLogin);              // public, rate-limited

router.use(requireAdmin); // everything below needs a valid, active account

// Any signed-in admin (this is also all a "must change password" account may use)
router.get('/me', getMe);
router.put('/me/password', changeMyPassword);

// Every route below also needs the specific permission. See config/permissions.ts
router.get('/dashboard', requirePermission('dashboard:view'), getDashboard);

router.get('/products', requirePermission('products:view'), listAdminProducts);
router.get('/products/:id/detail', requirePermission('reports:view'), getAdminProductDetail);
router.post('/products', requirePermission('products:edit'), createProduct);
router.put('/products/stock-take', requirePermission('stock:adjust'), bulkStockTake); // must stay above /products/:id
router.put('/products/:id', requirePermission('products:edit'), updateProduct);
router.delete('/products/:id', requirePermission('products:deactivate'), deactivateProduct); // soft delete

router.get('/orders', requirePermission('orders:view'), listAdminOrders);
router.get('/orders/:id', requirePermission('orders:view'), getAdminOrderDetail);
router.put('/orders/:id', requirePermission('orders:update_status'), updateOrderStatus);
router.delete('/orders/:id', requirePermission('orders:delete'), deleteOrder);

router.get('/discount-codes', requirePermission('discounts:manage'), listDiscountCodes);
router.post('/discount-codes', requirePermission('discounts:manage'), createDiscountCode);
router.put('/discount-codes/:id', requirePermission('discounts:manage'), updateDiscountCode);

router.get('/reports/sales', requirePermission('reports:view'), getSalesReport);

router.get('/users', requirePermission('users:manage'), listAdminUsers);
router.post('/users', requirePermission('users:manage'), createAdminUser);
router.put('/users/:id', requirePermission('users:manage'), updateAdminUser);

export default router;
