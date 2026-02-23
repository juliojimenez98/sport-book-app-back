import { Router, Request, Response, NextFunction } from "express";
import {
  Tenant,
  Branch,
  Sport,
  Resource,
  BranchSport,
  BranchImage,
  ResourceImage,
} from "../models/associations";
import chileLocations from "../data/chile-locations.json";
import { getAsset } from "../controllers/upload.controller";

const router = Router();

// GET /public/assets - Dynamic HTTP Presigned URL Redirection for S3
router.get("/assets", getAsset);

// GET /public/tenants - List all active tenants with their branches
router.get(
  "/tenants",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenants = await Tenant.findAll({
        where: { isActive: true },
        attributes: [
          "tenantId",
          "name",
          "slug",
          "email",
          "phone",
          "logoUrl",
          "primaryColor",
          "secondaryColor",
          "accentColor",
        ],
        include: [
          {
            model: Branch,
            as: "branches",
            where: { isActive: true },
            required: false,
            attributes: ["branchId", "name", "slug", "address", "phone"],
          },
        ],
        order: [["name", "ASC"]],
      });

      res.json({
        success: true,
        data: tenants,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /public/tenants/:slug - Get a tenant by slug
router.get(
  "/tenants/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      const tenant = await Tenant.findOne({
        where: { slug, isActive: true },
        attributes: [
          "tenantId",
          "name",
          "slug",
          "email",
          "phone",
          "logoUrl",
          "primaryColor",
          "secondaryColor",
          "accentColor",
        ],
        include: [
          {
            model: Branch,
            as: "branches",
            where: { isActive: true },
            required: false,
            attributes: [
              "branchId",
              "name",
              "slug",
              "address",
              "phone",
              "hasParking",
              "hasBathrooms",
              "hasShowers",
              "hasLockers",
              "hasWifi",
              "hasCafeteria",
              "hasEquipmentRental",
              "amenitiesDescription",
            ],
            include: [
              {
                model: BranchImage,
                as: "images",
                attributes: ["imageUrl", "isPrimary"],
              },
            ],
          },
        ],
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /public/tenants/:tenantSlug/branches/:branchSlug - Get branch by slugs
router.get(
  "/tenants/:tenantSlug/branches/:branchSlug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantSlug, branchSlug } = req.params;

      const tenant = await Tenant.findOne({
        where: { slug: tenantSlug, isActive: true },
        attributes: [
          "tenantId",
          "name",
          "slug",
          "primaryColor",
          "secondaryColor",
          "accentColor",
        ],
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      const branch = await Branch.findOne({
        where: { slug: branchSlug, tenantId: tenant.tenantId, isActive: true },
        attributes: [
          "branchId",
          "name",
          "slug",
          "address",
          "phone",
          "hasParking",
          "hasBathrooms",
          "hasShowers",
          "hasLockers",
          "hasWifi",
          "hasCafeteria",
          "hasEquipmentRental",
          "amenitiesDescription",
        ],
        include: [
          {
            model: BranchImage,
            as: "images",
            attributes: ["imageUrl", "isPrimary"],
          },
          {
            model: Resource,
            as: "resources",
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Sport,
                as: "sport",
                attributes: ["sportId", "name"],
              },
              {
                model: ResourceImage,
                as: "images",
                attributes: ["imageUrl", "isPrimary"],
              },
            ],
          },
        ],
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Sucursal no encontrada",
        });
      }

      res.json({
        success: true,
        data: {
          tenant,
          branch,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /public/locations - Chile regions and communes
router.get(
  "/locations",
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: chileLocations,
    });
  },
);

// GET /public/branches - List all active branches with tenant info
router.get(
  "/branches",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comunaId, regionId, sportId } = req.query;

      const branchWhere: Record<string, unknown> = { isActive: true };
      if (comunaId) branchWhere.comunaId = comunaId as string;
      if (regionId) branchWhere.regionId = regionId as string;

      // Build includes
      const includes: any[] = [
        {
          model: Tenant,
          as: "tenant",
          where: { isActive: true },
          attributes: [
            "tenantId",
            "name",
            "slug",
            "primaryColor",
            "secondaryColor",
            "accentColor",
          ],
        },
        {
          model: Sport,
          as: "sports",
          through: { attributes: [] },
          ...(sportId ? { where: { sportId: parseInt(sportId as string) } } : {}),
        },
        {
          model: BranchImage,
          as: "images",
          attributes: ["imageUrl", "isPrimary"],
        },
      ];

      const branches = await Branch.findAll({
        where: branchWhere,
        include: includes,
        order: [
          ["tenant", "name", "ASC"],
          ["name", "ASC"],
        ],
      });

      res.json({
        success: true,
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /public/sports - List all active sports
router.get(
  "/sports",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sports = await Sport.findAll({
        where: { isActive: true },
        order: [["name", "ASC"]],
      });

      res.json({
        success: true,
        data: sports,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /public/branches/:branchId/resources - List resources for a branch
router.get(
  "/branches/:branchId/resources",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { branchId } = req.params;

      const resources = await Resource.findAll({
        where: {
          branchId: parseInt(branchId, 10),
          isActive: true,
        },
        include: [
          {
            model: Sport,
            as: "sport",
            attributes: ["sportId", "name"],
          },
          {
            model: Branch,
            as: "branch",
            attributes: ["branchId", "name", "slug"],
            include: [
              {
                model: Tenant,
                as: "tenant",
                attributes: [
                  "tenantId",
                  "name",
                  "slug",
                  "primaryColor",
                  "secondaryColor",
                  "accentColor",
                ],
              },
            ],
          },
          {
            model: ResourceImage,
            as: "images",
            attributes: ["imageUrl", "isPrimary"],
          },
        ],
        order: [["name", "ASC"]],
      });

      res.json({
        success: true,
        data: resources,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /public/resources/:id - Get a single resource
router.get(
  "/resources/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const resource = await Resource.findOne({
        where: {
          resourceId: parseInt(id, 10),
          isActive: true,
        },
        include: [
          {
            model: Sport,
            as: "sport",
            attributes: ["sportId", "name"],
          },
          {
            model: Branch,
            as: "branch",
            attributes: [
              "branchId",
              "name",
              "slug",
              "address",
              "phone",
              "hasParking",
              "hasBathrooms",
              "hasShowers",
              "hasLockers",
              "hasWifi",
              "hasCafeteria",
              "hasEquipmentRental",
              "amenitiesDescription",
              "requiresApproval",
            ],
            include: [
              {
                model: Tenant,
                as: "tenant",
                attributes: [
                  "tenantId",
                  "name",
                  "slug",
                  "primaryColor",
                  "secondaryColor",
                  "accentColor",
                ],
              },
            ],
          },
          {
            model: ResourceImage,
            as: "images",
            attributes: ["imageUrl", "isPrimary"],
          },
        ],
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      res.json({
        success: true,
        data: resource,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
