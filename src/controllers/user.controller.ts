import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import {
  AppUser,
  UserRole,
  Role,
  Tenant,
  Branch,
} from "../models/associations";
import { AuthenticatedRequest, RoleName, RoleScope, RoleScopeType } from "../interfaces";

import { notFound, badRequest, forbidden } from "../middlewares/errorHandler";
import { hasAccessToTenant, hasAccessToBranch } from "../middlewares/authorize";
import { hashPassword } from "../helpers/password";
import {
  generateVerificationToken,
  buildVerificationUrl,
  generatePasswordResetToken,
  buildPasswordResetUrl,
} from "../helpers/verificationToken";
import { sendPasswordResetEmailOrThrow } from "../services/email.service";

import { CreateUserInput } from "../validators/schemas";


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

      userWhere.userId = { [Op.in]: userIds };
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
              attributes: ["tenantId", "name", "slug"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["branchId", "name", "slug"],
              include: [
                {
                  model: Tenant,
                  as: "tenant",
                  attributes: ["tenantId", "name", "slug"],
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
              attributes: ["tenantId", "name"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["branchId", "name"],
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
      order: [["roleId", "ASC"]],
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

// POST /users (tenant-admin creates a user)
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, firstName, lastName, phone, branchId } = req.body as CreateUserInput;
    const actor = req.user!;

    // Determine the tenant this admin manages
    const tenantRole = actor.roles.find(
      (r) => r.roleName === RoleName.TENANT_ADMIN || r.roleName === RoleName.SUPER_ADMIN,
    );
    if (!tenantRole) throw forbidden("No tienes permisos para crear usuarios");

    // Only SUPER_ADMIN can omit tenantId
    const adminTenantId = tenantRole.tenantId ?? null;
    if (tenantRole.roleName === RoleName.TENANT_ADMIN && !adminTenantId) {
      throw forbidden("No se encontró el tenant del administrador");
    }

    // If assigning branch-admin, validate the branch belongs to this tenant
    if (branchId) {
      const branch = await Branch.findByPk(branchId);
      if (!branch) throw notFound("Sucursal no encontrada");
      if (adminTenantId && branch.tenantId !== adminTenantId) {
        throw forbidden("Esa sucursal no pertenece a tu tenant");
      }
    }

    // Check email uniqueness
    const existing = await AppUser.findOne({ where: { email } });
    if (existing) throw badRequest("El email ya está registrado");

    // Generate a secure random temporary password (8 characters)
    const tempPassword = Math.random().toString(36).slice(-8) + Date.now().toString(36).slice(-2);
    const passwordHash = await hashPassword(tempPassword);

    // Create user — inactive until they set their password via the invitation link
    const user = await AppUser.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      isActive: false,
    });

    // Generate password reset token & invitation URL
    const token = generatePasswordResetToken(user.userId, user.email);
    const resetUrl = buildPasswordResetUrl(token);
    const invitedBy = actor.email;

    // Send invitation email (which is technically a setup password email) — rollback on failure
    try {
      await sendPasswordResetEmailOrThrow({
        email: user.email,
        firstName: user.firstName,
        resetUrl,
        isInvitation: true,
        invitedBy,
        tempPassword,
      });
    } catch (emailError) {
      await user.destroy();
      console.error(`[createUser] Email failed for ${email}, user rolled back:`, emailError);
      res.status(503).json({
        success: false,
        message: "No se pudo enviar el email de invitación. Intenta de nuevo.",
      });
      return;
    }

    // Assign roles
    const rolesToCreate: Array<{
      userId: number;
      roleId: number;
      scope: RoleScopeType;
      tenantId?: number;
      branchId?: number;
    }> = [];


    if (branchId) {
      // Assign branch-admin for the specified branch
      const branchAdminRole = await Role.findOne({ where: { name: RoleName.BRANCH_ADMIN } });
      if (branchAdminRole) {
        const branch = await Branch.findByPk(branchId);
        rolesToCreate.push({
          userId: user.userId,
          roleId: branchAdminRole.roleId,
          scope: RoleScope.BRANCH,
          tenantId: branch!.tenantId,
          branchId,
        });
      }
    } else {
      // Default: assign 'cliente' role for regular users created by admin
      const clienteRole = await Role.findOne({ where: { name: RoleName.CLIENTE } });
      if (clienteRole) {
        rolesToCreate.push({
          userId: user.userId,
          roleId: clienteRole.roleId,
          scope: RoleScope.GLOBAL,
        });
      }
    }

    if (rolesToCreate.length > 0) {
      await UserRole.bulkCreate(rolesToCreate);
    }

    res.status(201).json({
      success: true,
      message: `Usuario creado exitosamente. Se envió un email de invitación a ${email}.`,
      data: {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        assignedRole: branchId ? RoleName.BRANCH_ADMIN : RoleName.CLIENTE,
      },
    });
  } catch (error) {
    next(error);
  }
};
