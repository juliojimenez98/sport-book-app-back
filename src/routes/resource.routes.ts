import { Router } from 'express';
import {
  getResourceById,
  updateResource,
  deleteResource,
  getResourceCalendar,
} from '../controllers/resource.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { RoleName } from '../interfaces';
import {
  idParamSchema,
  resourceIdParamSchema,
  updateResourceSchema,
} from '../validators/schemas';

const router = Router();

// GET /resources/:id (public)
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  getResourceById
);

// PUT /resources/:id
router.put(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(updateResourceSchema),
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN] }),
  updateResource
);

// DELETE /resources/:id
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN] }),
  deleteResource
);

// GET /resources/:resourceId/calendar (public)
router.get(
  '/:resourceId/calendar',
  validate(resourceIdParamSchema, 'params'),
  getResourceCalendar
);

export default router;
