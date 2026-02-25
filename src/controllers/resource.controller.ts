import { Request, Response, NextFunction } from "express";
import {
  Resource,
  Branch,
  Tenant,
  Sport,
  Booking,
  BlockedSlot,
  Discount,
  DiscountResource,
  ResourceImage,
} from "../models/associations";
import { AuthenticatedRequest, BookingStatus, DiscountConditionType } from "../interfaces";
import { notFound, badRequest, forbidden } from "../middlewares/errorHandler";
import { hasAccessToBranch } from "../middlewares/authorize";
import {
  CreateResourceInput,
  UpdateResourceInput,
} from "../validators/schemas";
import { Op } from "sequelize";

// GET /branches/:branchId/resources
export const getResourcesByBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const { sportId } = req.query;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    const whereClause: Record<string, unknown> = {
      branchId: parseInt(branchId),
      isActive: true,
    };

    if (sportId) {
      whereClause.sportId = parseInt(sportId as string);
    }

    const resources = await Resource.findAll({
      where: whereClause,
      order: [["name", "ASC"]],
      include: [
        {
          model: Sport,
          as: "sport",
          attributes: ["sportId", "name", "iconUrl"],
        },
        {
          model: ResourceImage,
          as: "images",
        },
      ],
    });

    res.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

// GET /resources/:id
export const getResourceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const resource = await Resource.findByPk(id, {
      include: [
        {
          model: Branch,
          as: "branch",
          attributes: ["branchId", "name", "tenantId", "timezone"],
        },
        {
          model: Sport,
          as: "sport",
          attributes: ["sportId", "name", "iconUrl"],
        },
        {
          model: ResourceImage,
          as: "images",
        },
      ],
    });

    if (!resource) {
      throw notFound("Resource not found");
    }

    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// POST /branches/:branchId/resources
export const createResource = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const { sportId, name, description, pricePerHour, currency } =
      req.body as CreateResourceInput;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    // Check access
    if (!hasAccessToBranch(req, parseInt(branchId), branch.tenantId)) {
      throw forbidden("Access denied to this branch");
    }

    // Verify sport exists
    const sport = await Sport.findByPk(sportId);
    if (!sport) {
      throw notFound("Sport not found");
    }

    // Check if resource name already exists for this branch
    const existingResource = await Resource.findOne({
      where: { branchId: parseInt(branchId), name },
    });
    if (existingResource) {
      throw badRequest(
        "Resource with this name already exists for this branch",
      );
    }

    const resource = await Resource.create({
      branchId: parseInt(branchId),
      sportId,
      name,
      description,
      pricePerHour,
      currency: currency || "MXN",
    });

    if (req.body.images && Array.isArray(req.body.images)) {
      const imagesPayload = req.body.images.map((url: string, index: number) => ({
        resourceId: resource.resourceId,
        imageUrl: url,
        isPrimary: index === 0,
      }));
      await ResourceImage.bulkCreate(imagesPayload);
    }

    res.status(201).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /resources/:id
export const updateResource = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateResourceInput;

    const resource = await Resource.findByPk(id, {
      include: [{ model: Branch, as: "branch" }],
    });

    if (!resource) {
      throw notFound("Resource not found");
    }

    const branch = (resource as Resource & { branch: Branch }).branch;
    if (!hasAccessToBranch(req, resource.branchId, branch.tenantId)) {
      throw forbidden("Access denied to this resource");
    }

    await resource.update(updateData);

    if (req.body.images && Array.isArray(req.body.images)) {
      await ResourceImage.destroy({ where: { resourceId: resource.resourceId } });
      const imagesPayload = req.body.images.map((url: string, index: number) => ({
        resourceId: resource.resourceId,
        imageUrl: url,
        isPrimary: index === 0,
      }));
      await ResourceImage.bulkCreate(imagesPayload);
    }

    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /resources/:id
export const deleteResource = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const resource = await Resource.findByPk(id, {
      include: [{ model: Branch, as: "branch" }],
    });

    if (!resource) {
      throw notFound("Resource not found");
    }

    const branch = (resource as Resource & { branch: Branch }).branch;
    if (!hasAccessToBranch(req, resource.branchId, branch.tenantId)) {
      throw forbidden("Access denied to this resource");
    }

    // Soft delete
    await resource.update({ isActive: false });

    res.json({
      success: true,
      message: "Resource deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET /resources/:resourceId/calendar
export const getResourceCalendar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { resourceId } = req.params;
    const { from, to } = req.query;

    const resource = await Resource.findByPk(resourceId, {
      include: [
        { model: Branch, as: "branch", include: [{ model: Tenant, as: "tenant" }] }
      ],
    });
    if (!resource) {
      throw notFound("Resource not found");
    }

    // Default to today + 7 days if not provided
    const fromDate = from ? new Date(from as string) : new Date();
    const toDate = to
      ? new Date(to as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Extend toDate to end of day (UTC) to include all bookings within the day
    toDate.setUTCHours(23, 59, 59, 999);

    // Get all bookings for this resource in the date range (overlap logic)
    const bookings = await Booking.findAll({
      where: {
        resourceId: parseInt(resourceId),
        status: {
          [Op.in]: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
        startAt: {
          [Op.lt]: toDate,
        },
        endAt: {
          [Op.gt]: fromDate,
        },
      },
      order: [["startAt", "ASC"]],
      attributes: ["bookingId", "startAt", "endAt", "status", "userId"],
    });

    // Get blocked slots for the branch (global + resource-specific)
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = toDate.toISOString().split("T")[0];
    const blockedSlots = await BlockedSlot.findAll({
      where: {
        branchId: resource.branchId,
        date: { [Op.between]: [fromStr, toStr] },
        [Op.or]: [{ resourceId: null }, { resourceId: parseInt(resourceId) }],
      },
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    // Get active time-based discounts for this resource, branch, or tenant
    const discounts = await Discount.findAll({
      where: {
        isActive: true,
        conditionType: DiscountConditionType.TIME_BASED,
        [Op.or]: [
          { branchId: (resource as any).branchId } as any,
          { tenantId: (resource as any).branch.tenantId, branchId: null } as any,
        ],
      },
    });

    // Filter discounts to only include those that either:
    // 1. Are linked specifically to this resource
    // 2. Are branch/tenant wide (no entries in DiscountResource)
    const applicableDiscounts = await Promise.all(
      discounts.map(async (d) => {
        const count = await DiscountResource.count({
          where: { discountId: d.discountId },
        });
        // If count is 0, it's a branch/tenant wide discount
        if (count === 0) return d;
        
        // If count > 0, check if this specific resource is linked
        const isLinked = await DiscountResource.findOne({
          where: { discountId: d.discountId, resourceId: parseInt(resourceId) }
        });
        return isLinked ? d : null;
      })
    ).then(results => results.filter((d): d is Discount => d !== null));

    res.json({
      success: true,
      data: {
        resourceId: resource.resourceId,
        resourceName: resource.name,
        from: fromDate,
        to: toDate,
        bookings: bookings.map((b) => ({
          id: b.bookingId,
          startAt: b.startAt,
          endAt: b.endAt,
          status: b.status,
          userId: b.userId,
        })),
        blockedSlots: blockedSlots.map((bs) => ({
          date: bs.date,
          startTime: bs.startTime,
          endTime: bs.endTime,
        })),
        discounts: applicableDiscounts.map((d) => ({
          discountId: d.discountId,
          name: d.name,
          type: d.type,
          value: d.value,
          daysOfWeek: d.daysOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
