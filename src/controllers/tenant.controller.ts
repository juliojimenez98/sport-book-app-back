import { Request, Response, NextFunction } from "express";
import { Tenant, Branch, TenantImage } from "../models/associations";
import { AuthenticatedRequest } from "../interfaces";
import { notFound, badRequest } from "../middlewares/errorHandler";
import { getAccessibleTenantIds } from "../middlewares/authorize";
import { generateSlug } from "../helpers/utils";
import { CreateTenantInput, UpdateTenantInput } from "../validators/schemas";

// Add these imports for the dashboard stats
import {
  Resource,
  Booking,
  UserRole,
  AppUser,
  Role,
} from "../models/associations";
import { Op } from "sequelize";

// GET /tenants
export const getAllTenants = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get accessible tenants based on user role
    const accessibleTenantIds = getAccessibleTenantIds(req);

    const whereClause = accessibleTenantIds
      ? { tenantId: accessibleTenantIds }
      : {};

    const { count, rows: tenants } = await Tenant.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: TenantImage,
          as: "images",
        },
      ],
    });

    res.json({
      success: true,
      data: tenants,
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

// GET /tenants/:id
export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findByPk(id, {
      include: [
        {
          model: Branch,
          as: "branches",
          where: { isActive: true },
          required: false,
        },
        {
          model: TenantImage,
          as: "images",
        },
      ],
    });

    if (!tenant) {
      throw notFound("Tenant not found");
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// POST /tenants
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, slug, email, phone, logoUrl } = req.body as CreateTenantInput;

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(name);

    // Check if slug already exists
    const existingTenant = await Tenant.findOne({ where: { slug: finalSlug } });
    if (existingTenant) {
      throw badRequest("Tenant with this slug already exists");
    }

    const tenant = await Tenant.create({
      name,
      slug: finalSlug,
      email,
      phone,
      logoUrl,
    });

    if (req.body.images && Array.isArray(req.body.images)) {
      const imagesPayload = req.body.images.map((url: string, index: number) => ({
        tenantId: tenant.tenantId,
        imageUrl: url,
        isPrimary: index === 0,
      }));
      await TenantImage.bulkCreate(imagesPayload);
    }

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /tenants/:id
export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateTenantInput;

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      throw notFound("Tenant not found");
    }

    // If slug is being updated, check for duplicates
    if (updateData.slug && updateData.slug !== tenant.slug) {
      const existingTenant = await Tenant.findOne({
        where: { slug: updateData.slug },
      });
      if (existingTenant) {
        throw badRequest("Tenant with this slug already exists");
      }
    }

    await tenant.update(updateData);

    if (req.body.images && Array.isArray(req.body.images)) {
      await TenantImage.destroy({ where: { tenantId: tenant.tenantId } });
      const imagesPayload = req.body.images.map((url: string, index: number) => ({
        tenantId: tenant.tenantId,
        imageUrl: url,
        isPrimary: index === 0,
      }));
      await TenantImage.bulkCreate(imagesPayload);
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /tenants/:id
export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      throw notFound("Tenant not found");
    }

    // Soft delete by deactivating
    await tenant.update({ isActive: false });

    res.json({
      success: true,
      message: "Tenant deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET /tenants/:id/dashboard-stats
export const getTenantDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      throw notFound("Tenant not found");
    }

    // Get branches for this tenant
    const branches = await Branch.findAll({
      where: { tenantId: parseInt(id) },
      include: [
        {
          model: Resource,
          as: "resources",
          required: false,
        },
      ],
    });

    const branchIds = branches.map((b) => b.branchId);
    const activeBranches = branches.filter((b) => b.isActive);

    // Count total resources (canchas)
    const totalResources = await Resource.count({
      where: { branchId: { [Op.in]: branchIds } },
    });

    const activeResources = await Resource.count({
      where: { branchId: { [Op.in]: branchIds }, isActive: true },
    });

    // Get today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await Booking.count({
      where: {
        tenantId: parseInt(id),
        startAt: { [Op.gte]: today, [Op.lt]: tomorrow },
      },
    });

    const pendingBookings = await Booking.count({
      where: {
        tenantId: parseInt(id),
        startAt: { [Op.gte]: today, [Op.lt]: tomorrow },
        status: "pending",
      },
    });

    // Get total bookings this month
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = await Booking.count({
      where: {
        tenantId: parseInt(id),
        startAt: { [Op.gte]: firstOfMonth },
      },
    });

    // Revenue: sum of totalPrice for confirmed/completed bookings
    // totalPrice already reflects the final price after any discount
    const confirmedStatuses = ["confirmed", "completed"];

    const monthlyRevenueResult = await Booking.findAll({
      where: {
        tenantId: parseInt(id),
        startAt: { [Op.gte]: firstOfMonth },
        status: { [Op.in]: confirmedStatuses },
      },
      attributes: ["totalPrice"],
    });
    const totalRevenueMonth = monthlyRevenueResult.reduce(
      (sum, b) => sum + Number(b.totalPrice || 0),
      0,
    );

    const allTimeRevenueResult = await Booking.findAll({
      where: {
        tenantId: parseInt(id),
        status: { [Op.in]: confirmedStatuses },
      },
      attributes: ["totalPrice"],
    });
    const totalRevenueAllTime = allTimeRevenueResult.reduce(
      (sum, b) => sum + Number(b.totalPrice || 0),
      0,
    );

    // Get staff/users count - users with roles in this tenant
    const tenantUserRoles = await UserRole.findAll({
      where: {
        [Op.or]: [
          { tenantId: parseInt(id) },
          { branchId: { [Op.in]: branchIds } },
        ],
      },
      attributes: ["userId"],
    });
    const uniqueUserIds = [...new Set(tenantUserRoles.map((ur) => ur.userId))];
    const staffCount = uniqueUserIds.length;

    // Get pending bookings list (limit 10)
    const pendingBookingsList = await Booking.findAll({
      where: {
        tenantId: parseInt(id),
        status: "pending",
      },
      order: [["createdAt", "ASC"]], // Oldest first
      limit: 10,
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["branchId", "name"],
        },
        {
          model: AppUser,
          as: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });

    // Get bookings chart data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const bookingsLast30Days = await Booking.findAll({
      where: {
        tenantId: parseInt(id),
        startAt: { [Op.gte]: thirtyDaysAgo },
        status: { [Op.notIn]: ["cancelled", "rejected", "no_show"] },
      },
      attributes: ["startAt", "totalPrice"],
    });

    // Group by date
    const chartMap = new Map<string, { date: string; bookings: number; revenue: number }>();
    
    // Initialize map with all dates
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

    // Get recent bookings with details
    const recentBookings = await Booking.findAll({
      where: { tenantId: parseInt(id) },
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["branchId", "name"],
        },
        {
          model: AppUser,
          as: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });

    // Get users with their roles in this tenant
    const usersWithRoles = await UserRole.findAll({
      where: {
        [Op.or]: [
          { tenantId: parseInt(id) },
          { branchId: { [Op.in]: branchIds } },
        ],
      },
      include: [
        {
          model: AppUser,
          as: "user",
          attributes: [
            "userId",
            "email",
            "firstName",
            "lastName",
            "phone",
            "isActive",
          ],
        },
        {
          model: Role,
          as: "role",
          attributes: ["roleId", "name"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["branchId", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Group users with their roles
    const usersMap = new Map<number, any>();
    for (const ur of usersWithRoles) {
      const userRoleData = ur as UserRole & {
        user: AppUser;
        role: Role;
        branch: Branch | null;
      };
      const userId = userRoleData.userId;
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userRoleData.user.userId,
          email: userRoleData.user.email,
          firstName: (userRoleData.user as any).firstName,
          lastName: (userRoleData.user as any).lastName,
          phone: (userRoleData.user as any).phone,
          isActive: (userRoleData.user as any).isActive,
          roles: [],
        });
      }
      usersMap.get(userId).roles.push({
        roleId: userRoleData.roleId,
        roleName: userRoleData.role?.name,
        scope: userRoleData.scope,
        branchId: userRoleData.branchId,
        branchName: userRoleData.branch?.name || null,
      });
    }

    const tenantUsers = Array.from(usersMap.values());

    // Branch summary
    const branchSummary = branches.map((b) => ({
      id: b.branchId,
      name: b.name,
      isActive: b.isActive,
      resourceCount:
        (b as Branch & { resources: Resource[] }).resources?.length || 0,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalBranches: branches.length,
          activeBranches: activeBranches.length,
          totalResources,
          activeResources,
          todayBookings,
          pendingBookings,
          monthlyBookings,
          staffCount,
          totalRevenueMonth: parseFloat(totalRevenueMonth.toFixed(2)),
          totalRevenueAllTime: parseFloat(totalRevenueAllTime.toFixed(2)),
        },
        recentBookings,
        branchSummary,
        tenantUsers,
        pendingBookingsList,
        bookingsChart,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /tenants/stats/super-admin-dashboard
export const getSuperAdminDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Count tenants
    const totalTenants = await Tenant.count();
    const activeTenants = await Tenant.count({ where: { isActive: true } });

    // Count branches
    const totalBranches = await Branch.count();
    const activeBranches = await Branch.count({ where: { isActive: true } });

    // Count resources
    const totalResources = await Resource.count();
    const activeResources = await Resource.count({ where: { isActive: true } });

    // Count users
    const totalUsers = await AppUser.count();

    // Today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await Booking.count({
      where: {
        startAt: { [Op.gte]: today, [Op.lt]: tomorrow },
      },
    });

    const pendingBookingsToday = await Booking.count({
      where: {
        startAt: { [Op.gte]: today, [Op.lt]: tomorrow },
        status: "pending",
      },
    });

    // Monthly bookings
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = await Booking.count({
      where: {
        startAt: { [Op.gte]: firstOfMonth },
      },
    });

    // Total bookings ever
    const totalBookings = await Booking.count();

    // Recent tenants (last 5)
    const recentTenants = await Tenant.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: Branch,
          as: "branches",
          attributes: ["branchId", "name", "isActive"],
        },
      ],
    });

    // Recent bookings (last 5)
    const recentBookings = await Booking.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name"],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["branchId", "name"],
          include: [
            {
              model: Tenant,
              as: "tenant",
              attributes: ["tenantId", "name"],
            },
          ],
        },
        {
          model: AppUser,
          as: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activeTenants,
          totalBranches,
          activeBranches,
          totalResources,
          activeResources,
          totalUsers,
          todayBookings,
          pendingBookingsToday,
          monthlyBookings,
          totalBookings,
        },
        recentTenants,
        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};
