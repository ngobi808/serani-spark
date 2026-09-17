import { Router } from 'express';
import { listPublicProducts, getPublicProduct } from '../controllers/productController';

const router = Router();

router.get('/', listPublicProducts);       // GET /api/products?q=&category=
router.get('/:id', getPublicProduct);      // GET /api/products/:id

export default router;
