import { Router } from 'express';
import {
  createBooking,
  cancelBooking,
  getBookingById,
  getMyBookings,
  confirmBooking,
} from '../controllers/booking.controller';
import { authenticate, optionalAuth } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { bookingLimiter } from '../middlewares/rateLimiter';
import { RoleName } from '../interfaces';
import {
  idParamSchema,
  createBookingSchema,
  cancelBookingSchema,
} from '../validators/schemas';

const router = Router();

// POST /bookings (user or guest)
router.post(
  '/',
  bookingLimiter,
  optionalAuth,
  validate(createBookingSchema),
  createBooking
);

// GET /bookings/:id
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  getBookingById
);

// POST /bookings/:id/cancel
router.post(
  '/:id/cancel',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(cancelBookingSchema),
  cancelBooking
);

// PUT /bookings/:id/confirm (admin)
router.put(
  '/:id/confirm',
  authenticate,
  validate(idParamSchema, 'params'),
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN, RoleName.STAFF] }),
  confirmBooking
);

// GET /me/bookings - this route is handled separately
router.get(
  '/me/list',
  authenticate,
  getMyBookings
);

export default router;
