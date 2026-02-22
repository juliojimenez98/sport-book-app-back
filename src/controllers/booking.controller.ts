import { Request, Response, NextFunction } from "express";
import {
  Booking,
  Resource,
  Branch,
  Tenant,
  Guest,
  AppUser,
  BookingCancellation,
  Sport,
} from "../models/associations";
import {
  AuthenticatedRequest,
  BookingStatus,
  BookingSource,
} from "../interfaces";
import {
  notFound,
  badRequest,
  forbidden,
  conflict,
} from "../middlewares/errorHandler";
import { hasAccessToBranch } from "../middlewares/authorize";
import { calculateBookingPrice, isValidTimeRange } from "../helpers/utils";
import {
  sendBookingNotificationToClient,
  sendBookingNotificationToAdmins,
} from "../services/email.service";
import {
  CreateBookingInput,
  RejectBookingInput,
} from "../validators/schemas";
import { Op } from "sequelize";
import sequelize from "../db/connection";

// POST /bookings
export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { resourceId, startAt, endAt, source, notes, guest } =
      req.body as CreateBookingInput;

    // Validate time range
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (!isValidTimeRange(startDate, endDate)) {
      throw badRequest(
        "Invalid time range. Start must be in the future and before end.",
      );
    }

    // Check for duplicate pending bookings for the same user
    if (req.user) {
      const existingPending = await Booking.findOne({
        where: {
          userId: req.user.userId,
          branchId: (await Resource.findByPk(resourceId))?.branchId, // Optimizable, but safe
          resourceId,
          status: BookingStatus.PENDING,
          startAt: { [Op.lt]: endDate },
          endAt: { [Op.gt]: startDate },
        },
        transaction,
      });

      if (existingPending) {
        throw conflict(
          "Ya tienes una reserva pendiente para este horario. Espera a que sea aprobada o rechazada.",
        );
      }
    }

    // Get resource with branch info
    const resource = await Resource.findByPk(resourceId, {
      include: [{ model: Branch, as: "branch" }],
      transaction,
    });

    if (!resource || !resource.isActive) {
      throw notFound("Resource not found or inactive");
    }

    const branch = (resource as Resource & { branch: Branch }).branch;
    if (!branch.isActive) {
      throw badRequest("Branch is not active");
    }

    // Determine user or guest
    let userId: number | undefined;
    let guestId: number | undefined;

    if (req.user) {
      // Logged in user
      userId = req.user.userId;
    } else if (guest) {
      // Guest booking - find or create guest
      const [guestRecord] = await Guest.findOrCreate({
        where: {
          tenantId: branch.tenantId,
          email: guest.email,
        },
        defaults: {
          tenantId: branch.tenantId,
          email: guest.email,
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
        },
        transaction,
      });
      guestId = guestRecord.guestId;
    } else {
      throw badRequest("Either login or provide guest information");
    }

    // Calculate price
    const totalPrice = calculateBookingPrice(
      parseFloat(resource.pricePerHour.toString()),
      startDate,
      endDate,
    );

    // Determine initial status based on branch setting
    const initialStatus = branch.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.CONFIRMED;

    // Create booking (the exclusion constraint will prevent overlaps)
    try {
      const booking = await Booking.create(
        {
          tenantId: branch.tenantId,
          branchId: branch.branchId,
          resourceId,
          userId,
          guestId,
          startAt: startDate,
          endAt: endDate,
          status: initialStatus,
          source: source || BookingSource.WEB,
          totalPrice,
          currency: resource.currency,
          notes,
        },
        { transaction },
      );

      await transaction.commit();

      // Fetch complete booking with relations
      const completeBooking = await Booking.findByPk(booking.bookingId, {
        include: [
          {
            model: Resource,
            as: "resource",
            attributes: ["resourceId", "name", "pricePerHour"],
          },
          {
            model: Branch,
            as: "branch",
            attributes: ["branchId", "name", "tenantId"],
          },
          {
            model: AppUser,
            as: "user",
            attributes: ["email", "firstName", "lastName"],
          },
          {
            model: Guest,
            as: "guest",
            attributes: ["email", "firstName", "lastName"],
          },
        ],
      });

      // Send email notifications asynchronously
      if (completeBooking) {
        const emailType = initialStatus === BookingStatus.CONFIRMED 
          ? 'created_auto_confirmed' 
          : 'created_pending';

        // Fire and forget wrapped in Promise.allSettled to prevent failing the request
        Promise.allSettled([
          sendBookingNotificationToClient(completeBooking as any, emailType),
          sendBookingNotificationToAdmins(completeBooking as any, emailType)
        ]).catch(err => console.error("Failed to trigger booking emails:", err));
      }

      res.status(201).json({
        success: true,
        data: completeBooking,
      });
    } catch (dbError: unknown) {
      // Check for exclusion constraint violation (overlap)
      if (
        dbError &&
        typeof dbError === "object" &&
        "name" in dbError &&
        dbError.name === "SequelizeDatabaseError"
      ) {
        const error = dbError as { parent?: { code?: string } };
        if (error.parent?.code === "23P01") {
          throw conflict("This time slot is already booked");
        }
      }
      throw dbError;
    }
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// POST /bookings/:id/cancel
export const cancelBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Branch, as: "branch" },
        { model: AppUser, as: "user" },
        { model: Guest, as: "guest" },
      ],
      transaction,
    });

    if (!booking) {
      throw notFound("Booking not found");
    }

    // Check if already cancelled or completed
    if (booking.status === BookingStatus.CANCELLED) {
      throw badRequest("Booking is already cancelled");
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw badRequest("Cannot cancel a completed booking");
    }

    // Check permissions
    const branch = (booking as Booking & { branch: Branch }).branch;
    const isOwner = req.user && booking.userId === req.user.userId;
    const hasAdminAccess =
      req.user && hasAccessToBranch(req, booking.branchId, branch.tenantId);

    if (!isOwner && !hasAdminAccess) {
      throw forbidden("You can only cancel your own bookings");
    }

    // Update booking status
    await booking.update({ status: BookingStatus.CANCELLED }, { transaction });

    // Create cancellation record
    await BookingCancellation.create(
      {
        bookingId: booking.bookingId,
        cancelledBy: req.user?.userId,
        reason,
      },
      { transaction },
    );

    await transaction.commit();

    res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// GET /bookings/:id
export const getBookingById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name", "pricePerHour", "currency"],
          include: [
            {
              model: Sport,
              as: "sport",
              attributes: ["sportId", "name"],
            },
          ],
        },
        {
          model: Branch,
          as: "branch",
          attributes: ["branchId", "name", "tenantId"],
        },
        {
          model: AppUser,
          as: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
        {
          model: Guest,
          as: "guest",
          attributes: ["guestId", "email", "firstName", "lastName"],
        },
        {
          model: BookingCancellation,
          as: "cancellation",
        },
      ],
    });

    if (!booking) {
      throw notFound("Booking not found");
    }

    // Check access - owner or admin
    const branch = (booking as Booking & { branch: Branch }).branch;
    const isOwner = req.user && booking.userId === req.user.userId;
    const hasAdminAccess =
      req.user && hasAccessToBranch(req, booking.branchId, branch.tenantId);

    if (!isOwner && !hasAdminAccess) {
      throw forbidden("Access denied to this booking");
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// GET /me/bookings
export const getMyBookings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw forbidden("Authentication required");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const whereClause: Record<string, unknown> = {
      userId: req.user.userId,
    };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["startAt", "DESC"]],
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name", "pricePerHour", "currency"],
          include: [
            {
              model: Sport,
              as: "sport",
              attributes: ["sportId", "name"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["branchId", "name"],
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
      data: bookings,
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

// GET /branches/:branchId/bookings (admin)
export const getBranchBookings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { branchId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { from, to, status, resourceId } = req.query;

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      throw notFound("Branch not found");
    }

    if (!hasAccessToBranch(req, parseInt(branchId), branch.tenantId)) {
      throw forbidden("Access denied to this branch");
    }

    const whereClause: Record<string, unknown> = {
      branchId: parseInt(branchId),
    };

    if (from) {
      whereClause.startAt = { [Op.gte]: new Date(from as string) };
    }
    if (to) {
      // "to" es una fecha como "2026-02-21". Queremos incluir TODAS las reservas
      // que empiecen en ese día, así que usamos startAt < (to + 1 día).
      // El filtro anterior (endAt <= midnight UTC) excluía reservas del último día.
      const toDate = new Date(to as string);
      toDate.setUTCDate(toDate.getUTCDate() + 1);
      whereClause.startAt = {
        ...(whereClause.startAt as object || {}),
        [Op.lt]: toDate,
      };
    }
    if (status) {
      whereClause.status = status;
    }
    if (resourceId) {
      whereClause.resourceId = parseInt(resourceId as string);
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["startAt", "DESC"]],
      include: [
        {
          model: Resource,
          as: "resource",
          attributes: ["resourceId", "name"],
        },
        {
          model: AppUser,
          as: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
        {
          model: Guest,
          as: "guest",
          attributes: ["guestId", "email", "firstName", "lastName"],
        },
      ],
    });

    res.json({
      success: true,
      data: bookings,
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

// PUT /bookings/:id/confirm (admin)
export const confirmBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Branch, as: "branch" }],
    });

    if (!booking) {
      throw notFound("Booking not found");
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw badRequest("Only pending bookings can be confirmed");
    }

    const branch = (booking as Booking & { branch: Branch }).branch;
    if (!hasAccessToBranch(req, booking.branchId, branch.tenantId)) {
      throw forbidden("Access denied");
    }

    await booking.update({ status: BookingStatus.CONFIRMED }, { transaction });

    // Auto-reject other pending bookings for the same slot
    const overlappingBookings = await Booking.findAll({
      where: {
        bookingId: { [Op.ne]: booking.bookingId },
        resourceId: booking.resourceId,
        status: BookingStatus.PENDING,
        startAt: { [Op.lt]: booking.endAt },
        endAt: { [Op.gt]: booking.startAt },
      },
      transaction,
    });

    if (overlappingBookings.length > 0) {
      await Promise.all(
        overlappingBookings.map(async (otherBooking) => {
          await otherBooking.update(
            {
              status: BookingStatus.REJECTED,
              rejectionReason:
                "Se aprobó otra reserva para este horario (prioridad de confirmación).",
            },
            { transaction },
          );

          await BookingCancellation.create(
            {
              bookingId: otherBooking.bookingId,
              cancelledBy: req.user?.userId,
              reason: "Auto-rejected due to overlap with confirmed booking",
            },
            { transaction },
          );
        }),
      );
    }

    await transaction.commit();

    // Fetch relations for email
    const completeBookingForEmail = await Booking.findByPk(booking.bookingId, {
      include: [
        { model: Resource, as: "resource", attributes: ["resourceId", "name"] },
        { model: Branch, as: "branch", attributes: ["branchId", "name", "tenantId"] },
        { model: AppUser, as: "user", attributes: ["email", "firstName", "lastName"] },
        { model: Guest, as: "guest", attributes: ["email", "firstName", "lastName"] },
      ]
    });

    if (completeBookingForEmail) {
      sendBookingNotificationToClient(completeBookingForEmail as any, 'confirmed')
        .catch(err => console.error("Failed to send confirmed booking email:", err));
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    next(error);
  }
};

// PUT /bookings/:id/reject (admin)
export const rejectBooking = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body as RejectBookingInput;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Branch, as: "branch" }],
      transaction,
    });

    if (!booking) {
      throw notFound("Booking not found");
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw badRequest("Only pending bookings can be rejected");
    }

    const branch = (booking as Booking & { branch: Branch }).branch;
    if (!hasAccessToBranch(req, booking.branchId, branch.tenantId)) {
      throw forbidden("Access denied");
    }

    await booking.update(
      {
        status: BookingStatus.REJECTED,
        rejectionReason: reason,
      },
      { transaction },
    );

    // Create cancellation record for audit
    await BookingCancellation.create(
      {
        bookingId: booking.bookingId,
        cancelledBy: req.user?.userId,
        reason: reason,
      },
      { transaction },
    );

    await transaction.commit();

    // Fetch relations for email
    const completeBookingForEmail = await Booking.findByPk(booking.bookingId, {
      include: [
        { model: Resource, as: "resource", attributes: ["resourceId", "name"] },
        { model: Branch, as: "branch", attributes: ["branchId", "name", "tenantId"] },
        { model: AppUser, as: "user", attributes: ["email", "firstName", "lastName"] },
        { model: Guest, as: "guest", attributes: ["email", "firstName", "lastName"] },
      ]
    });

    if (completeBookingForEmail) {
      sendBookingNotificationToClient(completeBookingForEmail as any, 'rejected')
        .catch(err => console.error("Failed to send rejected booking email:", err));
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};


