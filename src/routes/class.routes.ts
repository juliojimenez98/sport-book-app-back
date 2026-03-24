import { Router } from "express";
import {
  getClassesByBranch,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  enrollInClass,
  cancelEnrollment,
  getClassEnrollments,
  getMyEnrollments,
  createRecurringClasses,
} from "../controllers/class.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { RoleName } from "../interfaces";
import {
  idParamSchema,
  branchIdParamSchema,
  createClassSchema,
  updateClassSchema,
  createRecurringClassesSchema,
} from "../validators/schemas";

const router = Router();

// ============ BRANCH-SCOPED PUBLIC ROUTES ============

// GET /branches/:branchId/classes  (public)
router.get(
  "/branches/:branchId/classes",
  validate(branchIdParamSchema, "params"),
  getClassesByBranch,
);

// POST /branches/:branchId/classes  (branch admin+)
router.post(
  "/branches/:branchId/classes",
  authenticate,
  validate(branchIdParamSchema, "params"),
  validate(createClassSchema),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  createClass,
);

// POST /branches/:branchId/classes/bulk  (branch admin+) — recurring classes
router.post(
  "/branches/:branchId/classes/bulk",
  authenticate,
  validate(branchIdParamSchema, "params"),
  validate(createRecurringClassesSchema),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
    branchScope: true,
  }),
  createRecurringClasses,
);

// ============ CLASS-SCOPED ROUTES ============

// GET /classes/:id  (public)
router.get("/:id", validate(idParamSchema, "params"), getClassById);

// PUT /classes/:id  (branch admin+)
router.put(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  validate(updateClassSchema),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
  }),
  updateClass,
);

// DELETE /classes/:id  (branch admin+)
router.delete(
  "/:id",
  authenticate,
  validate(idParamSchema, "params"),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
  }),
  deleteClass,
);

// GET /classes/:id/enrollments  (branch admin+)
router.get(
  "/:id/enrollments",
  authenticate,
  validate(idParamSchema, "params"),
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN, RoleName.STAFF],
  }),
  getClassEnrollments,
);

// POST /classes/:id/enroll  (authenticated client)
router.post(
  "/:id/enroll",
  authenticate,
  validate(idParamSchema, "params"),
  enrollInClass,
);

// DELETE /classes/:id/enroll  (authenticated client)
router.delete(
  "/:id/enroll",
  authenticate,
  validate(idParamSchema, "params"),
  cancelEnrollment,
);

// GET /me/enrollments  (authenticated client) – mounted differently in app.ts
// Exported separately for use in user routes
export { getMyEnrollments };
export default router;
