import { Request, Response, NextFunction } from "express";
import { Discount, Branch, Resource, DiscountResource } from "../models";
import sequelize from "../db/connection";
import { ScopedRequest, RoleScope } from "../interfaces";

// Check authorization based on tenant/branch
const canManageDiscount = async (req: ScopedRequest, branchId?: number) => {
  const { user, tenantId: reqTenantId, branchId: reqBranchId } = req;
  if (!user) return false;

  // Super admin can manage all
  if (user.roles.some((r) => r.roleName === "super_admin")) return true;

  if (branchId) {
    const branch = await Branch.findByPk(branchId);
    if (!branch) return false;
    
    // Tenant admin for this branch's tenant
    if (user.roles.some((r) => r.roleName === "tenant_admin" && r.tenantId === branch.tenantId)) return true;
    
    // Branch admin for this specific branch
    if (user.roles.some((r) => r.roleName === "branch_admin" && r.branchId === branchId)) return true;
  }
  
  // Checking tenant-level discounts
  if (reqTenantId && user.roles.some((r) => r.roleName === "tenant_admin" && r.tenantId === reqTenantId)) return true;

  return false;
};

// GET /discounts
export const getDiscounts = async (req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    const { tenantId, branchId } = req.query;
    
    let whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;
    if (branchId) whereClause.branchId = branchId;

    // Filter by user scope if not super admin
    if (!req.user?.roles.some(r => r.roleName === 'super_admin')) {
      if (req.tenantId) whereClause.tenantId = req.tenantId;
      if (req.branchId) whereClause.branchId = req.branchId;
    }

    const discounts = await Discount.findAll({
      where: whereClause,
      include: [
        { model: Branch, as: "branch", attributes: ["name", "slug"] },
        { model: Resource, as: "resources", attributes: ["resourceId", "name"] }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
};

// POST /discounts
export const createDiscount = async (req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    
    // Ensure the user has permissions
    if (!(await canManageDiscount(req, data.branchId))) {
      return res.status(403).json({ success: false, message: "No tienes permiso para crear descuentos aquí" });
    }

    // Force tenantId to match user's scope constraint, regardless of frontend input
    if (req.tenantId) {
      data.tenantId = req.tenantId;
    } else if (data.tenantId === 0) {
      // If the frontend sent an invalid 0 and we couldn't infer it, we must hard fail.
      return res.status(400).json({ success: false, message: "No se pudo identificar el Tenant aplicable" });
    }

    const t = await sequelize.transaction();
    try {
      const discount = await Discount.create(data, { transaction: t });
      
      if (data.resourceIds && Array.isArray(data.resourceIds) && data.resourceIds.length > 0) {
        const discountResourceData = data.resourceIds.map((resourceId: number) => ({
          discountId: discount.discountId,
          resourceId
        }));
        await DiscountResource.bulkCreate(discountResourceData, { transaction: t });
      }

      await t.commit();
      
      const createdDiscount = await Discount.findByPk(discount.discountId, {
        include: [{ model: Resource, as: "resources", attributes: ["resourceId", "name"] }]
      });

      res.status(201).json({ success: true, data: createdDiscount });
    } catch (txnError) {
      await t.rollback();
      throw txnError;
    }
  } catch (error) {
    next(error);
  }
};

// PUT /discounts/:id
export const updateDiscount = async (req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findByPk(id);

    if (!discount) {
      return res.status(404).json({ success: false, message: "Descuento no encontrado" });
    }

    if (!(await canManageDiscount(req, discount.branchId))) {
      return res.status(403).json({ success: false, message: "No tienes permiso para actualizar este descuento" });
    }

    const t = await sequelize.transaction();
    try {
      await discount.update(req.body, { transaction: t });

      if (req.body.resourceIds !== undefined) {
        await DiscountResource.destroy({ where: { discountId: discount.discountId }, transaction: t });
        if (Array.isArray(req.body.resourceIds) && req.body.resourceIds.length > 0) {
          const discountResourceData = req.body.resourceIds.map((resourceId: number) => ({
            discountId: discount.discountId,
            resourceId
          }));
          await DiscountResource.bulkCreate(discountResourceData, { transaction: t });
        }
      }

      await t.commit();

      const updatedDiscount = await Discount.findByPk(discount.discountId, {
        include: [{ model: Resource, as: "resources", attributes: ["resourceId", "name"] }]
      });

      res.json({ success: true, data: updatedDiscount });
    } catch (txnError) {
      await t.rollback();
      throw txnError;
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /discounts/:id
export const deleteDiscount = async (req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findByPk(id);

    if (!discount) {
      return res.status(404).json({ success: false, message: "Descuento no encontrado" });
    }

    if (!(await canManageDiscount(req, discount.branchId))) {
      return res.status(403).json({ success: false, message: "No tienes permiso para eliminar este descuento" });
    }

    await discount.destroy();
    res.json({ success: true, message: "Descuento eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};
