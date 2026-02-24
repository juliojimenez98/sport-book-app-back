// Types for API responses, requests and shared interfaces

// ============ ENUMS AS CONST ============
export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  REJECTED: 'rejected'
} as const;

export type BookingStatusType = typeof BookingStatus[keyof typeof BookingStatus];

export const BookingSource = {
  WEB: 'web',
  APP: 'app',
  PHONE: 'phone',
  WALK_IN: 'walk_in'
} as const;

export type BookingSourceType = typeof BookingSource[keyof typeof BookingSource];

export const RoleScope = {
  GLOBAL: 'global',
  TENANT: 'tenant',
  BRANCH: 'branch'
} as const;

export type RoleScopeType = typeof RoleScope[keyof typeof RoleScope];

export const RoleName = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  BRANCH_ADMIN: 'branch_admin',
  STAFF: 'staff',
  CLIENTE: 'cliente',
} as const;

export type RoleNameType = typeof RoleName[keyof typeof RoleName];

export const DiscountType = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount'
} as const;

export type DiscountTypeEnum = typeof DiscountType[keyof typeof DiscountType];

export const DiscountConditionType = {
  PROMO_CODE: 'promo_code',
  TIME_BASED: 'time_based'
} as const;

export type DiscountConditionTypeEnum = typeof DiscountConditionType[keyof typeof DiscountConditionType];

// ============ AUTH INTERFACES ============
export interface TokenPayload {
  userId: number;
  email: string;
  roles: UserRoleInfo[];
}

export interface UserRoleInfo {
  roleId: number;
  roleName: RoleNameType;
  scope: RoleScopeType;
  tenantId?: number;
  branchId?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: UserResponse;
}

// ============ USER INTERFACES ============
export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  roles: UserRoleInfo[];
  createdAt: Date;
}

// ============ TENANT INTERFACES ============
export interface TenantResponse {
  id: number;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}

// ============ BRANCH INTERFACES ============
export interface BranchResponse {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

// ============ SPORT INTERFACES ============
export interface SportResponse {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
}

// ============ RESOURCE INTERFACES ============
export interface ResourceResponse {
  id: number;
  branchId: number;
  sportId: number;
  name: string;
  description?: string;
  pricePerHour: number;
  currency: string;
  isActive: boolean;
  sport?: SportResponse;
  branch?: BranchResponse;
}

// ============ BOOKING INTERFACES ============
export interface BookingResponse {
  id: number;
  tenantId: number;
  branchId: number;
  resourceId: number;
  userId?: number;
  guestId?: number;
  startAt: Date;
  endAt: Date;
  status: BookingStatusType;
  source: BookingSourceType;
  totalPrice: number;
  currency: string;
  notes?: string;
  resource?: ResourceResponse;
  user?: UserResponse;
  guest?: GuestResponse;
  createdAt: Date;
}

export interface GuestResponse {
  id: number;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// ============ CALENDAR INTERFACES ============
export interface CalendarSlot {
  startAt: Date;
  endAt: Date;
  isAvailable: boolean;
  booking?: {
    id: number;
    status: BookingStatusType;
  };
}

export interface CalendarResponse {
  resourceId: number;
  resourceName: string;
  date: string;
  slots: CalendarSlot[];
}

// ============ REQUEST INTERFACES ============
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ EXPRESS EXTENDED ============
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export interface ScopedRequest extends AuthenticatedRequest {
  tenantId?: number;
  branchId?: number;
}
