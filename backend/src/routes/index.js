import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import * as products from '../controllers/productController.js';
import * as ai from '../controllers/aiController.js';
import * as inventory from '../controllers/inventoryController.js';
import { summary } from '../controllers/dashboardController.js';
import { requireManager } from '../middleware/requireManager.js';

const router = Router();

router.get('/health', getHealth);
router.get('/dashboard', summary);

router.get('/filters', products.filters);
router.get('/products', products.list);
router.get('/products/:id', products.get);

router.post('/ai/recommendations', ai.recommendProducts);
router.post('/ai/policy-question', ai.policyQuestion);
router.get('/policies', ai.policies);
router.post('/policies/ingest', requireManager, ai.ingest);

router.get('/inventory/proposals', inventory.list);
router.post('/inventory/proposals', inventory.create);
router.post('/inventory/proposals/:id/approve', requireManager, inventory.decide('approve'));
router.post('/inventory/proposals/:id/reject', requireManager, inventory.decide('reject'));
router.get('/inventory/audit', inventory.audit);

export default router;
