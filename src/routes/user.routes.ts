import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  assignRole,
  removeRole,
  getAllRoles,
  createUser,
} from '../controllers/user.controller';

import { getMyBookings } from '../controllers/booking.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { RoleName } from '../interfaces';
import { assignRoleSchema, createUserSchema } from '../validators/schemas';


const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /users/me/bookings
router.get(
  '/me/bookings',
  getMyBookings
);

// GET /users/roles
router.get(
  '/roles',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  getAllRoles
);

// GET /users
router.get(
  '/',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  getAllUsers
);

// POST /users (tenant-admin creates a user)
router.post(
  '/',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  validate(createUserSchema),
  createUser
);

// GET /users/:id
router.get(
  '/:id',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  getUserById
);

// POST /users/:userId/roles
router.post(
  '/:userId/roles',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  validate(assignRoleSchema),
  assignRole
);

// DELETE /users/:userId/roles/:roleId
router.delete(
  '/:userId/roles/:roleId',
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  removeRole
);

export default router;
