import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
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
import {
  sendVerificationEmailOrThrow,
  sendPasswordResetEmailOrThrow,
} from "../services/email.service";
import {
  generateVerificationToken,
  buildVerificationUrl,
  verifyVerificationToken,
  generatePasswordResetToken,
  buildPasswordResetUrl,
  verifyPasswordResetToken,
} from "../helpers/verificationToken";



// ─── POST /auth/register ──────────────────────────────────────────────────────

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

    // Create user — inactive until email verified
    const user = await AppUser.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      isActive: false,
    });

    // Generate verification token & send email — if this fails, rollback user creation
    const token = generateVerificationToken(user.userId, user.email);
    const verificationUrl = buildVerificationUrl(token);
    try {
      await sendVerificationEmailOrThrow({
        email: user.email,
        firstName: user.firstName,
        verificationUrl,
      });
    } catch (emailError) {
      // Rollback: delete the user so the email can be used for a future registration
      await user.destroy();
      console.error(
        `[register] Email failed for ${user.email}, user rolled back:`,
        emailError,
      );
      res.status(503).json({
        success: false,
        message:
          "No pudimos enviar el email de verificación. Por favor intenta de nuevo en unos minutos.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message:
        "Cuenta creada. Por favor revisa tu email y verifica tu cuenta antes de iniciar sesión.",
      data: {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────

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

    // Block unverified users
    if (!user.emailVerifiedAt) {
      throw unauthorized(
        "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
      );
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
      userId: user.userId,
      email: user.email,
      roles,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token hash
    const tokenHash = await hashToken(refreshToken);
    await RefreshToken.create({
      userId: user.userId,
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
          id: user.userId,
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

// ─── GET /auth/verify-email ───────────────────────────────────────────────────

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token } = req.query as { token?: string };

    if (!token) {
      throw badRequest("Token de verificación requerido");
    }

    // Decode and validate token
    let payload: { userId: number; email: string; type: string };
    try {
      payload = verifyVerificationToken(token);
    } catch {
      throw badRequest("Token inválido o expirado");
    }

    if (payload.type !== "email_verify") {
      throw badRequest("Token inválido");
    }

    // Find user
    const user = await AppUser.findByPk(payload.userId);
    if (!user) {
      throw notFound("Usuario no encontrado");
    }

    // Already verified
    if (user.emailVerifiedAt) {
      res.json({
        success: true,
        message: "Tu cuenta ya estaba verificada. Puedes iniciar sesión.",
        alreadyVerified: true,
      });
      return;
    }

    // Activate account
    await user.update({
      emailVerifiedAt: new Date(),
      isActive: true,
    });

    // Assign 'cliente' role (only for self-registered users without any roles)
    const existingRoles = await UserRole.count({ where: { userId: user.userId } });
    if (existingRoles === 0) {
      const clienteRole = await Role.findOne({ where: { name: RoleName.CLIENTE } });
      if (clienteRole) {
        await UserRole.create({
          userId: user.userId,
          roleId: clienteRole.roleId,
          scope: RoleScope.GLOBAL,
        });
      }
    }

    res.json({
      success: true,
      message: "¡Email verificado correctamente! Ya puedes iniciar sesión.",
    });
  } catch (error) {
    next(error);
  }
};


// ─── POST /auth/refresh ───────────────────────────────────────────────────────

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
      where: { userId: user.userId, revokedAt: null as unknown as undefined },
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
      userId: user.userId,
      email: user.email,
      roles,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Store new refresh token
    const newTokenHash = await hashToken(newRefreshToken);
    await RefreshToken.create({
      userId: user.userId,
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

// ─── POST /auth/logout ────────────────────────────────────────────────────────

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

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

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
        id: user.userId,
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

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    const user = await AppUser.findOne({ where: { email } });

    // Always return success to prevent email enumeration
    if (user) {
      const token = generatePasswordResetToken(user.userId, user.email);
      const resetUrl = buildPasswordResetUrl(token);

      try {
        await sendPasswordResetEmailOrThrow({
          email: user.email,
          firstName: user.firstName,
          resetUrl,
          isInvitation: false,
        });
      } catch (error) {
        console.error(`Error sending password reset email to ${email}:`, error);
        // Do not throw to caller, just log
      }
    }

    res.json({
      success: true,
      message: "Si el correo está registrado, recibirás un enlace de recuperación.",
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /auth/reset-password ────────────────────────────────────────────────

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };

    let payload: { userId: number; email: string; type: string };
    try {
      payload = verifyPasswordResetToken(token);
    } catch {
      throw badRequest("El enlace es inválido o ha expirado.");
    }

    if (payload.type !== "password_reset") {
      throw badRequest("Token inválido.");
    }

    const user = await AppUser.findByPk(payload.userId);
    if (!user) {
      throw notFound("Usuario no encontrado.");
    }

    const passwordHash = await hashPassword(password);
    
    // If the account was inactive (e.g. invited user), activate it now
    const updates: any = { passwordHash };
    if (!user.isActive || !user.emailVerifiedAt) {
      updates.isActive = true;
      updates.emailVerifiedAt = new Date();
    }

    await user.update(updates);

    // Optional: Invalidate all existing refresh tokens for security
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId: user.userId, revokedAt: null as any } }
    );


    res.json({
      success: true,
      message: "Tu contraseña ha sido actualizada correctamente. Puedes iniciar sesión.",
    });
  } catch (error) {
    next(error);
  }
};
