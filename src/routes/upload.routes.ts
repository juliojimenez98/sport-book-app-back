import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { RoleName } from "../interfaces";
import { uploadImage, getAsset } from "../controllers/upload.controller";

const router = Router();

// Configure Multer to store files in memory as Buffers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB Limit
  },
  fileFilter: (req, file, cb) => {
    // Basic image validation
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

// POST /api/upload/image (requires Authentication & Admin roles)
router.post(
  "/image",
  authenticate,
  authorize({
    roles: [RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN, RoleName.BRANCH_ADMIN],
  }),
  upload.single("image"),
  uploadImage,
);

export default router;
