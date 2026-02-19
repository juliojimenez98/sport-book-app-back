import { z } from "zod";
import { BookingStatus, BookingSource, RoleScope } from "../interfaces";

// ============ AUTH SCHEMAS ============
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ============ TENANT SCHEMAS ============
export const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
});

// ============ BRANCH SCHEMAS ============
export const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string().max(50).optional(),
  // Location
  regionId: z.string().max(10).optional(),
  comunaId: z.string().max(50).optional(),
  // Amenities
  hasParking: z.boolean().optional(),
  hasBathrooms: z.boolean().optional(),
  hasShowers: z.boolean().optional(),
  hasLockers: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  hasCafeteria: z.boolean().optional(),
  hasEquipmentRental: z.boolean().optional(),
  amenitiesDescription: z.string().max(1000).optional(),
  // Booking settings
  requiresApproval: z.boolean().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string().max(50).optional(),
  // Location
  regionId: z.string().max(10).optional(),
  comunaId: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  // Amenities
  hasParking: z.boolean().optional(),
  hasBathrooms: z.boolean().optional(),
  hasShowers: z.boolean().optional(),
  hasLockers: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  hasCafeteria: z.boolean().optional(),
  hasEquipmentRental: z.boolean().optional(),
  amenitiesDescription: z.string().max(1000).optional(),
  // Booking settings
  requiresApproval: z.boolean().optional(),
});

// ============ SPORT SCHEMAS ============
export const createSportSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  iconUrl: z.string().url().optional(),
});

export const updateSportSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional(),
  iconUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// ============ RESOURCE SCHEMAS ============
export const createResourceSchema = z.object({
  sportId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  pricePerHour: z.number().positive(),
  currency: z.string().length(3).optional(),
});

export const updateResourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  pricePerHour: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
});

// ============ BOOKING SCHEMAS ============
export const createBookingSchema = z
  .object({
    resourceId: z.number().int().positive(),
    startAt: z.string().datetime({ local: true }),
    endAt: z.string().datetime({ local: true }),
    source: z
      .enum([
        BookingSource.WEB,
        BookingSource.APP,
        BookingSource.PHONE,
        BookingSource.WALK_IN,
      ])
      .optional(),
    notes: z.string().optional(),
    // For guest bookings
    guest: z
      .object({
        email: z.string().email(),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        phone: z.string().max(20).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      return start < end;
    },
    {
      message: "End time must be after start time",
    },
  );

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const rejectBookingSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export const calendarQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ============ BRANCH SPORT SCHEMAS ============
export const addBranchSportSchema = z.object({
  sportId: z.number().int().positive(),
});

// ============ USER ROLE SCHEMAS ============
export const assignRoleSchema = z.object({
  roleId: z.number().int().positive(),
  scope: z.enum([RoleScope.GLOBAL, RoleScope.TENANT, RoleScope.BRANCH]),
  tenantId: z.number().int().positive().optional(),
  branchId: z.number().int().positive().optional(),
});

// ============ PAGINATION SCHEMAS ============
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// ============ ID PARAM SCHEMAS ============
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const tenantIdParamSchema = z.object({
  tenantId: z.string().regex(/^\d+$/).transform(Number),
});

export const branchIdParamSchema = z.object({
  branchId: z.string().regex(/^\d+$/).transform(Number),
});

export const resourceIdParamSchema = z.object({
  resourceId: z.string().regex(/^\d+$/).transform(Number),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
