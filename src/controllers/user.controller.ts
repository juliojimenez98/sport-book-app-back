import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import {
  AppUser,
  UserRole,
  Role,
  Tenant,
  Branch,
} from "../models/associations";
import { AuthenticatedRequest, RoleName, RoleScope } from "../interfaces";
import { notFound, badRequest, forbidden } from "../middlewares/errorHandler";
import { hasAccessToTenant, hasAccessToBranch } from "../middlewares/authorize";

// GET /users (admin only)
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Filters
    const search = req.query.search as string;
    const tenantId = req.query.tenantId as string;
    const branchId = req.query.branchId as string;
    const roleId = req.query.roleId as string;
    const roleName = req.query.roleName as string;

    // Build user where clause
    const userWhere: any = {};
    if (search) {
      userWhere[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Build userRole where clause for filtering
    const userRoleWhere: any = {};
    if (tenantId) {
      userRoleWhere.tenantId = parseInt(tenantId);
    }
    if (branchId) {
      userRoleWhere.branchId = parseInt(branchId);
    }
    if (roleId) {
      userRoleWhere.roleId = parseInt(roleId);
    }

    // Build role where clause
    const roleWhere: any = {};
    if (roleName) {
      roleWhere.name = roleName;
    }

    // If filtering by tenant/branch/role, we need to filter users that have matching roles
    const hasRoleFilters = tenantId || branchId || roleId || roleName;

    let userIds: number[] | undefined;
    if (hasRoleFilters) {
      // First get user IDs that match the role filters
      const matchingUserRoles = await UserRole.findAll({
        attributes: ["userId"],
        where:
          Object.keys(userRoleWhere).length > 0 ? userRoleWhere : undefined,
        include: roleName
          ? [
              {
                model: Role,
                as: "role",
                where: roleWhere,
                attributes: [],
              },
            ]
          : undefined,
      });
      userIds = [...new Set(matchingUserRoles.map((ur) => ur.userId))];

      // If no users match the filters, return empty
      if (userIds.length === 0) {
        res.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
        return;
      }

      userWhere.id = { [Op.in]: userIds };
    }

    const { count, rows: users } = await AppUser.findAndCountAll({
      attributes: { exclude: ["passwordHash"] },
      where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
      include: [
        {
          model: UserRole,
          as: "userRoles",
          include: [
            {
              model: Role,
              as: "role",
            },
            {
              model: Tenant,
              as: "tenant",
              attributes: ["id", "name", "slug"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["id", "name", "slug"],
              include: [
                {
                  model: Tenant,
                  as: "tenant",
                  attributes: ["id", "name", "slug"],
                },
              ],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      data: users,
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

// GET /users/:id
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await AppUser.findByPk(id, {
      attributes: { exclude: ["passwordHash"] },
      include: [
        {
          model: UserRole,
          as: "userRoles",
          include: [
            {
              model: Role,
              as: "role",
            },
            {
              model: Tenant,
              as: "tenant",
              attributes: ["id", "name"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!user) {
      throw notFound("User not found");
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// POST /users/:userId/roles
export const assignRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { roleId, scope, tenantId, branchId } = req.body;

    // Verify user exists
    const user = await AppUser.findByPk(userId);
    if (!user) {
      throw notFound("User not found");
    }

    // Verify role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      throw notFound("Role not found");
    }

    // Validate scope requirements
    if (role.name === RoleName.SUPER_ADMIN && scope !== RoleScope.GLOBAL) {
      throw badRequest("super_admin role requires global scope");
    }
    if (role.name === RoleName.TENANT_ADMIN && scope !== RoleScope.TENANT) {
      throw badRequest("tenant_admin role requires tenant scope");
    }
    if (
      (role.name === RoleName.BRANCH_ADMIN || role.name === RoleName.STAFF) &&
      scope !== RoleScope.BRANCH
    ) {
      throw badRequest("branch_admin/staff roles require branch scope");
    }

    // Validate tenant/branch access for non-super_admin assigning roles
    if (scope === RoleScope.TENANT && tenantId) {
      if (!hasAccessToTenant(req, tenantId)) {
        throw forbidden("Access denied to this tenant");
      }
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        throw notFound("Tenant not found");
      }
    }

    if (scope === RoleScope.BRANCH && branchId) {
      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        throw notFound("Branch not found");
      }
      if (!hasAccessToBranch(req, branchId, branch.tenantId)) {
        throw forbidden("Access denied to this branch");
      }
    }

    // Check if role already exists
    const existingRole = await UserRole.findOne({
      where: {
        userId: parseInt(userId),
        roleId,
        tenantId: tenantId || null,
        branchId: branchId || null,
      },
    });

    if (existingRole) {
      throw badRequest("User already has this role");
    }

    // Create user role
    const userRole = await UserRole.create({
      userId: parseInt(userId),
      roleId,
      scope,
      tenantId:
        scope === RoleScope.TENANT || scope === RoleScope.BRANCH
          ? tenantId
          : undefined,
      branchId: scope === RoleScope.BRANCH ? branchId : undefined,
    });

    res.status(201).json({
      success: true,
      data: userRole,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /users/:userId/roles/:roleId
export const removeRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, roleId } = req.params;
    const { tenantId, branchId } = req.query;

    const userRole = await UserRole.findOne({
      where: {
        userId: parseInt(userId),
        roleId: parseInt(roleId),
        ...(tenantId && { tenantId: parseInt(tenantId as string) }),
        ...(branchId && { branchId: parseInt(branchId as string) }),
      },
      include: [{ model: Role, as: "role" }],
    });

    if (!userRole) {
      throw notFound("User role not found");
    }

    // Check permissions
    if (userRole.tenantId && !hasAccessToTenant(req, userRole.tenantId)) {
      throw forbidden("Access denied");
    }

    await userRole.destroy();

    res.json({
      success: true,
      message: "Role removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET /roles
export const getAllRoles = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roles = await Role.findAll({
      order: [["id", "ASC"]],
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};
