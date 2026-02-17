import { Request, Response, NextFunction } from "express";
import { AppUser, Role, UserRole, RefreshToken } from "../models/associations";
import {
  hashPassword,
  comparePassword,
  hashToken,
  compareToken,
} from "../helpers/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from "../helpers/jwt";
import {
  AuthenticatedRequest,
  TokenPayload,
  UserRoleInfo,
  RoleName,
  RoleScope,
} from "../interfaces";
import {
  badRequest,
  unauthorized,
  notFound,
} from "../middlewares/errorHandler";
import { RegisterInput, LoginInput } from "../validators/schemas";

// POST /auth/register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } =
      req.body as RegisterInput;

    // Check if email already exists
    const existingUser = await AppUser.findOne({ where: { email } });
    if (existingUser) {
      throw badRequest("Email already registered");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await AppUser.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    // Find user with roles
    const user = await AppUser.findOne({
      where: { email },
      include: [
        {
          model: UserRole,
          as: "userRoles",
          include: [
            {
              model: Role,
              as: "role",
            },
          ],
        },
      ],
    });

    if (!user) {
      throw unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      throw unauthorized("Account is deactivated");
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw unauthorized("Invalid email or password");
    }

    // Build roles array
    const userRoles =
      (user as AppUser & { userRoles: Array<UserRole & { role: Role }> })
        .userRoles || [];
    const roles: UserRoleInfo[] = userRoles.map((ur) => ({
      roleId: ur.roleId,
      roleName: ur.role.name,
      scope: ur.scope,
      tenantId: ur.tenantId,
      branchId: ur.branchId,
    }));

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token hash
    const tokenHash = await hashToken(refreshToken);
    await RefreshToken.create({
      userId: user.id,
      tokenHash,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isActive: user.isActive,
          roles,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/refresh
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw badRequest("Refresh token is required");
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw unauthorized("Invalid or expired refresh token");
    }

    // Find user
    const user = await AppUser.findByPk(decoded.userId, {
      include: [
        {
          model: UserRole,
          as: "userRoles",
          include: [
            {
              model: Role,
              as: "role",
            },
          ],
        },
      ],
    });

    if (!user || !user.isActive) {
      throw unauthorized("User not found or deactivated");
    }

    // Find and validate stored refresh token
    const storedTokens = await RefreshToken.findAll({
      where: { userId: user.id, revokedAt: null as unknown as undefined },
    });

    let validStoredToken: RefreshToken | null = null;
    for (const storedToken of storedTokens) {
      if (
        storedToken.isValid() &&
        (await compareToken(refreshToken, storedToken.tokenHash))
      ) {
        validStoredToken = storedToken;
        break;
      }
    }

    if (!validStoredToken) {
      throw unauthorized("Invalid refresh token");
    }

    // Revoke old refresh token (rotation)
    await validStoredToken.update({ revokedAt: new Date() });

    // Build roles array
    const userRoles =
      (user as AppUser & { userRoles: Array<UserRole & { role: Role }> })
        .userRoles || [];
    const roles: UserRoleInfo[] = userRoles.map((ur) => ({
      roleId: ur.roleId,
      roleName: ur.role.name,
      scope: ur.scope,
      tenantId: ur.tenantId,
      branchId: ur.branchId,
    }));

    // Generate new tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roles,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Store new refresh token
    const newTokenHash = await hashToken(newRefreshToken);
    await RefreshToken.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/logout
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken && req.user) {
      // Find and revoke the specific refresh token
      const storedTokens = await RefreshToken.findAll({
        where: {
          userId: req.user.userId,
          revokedAt: null as unknown as undefined,
        },
      });

      for (const storedToken of storedTokens) {
        if (await compareToken(refreshToken, storedToken.tokenHash)) {
          await storedToken.update({ revokedAt: new Date() });
          break;
        }
      }
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET /auth/me
export const me = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw unauthorized("Not authenticated");
    }

    const user = await AppUser.findByPk(req.user.userId, {
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
          ],
        },
      ],
    });

    if (!user) {
      throw notFound("User not found");
    }

    const userRoles =
      (user as AppUser & { userRoles: Array<UserRole & { role: Role }> })
        .userRoles || [];
    const roles: UserRoleInfo[] = userRoles.map((ur) => ({
      roleId: ur.roleId,
      roleName: ur.role.name,
      scope: ur.scope,
      tenantId: ur.tenantId,
      branchId: ur.branchId,
    }));

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        roles,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
