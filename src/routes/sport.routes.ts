import { Router } from 'express';
import {
  getAllSports,
  getSportById,
  createSport,
  updateSport,
  deleteSport,
} from '../controllers/sport.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { RoleName } from '../interfaces';
import {
  idParamSchema,
  createSportSchema,
  updateSportSchema,
} from '../validators/schemas';

const router = Router();

// GET /sports (public)
router.get('/', getAllSports);

// GET /sports/:id (public)
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  getSportById
);

// POST /sports (super_admin only)
router.post(
  '/',
  authenticate,
  authorize({ roles: [RoleName.SUPER_ADMIN] }),
  validate(createSportSchema),
  createSport
);

// PUT /sports/:id (super_admin only)
router.put(
  '/:id',
  authenticate,
  authorize({ roles: [RoleName.SUPER_ADMIN] }),
  validate(idParamSchema, 'params'),
  validate(updateSportSchema),
  updateSport
);

// DELETE /sports/:id (super_admin only)
router.delete(
  '/:id',
  authenticate,
  authorize({ roles: [RoleName.SUPER_ADMIN] }),
  validate(idParamSchema, 'params'),
  deleteSport
);

export default router;
