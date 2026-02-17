import { Router, Request, Response, NextFunction } from "express";
import {
  Tenant,
  Branch,
  Sport,
  Resource,
  BranchSport,
} from "../models/associations";

const router = Router();

// GET /public/tenants - List all active tenants with their branches
router.get(
  "/tenants",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenants = await Tenant.findAll({
        where: { isActive: true },
        attributes: [
          "id",
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
            attributes: ["id", "name", "slug", "address", "phone"],
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
          "id",
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
              "id",
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
          "id",
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
        where: { slug: branchSlug, tenantId: tenant.id, isActive: true },
        attributes: [
          "id",
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
            model: Resource,
            as: "resources",
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Sport,
                as: "sport",
                attributes: ["id", "name"],
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

// GET /public/branches - List all active branches with tenant info
router.get(
  "/branches",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const branches = await Branch.findAll({
        where: { isActive: true },
        include: [
          {
            model: Tenant,
            as: "tenant",
            where: { isActive: true },
            attributes: [
              "id",
              "name",
              "slug",
              "primaryColor",
              "secondaryColor",
              "accentColor",
            ],
          },
        ],
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
            attributes: ["id", "name"],
          },
          {
            model: Branch,
            as: "branch",
            attributes: ["id", "name", "slug"],
            include: [
              {
                model: Tenant,
                as: "tenant",
                attributes: [
                  "id",
                  "name",
                  "slug",
                  "primaryColor",
                  "secondaryColor",
                  "accentColor",
                ],
              },
            ],
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
          id: parseInt(id, 10),
          isActive: true,
        },
        include: [
          {
            model: Sport,
            as: "sport",
            attributes: ["id", "name"],
          },
          {
            model: Branch,
            as: "branch",
            attributes: [
              "id",
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
                model: Tenant,
                as: "tenant",
                attributes: [
                  "id",
                  "name",
                  "slug",
                  "primaryColor",
                  "secondaryColor",
                  "accentColor",
                ],
              },
            ],
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
