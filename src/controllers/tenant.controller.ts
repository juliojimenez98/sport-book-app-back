import { Request, Response, NextFunction } from "express";
import { Tenant, Branch } from "../models/associations";
import { AuthenticatedRequest } from "../interfaces";
import { notFound, badRequest } from "../middlewares/errorHandler";
import { getAccessibleTenantIds } from "../middlewares/authorize";
import { generateSlug } from "../helpers/utils";
import { CreateTenantInput, UpdateTenantInput } from "../validators/schemas";

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

    const whereClause = accessibleTenantIds ? { id: accessibleTenantIds } : {};

    const { count, rows: tenants } = await Tenant.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
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
