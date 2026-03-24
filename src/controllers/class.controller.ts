import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import sequelize from "../db/connection";
import {
  SportClass,
  ClassEnrollment,
  Branch,
  Tenant,
  Sport,
  AppUser,
  Resource,
} from "../models/associations";
import { AuthenticatedRequest } from "../interfaces";
import { hasAccessToBranch } from "../middlewares/authorize";
import {
  CreateClassInput,
  UpdateClassInput,
  CreateRecurringClassesInput,
} from "../validators/schemas";
import {
  sendClassEnrollmentEmail,
  sendClassEnrollmentAdminEmail,
  ClassForEmail,
} from "../services/email.service";

// ============ HELPERS ============
async function getSpotsLeft(sportClass: SportClass): Promise<number> {
  const count = await ClassEnrollment.count({
    where: { classId: sportClass.classId, status: "confirmed" },
  });
  return Math.max(0, sportClass.maxCapacity - count);
}

// ============ PUBLIC ENDPOINTS ============

// GET /branches/:branchId/classes
export async function getClassesByBranch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const branchId = parseInt(req.params.branchId, 10);
    const { sportId, upcoming } = req.query;

    const where: Record<string, unknown> = { branchId, isActive: true };
    if (sportId) where.sportId = parseInt(sportId as string, 10);
    if (upcoming !== "false") {
      where.startsAt = { [Op.gte]: new Date() };
    }

    const classes = await SportClass.findAll({
      where,
      include: [
        { model: Sport, as: "sport" },
        { model: Resource, as: "resource", attributes: ["resourceId", "name"] },
      ],
      order: [["startsAt", "ASC"]],
    });

    const result = await Promise.all(
      classes.map(async (sc) => {
        const spotsLeft = await getSpotsLeft(sc);
        return { ...sc.toJSON(), spotsLeft };
      }),
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /classes/:id
export async function getClassById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const sportClass = await SportClass.findByPk(id, {
      include: [
        { model: Sport, as: "sport" },
        { model: Branch, as: "branch" },
        { model: Resource, as: "resource", attributes: ["resourceId", "name"] },
      ],
    });

    if (!sportClass || !sportClass.isActive) {
      res.status(404).json({ message: "Clase no encontrada" });
      return;
    }

    const spotsLeft = await getSpotsLeft(sportClass);
    res.json({ ...sportClass.toJSON(), spotsLeft });
  } catch (err) {
    next(err);
  }
}

// ============ ADMIN ENDPOINTS ============

// POST /branches/:branchId/classes
export async function createClass(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const branchId = parseInt(req.params.branchId, 10);
    const body = req.body as CreateClassInput;

    const branch = await Branch.findByPk(branchId, {
      include: [{ model: Tenant, as: "tenant" }],
    });
    if (!branch) {
      res.status(404).json({ message: "Sucursal no encontrada" });
      return;
    }

    if (!hasAccessToBranch(req, branchId, branch.tenantId)) {
      res.status(403).json({ message: "Acceso denegado" });
      return;
    }

    const sportClass = await SportClass.create({
      tenantId: branch.tenantId,
      branchId,
      sportId: body.sportId,
      resourceId: body.resourceId ?? undefined,
      name: body.name,
      description: body.description,
      instructor: body.instructor,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      maxCapacity: body.maxCapacity ?? 20,
      price: body.price ?? 0,
      currency: body.currency ?? "CLP",
    });

    const spotsLeft = await getSpotsLeft(sportClass);
    res.status(201).json({ ...sportClass.toJSON(), spotsLeft });
  } catch (err) {
    next(err);
  }
}

// PUT /classes/:id
export async function updateClass(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as UpdateClassInput;

    const sportClass = await SportClass.findByPk(id);
    if (!sportClass) {
      res.status(404).json({ message: "Clase no encontrada" });
      return;
    }

    if (!hasAccessToBranch(req, sportClass.branchId, sportClass.tenantId)) {
      res.status(403).json({ message: "Acceso denegado" });
      return;
    }

    // If reducing maxCapacity, ensure it's not below current confirmed enrollments
    if (body.maxCapacity !== undefined) {
      const confirmedCount = await ClassEnrollment.count({
        where: { classId: id, status: "confirmed" },
      });
      if (body.maxCapacity < confirmedCount) {
        res.status(409).json({
          message: `No se puede reducir el cupo a ${body.maxCapacity} porque ya hay ${confirmedCount} inscritos confirmados`,
        });
        return;
      }
    }

    await sportClass.update({
      name: body.name ?? sportClass.name,
      description: body.description ?? sportClass.description,
      instructor: body.instructor ?? sportClass.instructor,
      startsAt: body.startsAt ? new Date(body.startsAt) : sportClass.startsAt,
      endsAt: body.endsAt ? new Date(body.endsAt) : sportClass.endsAt,
      maxCapacity: body.maxCapacity ?? sportClass.maxCapacity,
      price: body.price ?? sportClass.price,
      currency: body.currency ?? sportClass.currency,
      isActive: body.isActive ?? sportClass.isActive,
      resourceId: body.resourceId !== undefined ? (body.resourceId ?? undefined) : sportClass.resourceId,
    });

    const spotsLeft = await getSpotsLeft(sportClass);
    res.json({ ...sportClass.toJSON(), spotsLeft });
  } catch (err) {
    next(err);
  }
}

// DELETE /classes/:id
export async function deleteClass(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const sportClass = await SportClass.findByPk(id);
    if (!sportClass) {
      res.status(404).json({ message: "Clase no encontrada" });
      return;
    }

    if (!hasAccessToBranch(req, sportClass.branchId, sportClass.tenantId)) {
      res.status(403).json({ message: "Acceso denegado" });
      return;
    }

    // Soft-delete: just deactivate
    await sportClass.update({ isActive: false });
    res.json({ message: "Clase desactivada exitosamente" });
  } catch (err) {
    next(err);
  }
}

// GET /classes/:id/enrollments (admin)
export async function getClassEnrollments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const sportClass = await SportClass.findByPk(id);
    if (!sportClass) {
      res.status(404).json({ message: "Clase no encontrada" });
      return;
    }

    if (!hasAccessToBranch(req, sportClass.branchId, sportClass.tenantId)) {
      res.status(403).json({ message: "Acceso denegado" });
      return;
    }

    const enrollments = await ClassEnrollment.findAll({
      where: { classId: id },
      include: [
        {
          model: AppUser,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName", "phone"],
        },
      ],
      order: [["enrolledAt", "ASC"]],
    });

    const spotsLeft = await getSpotsLeft(sportClass);
    res.json({
      class: { ...sportClass.toJSON(), spotsLeft },
      enrollments,
    });
  } catch (err) {
    next(err);
  }
}

// ============ CLIENT ENDPOINTS ============

// POST /classes/:id/enroll
export async function enrollInClass(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Debe iniciar sesión para inscribirse" });
      return;
    }

    const classId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    // Use a transaction to prevent race conditions
    const result = await sequelize.transaction(async (t) => {
      // Lock the row
      const sportClass = await SportClass.findByPk(classId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!sportClass || !sportClass.isActive) {
        throw Object.assign(new Error("Clase no encontrada"), { statusCode: 404 });
      }

      // Check if already enrolled
      const existing = await ClassEnrollment.findOne({
        where: { classId, userId },
        transaction: t,
      });

      if (existing) {
        if (existing.status === "confirmed") {
          throw Object.assign(new Error("Ya estás inscrito en esta clase"), { statusCode: 409 });
        }
        // Re-enroll if previously cancelled
        await existing.update({ status: "confirmed", enrolledAt: new Date() }, { transaction: t });
        const spotsLeft = sportClass.maxCapacity - (await ClassEnrollment.count({
          where: { classId, status: "confirmed" },
          transaction: t,
        }));
        return { enrollment: existing, spotsLeft: Math.max(0, spotsLeft) };
      }

      // Count current confirmed enrollments
      const confirmedCount = await ClassEnrollment.count({
        where: { classId, status: "confirmed" },
        transaction: t,
      });

      if (confirmedCount >= sportClass.maxCapacity) {
        throw Object.assign(new Error("No hay cupos disponibles para esta clase"), { statusCode: 409 });
      }

      const enrollment = await ClassEnrollment.create(
        { classId, userId, status: "confirmed" },
        { transaction: t },
      );

      const spotsLeft = sportClass.maxCapacity - (confirmedCount + 1);
      return { enrollment, spotsLeft: Math.max(0, spotsLeft), sportClass };
    });

    // Send enrollment emails (fire and forget)
    try {
      const user = await AppUser.findByPk(req.user.userId, {
        attributes: ["email", "firstName", "lastName"],
      });
      const fullClass = await SportClass.findByPk(classId, {
        include: [
          { model: Sport, as: "sport", attributes: ["name"] },
          { model: Branch, as: "branch", attributes: ["branchId", "name", "tenantId"] },
        ],
      });
      if (user && fullClass) {
        const classData = fullClass.toJSON() as unknown as ClassForEmail;
        const userName = `${user.firstName} ${user.lastName}`;
        Promise.allSettled([
          sendClassEnrollmentEmail(user.email, user.firstName, classData, result.spotsLeft, 'enrolled'),
          sendClassEnrollmentAdminEmail(classData, userName, result.spotsLeft, 'enrolled'),
        ]).catch(err => console.error("Failed to send enrollment emails:", err));
      }
    } catch (emailErr) {
      console.error("Error preparing enrollment emails:", emailErr);
    }

    res.status(201).json({
      message: "Inscripción exitosa",
      enrollment: result.enrollment,
      spotsLeft: result.spotsLeft,
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    next(err);
  }
}

// DELETE /classes/:id/enroll
export async function cancelEnrollment(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Autenticación requerida" });
      return;
    }

    const classId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    const enrollment = await ClassEnrollment.findOne({
      where: { classId, userId, status: "confirmed" },
    });

    if (!enrollment) {
      res.status(404).json({ message: "No tienes inscripción activa en esta clase" });
      return;
    }

    await enrollment.update({ status: "cancelled" });

    const sportClass = await SportClass.findByPk(classId, {
      include: [
        { model: Sport, as: "sport", attributes: ["name"] },
        { model: Branch, as: "branch", attributes: ["branchId", "name", "tenantId"] },
      ],
    });
    const confirmedCount = await ClassEnrollment.count({
      where: { classId, status: "confirmed" },
    });
    const spotsLeft = sportClass ? sportClass.maxCapacity - confirmedCount : 0;

    // Send cancellation emails (fire and forget)
    try {
      const user = await AppUser.findByPk(req.user!.userId, {
        attributes: ["email", "firstName", "lastName"],
      });
      if (user && sportClass) {
        const classData = sportClass.toJSON() as unknown as ClassForEmail;
        const userName = `${user.firstName} ${user.lastName}`;
        Promise.allSettled([
          sendClassEnrollmentEmail(user.email, user.firstName, classData, spotsLeft, 'cancelled'),
          sendClassEnrollmentAdminEmail(classData, userName, spotsLeft, 'cancelled'),
        ]).catch(err => console.error("Failed to send cancel enrollment emails:", err));
      }
    } catch (emailErr) {
      console.error("Error preparing cancel enrollment emails:", emailErr);
    }

    res.json({ message: "Inscripción cancelada exitosamente", spotsLeft });
  } catch (err) {
    next(err);
  }
}

// GET /me/enrollments
export async function getMyEnrollments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Autenticación requerida" });
      return;
    }

    const userId = req.user.userId;
    const enrollments = await ClassEnrollment.findAll({
      where: { userId, status: "confirmed" },
      include: [
        {
          model: SportClass,
          as: "sportClass",
          include: [
            { model: Sport, as: "sport" },
            { model: Branch, as: "branch" },
          ],
        },
      ],
      order: [[{ model: SportClass, as: "sportClass" }, "startsAt", "ASC"]],
    });

    res.json(enrollments);
  } catch (err) {
    next(err);
  }
}

// ============ RECURRING CLASSES ============

/**
 * POST /branches/:branchId/classes/bulk
 * Body: CreateRecurringClassesInput
 * Generates one SportClass per matching date in [startDate, endDate]
 * where date.getDay() is in daysOfWeek.
 */
export async function createRecurringClasses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const branchId = parseInt(req.params.branchId, 10);
    const body = req.body as CreateRecurringClassesInput;

    const branch = await Branch.findByPk(branchId, {
      include: [{ model: Tenant, as: "tenant" }],
    });
    if (!branch) {
      res.status(404).json({ message: "Sucursal no encontrada" });
      return;
    }

    if (!hasAccessToBranch(req, branchId, branch.tenantId)) {
      res.status(403).json({ message: "Acceso denegado" });
      return;
    }

    // Build all dates in range where weekday matches
    const start = new Date(body.startDate + "T00:00:00");
    const end   = new Date(body.endDate   + "T00:00:00");

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: "Fechas inválidas" });
      return;
    }

    type ClassRecord = {
      tenantId: number; branchId: number; sportId: number; resourceId?: number;
      name: string; description?: string; instructor?: string;
      startsAt: Date; endsAt: Date; maxCapacity: number; price: number; currency: string;
    };
    const records: ClassRecord[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const dow = cursor.getDay(); // 0=Sun ... 6=Sat
      if (body.daysOfWeek.includes(dow)) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const startsAt = new Date(`${dateStr}T${body.startTime}:00`);
        const endsAt   = new Date(`${dateStr}T${body.endTime}:00`);

        records.push({
          tenantId: branch.tenantId,
          branchId,
          sportId: body.sportId,
          resourceId: body.resourceId ?? undefined,
          name: body.name,
          description: body.description,
          instructor: body.instructor,
          startsAt,
          endsAt,
          maxCapacity: body.maxCapacity ?? 20,
          price: body.price ?? 0,
          currency: body.currency ?? "CLP",
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (records.length === 0) {
      res.status(400).json({
        message: "Ninguna fecha del rango coincide con los días seleccionados",
      });
      return;
    }

    const created = await SportClass.bulkCreate(records);

    res.status(201).json({
      count: created.length,
      classes: created.map((sc) => sc.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}
