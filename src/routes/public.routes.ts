import { Router, Request, Response, NextFunction } from "express";
import { DiscountType, DiscountConditionType } from "../interfaces";
import { Op } from "sequelize";
import {
  Tenant,
  Branch,
  Sport,
  Resource,
  BranchSport,
  BranchImage,
  ResourceImage,
  Discount,
  Booking,
} from "../models/associations";
import SurveyResponse from "../models/SurveyResponse"; // Added SurveyResponse import
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

      const branchWhere: any = { isActive: true };
      if (comunaId) branchWhere.comunaId = comunaId as string;
      if (regionId) branchWhere.regionId = regionId as string;

      if (sportId) {
        // Find branches that offer this sport
        const branchSports = await BranchSport.findAll({
          where: { sportId: parseInt(sportId as string) },
          attributes: ["branchId"],
        });
        const branchIds = branchSports.map((bs) => bs.branchId);
        branchWhere.branchId = { [Op.in]: branchIds };
      }

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

// POST /public/discounts/calculate - Calculate total price with discounts preview
router.post(
  "/discounts/calculate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, tenantId, branchId, resourceId, startAt, endAt } = req.body;

      if (!tenantId || !resourceId || !startAt || !endAt) {
        return res.status(400).json({
          success: false,
          message: "Faltan parámetros para calcular el precio",
        });
      }

      const resource = await Resource.findByPk(resourceId);
      if (!resource) {
        return res.status(404).json({ success: false, message: "Cancha no encontrada" });
      }

      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      // calculate base price
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const originalPrice = Number(resource.pricePerHour) * diffHours;
      let totalPrice = originalPrice;
      let appliedDiscount = null;

      // Check Promo Code
      let discount = null;
      if (code) {
        discount = await Discount.findOne({
          where: {
            code,
            tenantId,
            isActive: true,
            conditionType: DiscountConditionType.PROMO_CODE,
          },
          include: [{ model: Resource, as: "resources", attributes: ["resourceId"] }]
        });
        if (discount) {
          const d = discount as any;
          if (d.branchId && d.branchId !== branchId) discount = null;
          else if (d.resources && d.resources.length > 0 && !d.resources.some((r: any) => r.resourceId === resourceId)) discount = null;
        }
      }

      // Check Time Based
      if (!discount) {
        const timeDiscounts = await Discount.findAll({
          where: {
            tenantId,
            isActive: true,
            conditionType: DiscountConditionType.TIME_BASED,
          },
          include: [{ model: Resource, as: "resources", attributes: ["resourceId"] }]
        });

        // The frontend sends `YYYY-MM-DDTHH:mm:00`
        // Parse date objectively to avoid timezone shift on the server
        const datePart = startAt.split('T')[0]; // YYYY-MM-DD
        const timePart = startAt.split('T')[1]; // HH:mm:00
        
        // Construct a Date object at noon UTC to safely get the correct weekday regardless of server timezone
        const safeDate = new Date(`${datePart}T12:00:00Z`);
        const dayOfWeek = safeDate.getUTCDay();
        const startHourStr = timePart;

        for (const d of timeDiscounts) {
          let applies = true;
          if (d.branchId && d.branchId !== branchId) applies = false;
          const resources = (d as any).resources || [];
          if (applies && resources.length > 0 && !resources.some((r: any) => r.resourceId === resourceId)) applies = false;
          if (applies && d.daysOfWeek && d.daysOfWeek.length > 0) {
            if (!d.daysOfWeek.includes(dayOfWeek)) applies = false;
          }
          if (applies && d.startTime && d.endTime) {
            if (startHourStr < d.startTime || startHourStr >= d.endTime) applies = false;
          }
          if (applies) {
            discount = d;
            break;
          }
        }
      }

      // Apply logic
      if (discount) {
        appliedDiscount = discount;
        const value = Number(discount.value);
        if (discount.type === DiscountType.PERCENTAGE) {
          totalPrice = originalPrice - (originalPrice * (value / 100));
        } else if (discount.type === DiscountType.FIXED_AMOUNT) {
          totalPrice = originalPrice - value;
        }
        if (totalPrice < 0) totalPrice = 0;
      }

      res.json({
        success: true,
        data: {
          originalPrice,
          totalPrice,
          discount: appliedDiscount
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /public/discounts/validate - Validate a promo code
router.post(
  "/discounts/validate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, tenantId, branchId, resourceId } = req.body;

      if (!code || !tenantId) {
        return res.status(400).json({
          success: false,
          message: "El código y tenantId son requeridos",
        });
      }

      const discount = await Discount.findOne({
        where: {
          code,
          tenantId,
          isActive: true,
          conditionType: DiscountConditionType.PROMO_CODE,
        },
        include: [{ model: Resource, as: "resources", attributes: ["resourceId"] }]
      });

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: "Código de descuento inválido o expirado",
        });
      }

      // Validate constraints
      if (discount.branchId && branchId && discount.branchId !== branchId) {
        return res.status(400).json({
          success: false,
          message: "Este código no es válido para esta sucursal",
        });
      }

      const resources = (discount as any).resources || [];
      if (resources.length > 0 && !resources.some((r: any) => r.resourceId === resourceId)) {
        return res.status(400).json({
          success: false,
          message: "Este código no es válido para esta cancha",
        });
      }

      res.json({
        success: true,
        data: discount,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /public/surveys/submit - Submit a post-booking survey
router.post(
  "/surveys/submit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        bookingId, 
        resourceCondition,
        amenitiesRating,
        attentionRating,
        punctualityRating,
        comments 
      } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "Se requiere el ID de la reserva (bookingId).",
        });
      }

      // Check if booking exists
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Reserva no encontrada.",
        });
      }

      // Check if already surveyed
      const existing = await SurveyResponse.findOne({ where: { bookingId } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Esta reserva ya cuenta con una encuesta registrada.",
        });
      }

      const survey = await SurveyResponse.create({
        bookingId,
        resourceCondition: resourceCondition || 5,
        amenitiesRating: amenitiesRating || 5,
        attentionRating: attentionRating || 5,
        punctualityRating: punctualityRating || 5,
        comments,
      });

      res.status(201).json({
        success: true,
        data: survey,
        message: "Encuesta enviada con éxito.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
