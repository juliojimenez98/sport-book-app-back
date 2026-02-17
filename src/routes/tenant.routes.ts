import { Router } from 'express';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} from '../controllers/tenant.controller';
import {
  getBranchesByTenant,
  createBranch,
} from '../controllers/branch.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { RoleName } from '../interfaces';
import {
  createTenantSchema,
  updateTenantSchema,
  idParamSchema,
  tenantIdParamSchema,
  createBranchSchema,
} from '../validators/schemas';

const router = Router();

// All tenant routes require authentication
router.use(authenticate);

// GET /tenants
router.get(
  '/',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  getAllTenants
);

// POST /tenants (super_admin only)
router.post(
  '/',
  authorize({ roles: [RoleName.SUPER_ADMIN] }),
  validate(createTenantSchema),
  createTenant
);

// GET /tenants/:id
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN], tenantScope: true }),
  getTenantById
);

// PUT /tenants/:id (super_admin only)
router.put(
  '/:id',
  authorize({ roles: [RoleName.SUPER_ADMIN] }),
  validate(idParamSchema, 'params'),
  validate(updateTenantSchema),
  updateTenant
);

// DELETE /tenants/:id (super_admin only)
router.delete(
  '/:id',
  authorize({ roles: [RoleName.SUPER_ADMIN] }),
  validate(idParamSchema, 'params'),
  deleteTenant
);

// ========== TENANT BRANCHES ROUTES ==========

// GET /tenants/:tenantId/branches
router.get(
  '/:tenantId/branches',
  validate(tenantIdParamSchema, 'params'),
  authorize({ tenantScope: true }),
  getBranchesByTenant
);

// POST /tenants/:tenantId/branches
router.post(
  '/:tenantId/branches',
  validate(tenantIdParamSchema, 'params'),
  validate(createBranchSchema),
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN], tenantScope: true }),
  createBranch
);

export default router;
