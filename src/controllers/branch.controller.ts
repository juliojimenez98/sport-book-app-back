import { Request, Response, NextFunction } from "express";
import {
  Branch,
  Tenant,
  BranchSport,
  Sport,
  BranchHours,
  Resource,
  BlockedSlot,
  Booking,
  UserRole,
  AppUser,
  BranchImage,
} from "../models/associations";
import { AuthenticatedRequest } from "../interfaces";
import { notFound, badRequest, forbidden } from "../middlewares/errorHandler";
import {
  hasAccessToTenant,
  getAccessibleTenantIds,
  getAccessibleBranchIds,
  hasAccessToBranch,
} from "../middlewares/authorize";
import { generateSlug } from "../helpers/utils";
import { CreateBranchInput, UpdateBranchInput } from "../validators/schemas";
import { Op } from "sequelize";

// GET /tenants/:tenantId/branches
export const getBranchesByTenant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Verify tenant exists
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw notFound("Tenant not found");
    }

    const { count, rows: branches } = await Branch.findAndCountAll({
      where: { tenantId: parseInt(tenantId as string) },
      limit,
      offset,
      order: [["name", "ASC"]],
      include: [
        {
          model: Sport,
          as: "sports",
          through: { attributes: [] },
        },
        {
          model: BranchImage,
          as: "images",
        },
      ],
    });

    res.json({
      success: true,
      data: branches,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /branches (all accessible branches)
export const getAllBranches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const accessibleTenantIds = getAccessibleTenantIds(req);
    const accessibleBranchIds = getAccessibleBranchIds(req);

    let whereClause: Record<string, unknown> = {};

    if (accessibleBranchIds !== null) {
      whereClause.branchId = accessibleBranchIds;
    }
    if (accessibleTenantIds !== null) {
      whereClause.tenantId = accessibleTenantIds;
    }

    const { count, rows: branches } = await Branch.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["name", "ASC"]],
      include: [
        {
          model: Tenant,
          as: "tenant",
          attributes: ["tenantId", "name", "slug"],
        },
        {
          model: Sport,
          as: "sports",
          through: { attributes: [] },
        },
        {
          model: BranchImage,
          as: "images",
        },
      ],
    });

    res.json({
      success: true,
      data: branches,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /branches/:id
export const getBranchById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const branch = await Branch.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: "tenant",
          attributes: ["tenantId", "name", "slug"],
        },
        {
          model: Sport,
          as: "sports",
          through: { attributes: [] },
        },
        {
          model: BranchHours,
          as: "branchHours",
        },
        {
          model: Resource,
          as: "resources",
          where: { isActive: true },
          required: false,
        },
        {
          model: BranchImage,
          as: "images",
        },
      ],
    });

    if (!branch) {
      throw notFound("Branch not found");
    }

    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// POST /tenants/:tenantId/branches
export const createBranch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { name, slug, address, phone, email, timezone, comunaId, regionId } =
      req.body as CreateBranchInput;

    // Verify tenant exists
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw notFound("Tenant not found");
    }

    // Check access
    if (!hasAccessToTenant(req, parseInt(tenantId))) {
      throw forbidden("Access denied to this tenant");
    }

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(name);

    // Check if slug already exists for this tenant
    const existingBranch = await Branch.findOne({
      where: { tenantId: parseInt(tenantId), slug: finalSlug },
    });
    if (existingBranch) {
      throw badRequest("Branch with this slug already exists for this tenant");
    }

    const branch = await Branch.create({
      tenantId: parseInt(tenantId),
      name,
      slug: finalSlug,
      address,
      phone,
      email,
      timezone: timezone || "America/Santiago",
      comunaId,
      regionId,
    });

    // Create default branch hours (Mon-Sat 8:00-22:00, Sun closed)
    const defaultHours = [
      {
        branchId: branch.branchId,
        dayOfWeek: 0,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: true,
      }, // Sunday
      {
        branchId: branch.branchId,
        dayOfWeek: 1,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        branchId: branch.branchId,
        dayOfWeek: 2,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        branchId: branch.branchId,
        dayOfWeek: 3,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        branchId: branch.branchId,
        dayOfWeek: 4,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        branchId: branch.branchId,
        dayOfWeek: 5,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        branchId: branch.branchId,
        dayOfWeek: 6,
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
    ];
    await BranchHours.bulkCreate(defaultHours);

    // Guardar Galería de Imágenes si se proveyó
    if (req.body.images && Array.isArray(req.body.images)) {
      const imagesPayload = req.body.images.map((url: string, index: number) => ({
        branchId: branch.branchId,
        imageUrl: url,
        isPrimary: index === 0, // Definir la primera imagen como portada
      }));
      await BranchImage.bulkCreate(imagesPayload);
    }

    res.status(201).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /branches/:id
export const updateBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateBranchInput;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      throw notFound("Branch not found");
    }

    await branch.update(updateData);

    // Actualizar Galería de Imágenes si se proveyó el array
    if (req.body.images && Array.isArray(req.body.images)) {
      // Eliminar las imágenes anteriores
      await BranchImage.destroy({ where: { branchId: branch.branchId } });
      
      // Insertar las nuevas
      const imagesPayload = req.body.images.map((url: string, index: number) => ({
        branchId: branch.branchId,
        imageUrl: url,
        isPrimary: index === 0,
      }));
      await BranchImage.bulkCreate(imagesPayload);
    }

    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /branches/:id
export const deleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      throw notFound("Branch not found");
    }

    // Soft delete by deactivating
    await branch.update({ isActive: false });

    res.json({
      success: true,
      message: "Branch deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// POST /branches/:branchId/sports
export const addSportToBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const { sportId } = req.body;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    const sport = await Sport.findByPk(sportId);
    if (!sport) {
      throw notFound("Sport not found");
    }

    // Check if already exists
    const existing = await BranchSport.findOne({
      where: { branchId: parseInt(branchId), sportId },
    });
    if (existing) {
      throw badRequest("Sport already added to this branch");
    }

    await BranchSport.create({
      branchId: parseInt(branchId),
      sportId,
    });

    res.status(201).json({
      success: true,
      message: "Sport added to branch successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET /branches/:branchId/sports
export const getBranchSports = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    const branchSports = await BranchSport.findAll({
      where: { branchId: parseInt(branchId), isActive: true },
      include: [
        {
          model: Sport,
          as: "sport",
        },
      ],
    });

    const sports = branchSports.map(
      (bs) => (bs as BranchSport & { sport: Sport }).sport,
    );

    res.json({
      success: true,
      data: sports,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /branches/:branchId/sports/:sportId
export const removeSportFromBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId, sportId } = req.params;

    const branchSport = await BranchSport.findOne({
      where: { branchId: parseInt(branchId), sportId: parseInt(sportId) },
    });

    if (!branchSport) {
      throw notFound("Sport not found for this branch");
    }

    await branchSport.update({ isActive: false });

    res.json({
      success: true,
      message: "Sport removed from branch successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ========== BRANCH HOURS ENDPOINTS ==========

// GET /branches/:branchId/hours
export const getBranchHours = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    const hours = await BranchHours.findAll({
      where: { branchId: parseInt(branchId) },
      order: [["dayOfWeek", "ASC"]],
    });

    res.json({
      success: true,
      data: hours,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /branches/:branchId/hours
export const updateBranchHours = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const { hours } = req.body;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    if (!Array.isArray(hours) || hours.length === 0) {
      throw badRequest("Hours array is required");
    }

    // Validate each entry
    for (const h of hours) {
      if (h.dayOfWeek < 0 || h.dayOfWeek > 6) {
        throw badRequest(`Invalid day of week: ${h.dayOfWeek}`);
      }
      if (!h.isClosed && (!h.openTime || !h.closeTime)) {
        throw badRequest(
          `Open and close times required for day ${h.dayOfWeek}`,
        );
      }
    }

    // Upsert all hours
    for (const h of hours) {
      const [record] = await BranchHours.findOrCreate({
        where: { branchId: parseInt(branchId), dayOfWeek: h.dayOfWeek },
        defaults: {
          branchId: parseInt(branchId),
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime || "08:00",
          closeTime: h.closeTime || "22:00",
          isClosed: h.isClosed || false,
        },
      });

      await record.update({
        openTime: h.openTime || "08:00",
        closeTime: h.closeTime || "22:00",
        isClosed: h.isClosed || false,
      });
    }

    // Return updated hours
    const updatedHours = await BranchHours.findAll({
      where: { branchId: parseInt(branchId) },
      order: [["dayOfWeek", "ASC"]],
    });

    res.json({
      success: true,
      data: updatedHours,
    });
  } catch (error) {
    next(error);
  }
};

// ========== BLOCKED SLOTS ENDPOINTS ==========

// GET /branches/:branchId/blocked-slots
export const getBlockedSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const { from, to } = req.query;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    const whereClause: any = { branchId: parseInt(branchId) };

    if (from) {
      whereClause.date = { ...whereClause.date, [Op.gte]: from as string };
    }
    if (to) {
      whereClause.date = { ...whereClause.date, [Op.lte]: to as string };
    }

    const blockedSlots = await BlockedSlot.findAll({
      where: whereClause,
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
      ],
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name"],
        },
      ],
    });

    res.json({
      success: true,
      data: blockedSlots,
    });
  } catch (error) {
    next(error);
  }
};

// POST /branches/:branchId/blocked-slots
export const createBlockedSlot = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const { date, startTime, endTime, reason, resourceId } = req.body;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    if (!date || !startTime || !endTime) {
      throw badRequest("Date, start time and end time are required");
    }

    // Validate resource belongs to this branch if specified
    if (resourceId) {
      const resource = await Resource.findByPk(resourceId);
      if (!resource || resource.branchId !== parseInt(branchId)) {
        throw badRequest("Resource does not belong to this branch");
      }
    }

    const blockedSlot = await BlockedSlot.create({
      branchId: parseInt(branchId),
      resourceId: resourceId || null,
      date,
      startTime,
      endTime,
      reason,
      createdBy: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      data: blockedSlot,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /branches/:branchId/blocked-slots/:id
export const deleteBlockedSlot = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId, id } = req.params;

    const blockedSlot = await BlockedSlot.findOne({
      where: { blockedSlotId: parseInt(id), branchId: parseInt(branchId) },
    });

    if (!blockedSlot) {
      throw notFound("Blocked slot not found");
    }

    await blockedSlot.destroy();

    res.json({
      success: true,
      message: "Blocked slot deleted",
    });
  } catch (error) {
    next(error);
  }
};

// GET /branches/:branchId/dashboard-stats
export const getBranchDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    if (!hasAccessToBranch(req, parseInt(branchId), branch.tenantId)) {
      throw forbidden("Access denied to this branch");
    }

    // Resources
    const totalResources = await Resource.count({
      where: { branchId: parseInt(branchId) },
    });

    const activeResources = await Resource.count({
      where: { branchId: parseInt(branchId), isActive: true },
    });

    // Today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await Booking.count({
      where: {
        branchId: parseInt(branchId),
        startAt: { [Op.gte]: today, [Op.lt]: tomorrow },
        status: { [Op.notIn]: ["cancelled", "rejected"] },
      },
    });

    const pendingBookings = await Booking.count({
      where: {
        branchId: parseInt(branchId),
        startAt: { [Op.gte]: today },
        status: "pending",
      },
    });

    // Monthly bookings
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = await Booking.count({
      where: {
        branchId: parseInt(branchId),
        startAt: { [Op.gte]: firstOfMonth },
        status: { [Op.notIn]: ["cancelled", "rejected"] },
      },
    });

    // Upcoming bookings (next 10)
    const upcomingBookings = await Booking.findAll({
      where: {
        branchId: parseInt(branchId),
        startAt: { [Op.gte]: new Date() },
        status: { [Op.in]: ["confirmed", "pending"] },
      },
      order: [["startAt", "ASC"]],
      limit: 10,
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name"],
        },
        {
          model: AppUser,
          as: "user",
          attributes: ["userId", "email", "firstName", "lastName", "phone"],
        },
      ],
    });

    // Chart data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const bookingsLast30Days = await Booking.findAll({
      where: {
        branchId: parseInt(branchId),
        startAt: { [Op.gte]: thirtyDaysAgo },
        status: { [Op.notIn]: ["cancelled", "rejected", "no_show"] },
      },
      attributes: ["startAt", "totalPrice"],
    });

    const chartMap = new Map<string, { date: string; bookings: number; revenue: number }>();
    
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        chartMap.set(dateStr, { date: dateStr, bookings: 0, revenue: 0 });
    }

    bookingsLast30Days.forEach(b => {
        const dateStr = new Date(b.startAt).toISOString().split('T')[0];
        if (chartMap.has(dateStr)) {
            const entry = chartMap.get(dateStr)!;
            entry.bookings += 1;
            entry.revenue += Number(b.totalPrice || 0);
        }
    });

    const bookingsChart = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate Occupancy (simplified for today)
    const occupancyRate = totalResources > 0 ? Math.round((todayBookings / (totalResources * 10)) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalResources,
          activeResources,
          todayBookings,
          pendingBookings,
          monthlyBookings,
          occupancyRate: occupancyRate > 100 ? 100 : occupancyRate,
        },
        upcomingBookings,
        bookingsChart,
      },
    });
  } catch (error) {
    next(error);
  }
};

