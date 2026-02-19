import { Router } from "express";
import {
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  addSportToBranch,
  getBranchSports,
  removeSportFromBranch,
  getBranchHours,
  updateBranchHours,
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
} from "../controllers/branch.controller";
import { getBranchBookings } from "../controllers/booking.controller";
import {
  getResourcesByBranch,
  createResource,
} from "../controllers/resource.controller";
import { authenticate, optionalAuth } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { RoleName } from "../interfaces";
import {
  idParamSchema,
  branchIdParamSchema,
  updateBranchSchema,
  addBranchSportSchema,
  createResourceSchema,
} from "../validators/schemas";

const router = Router();

// GET /branches (all accessible branches - requires auth)
router.get("/", authenticate, getAllBranches);

// GET /branches/:id (public)
router.get("/:id", validate(idParamSchema, "params"), getBranchById);

// PUT /branches/:id
router.put(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateBranchSchema),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  updateBranch,
);

// DELETE /branches/:id
router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  authorize({ roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN] }),
  deleteBranch,
);

// ========== BRANCH SPORTS ROUTES ==========

// GET /branches/:branchId/sports (public)
router.get(
  "/:branchId/sports",
  validate(branchIdParamSchema, "params"),
  getBranchSports,
);

// POST /branches/:branchId/sports
router.post(
  "/:branchId/sports",
  authenticate,
  validate(branchIdParamSchema, "params"),
  validate(addBranchSportSchema),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  addSportToBranch,
);

// DELETE /branches/:branchId/sports/:sportId
router.delete(
  "/:branchId/sports/:sportId",
  authenticate,
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  removeSportFromBranch,
);

// ========== BRANCH RESOURCES ROUTES ==========

// GET /branches/:branchId/resources (public)
router.get(
  "/:branchId/resources",
  validate(branchIdParamSchema, "params"),
  getResourcesByBranch,
);

// POST /branches/:branchId/resources
router.post(
  "/:branchId/resources",
  authenticate,
  validate(branchIdParamSchema, "params"),
  validate(createResourceSchema),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  createResource,
);

// ========== BRANCH BOOKINGS ROUTES (admin) ==========

// GET /branches/:branchId/bookings
router.get(
  "/:branchId/bookings",
  authenticate,
  validate(branchIdParamSchema, "params"),
  authorize({
    roles: [
      RoleName.SUPER_ADMIN,
      RoleName.TENANT_ADMIN,
      RoleName.BRANCH_ADMIN,
      RoleName.STAFF,
    ],
    branchScope: true,
  }),
  getBranchBookings,
);

// ========== BRANCH HOURS ROUTES ==========

// GET /branches/:branchId/hours (public - for booking UI)
router.get(
  "/:branchId/hours",
  validate(branchIdParamSchema, "params"),
  getBranchHours,
);

// PUT /branches/:branchId/hours (admin)
router.put(
  "/:branchId/hours",
  authenticate,
  validate(branchIdParamSchema, "params"),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  updateBranchHours,
);

// ========== BLOCKED SLOTS ROUTES ==========

// GET /branches/:branchId/blocked-slots
router.get(
  "/:branchId/blocked-slots",
  authenticate,
  validate(branchIdParamSchema, "params"),
  authorize({
    roles: [
      RoleName.SUPER_ADMIN,
      RoleName.TENANT_ADMIN,
      RoleName.BRANCH_ADMIN,
      RoleName.STAFF,
    ],
    branchScope: true,
  }),
  getBlockedSlots,
);

// POST /branches/:branchId/blocked-slots
router.post(
  "/:branchId/blocked-slots",
  authenticate,
  validate(branchIdParamSchema, "params"),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  createBlockedSlot,
);

// DELETE /branches/:branchId/blocked-slots/:id
router.delete(
  "/:branchId/blocked-slots/:id",
  authenticate,
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  deleteBlockedSlot,
);

export default router;
