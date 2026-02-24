import { Router } from "express";
import { authorize } from "../middlewares/authorize";
import { authenticate } from "../middlewares/authenticate";
import { RoleScope, RoleName } from "../interfaces";
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from "../controllers/discount.controller";

const router = Router();

// Only authenticated users with TENANT_ADMIN and BRANCH_ADMIN can manage discounts
router.use(authenticate);
router.use(authorize({
  roles: [RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN, RoleName.SUPER_ADMIN],
  tenantScope: true, // Inject req.tenantId / req.branchId
}));

router.get("/", getDiscounts);
router.post("/", createDiscount);
router.put("/:id", updateDiscount);
router.delete("/:id", deleteDiscount);

export default router;
