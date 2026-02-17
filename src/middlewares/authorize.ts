import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleNameType, RoleName, RoleScope } from '../interfaces';
import { forbidden, unauthorized } from './errorHandler';

interface AuthorizeOptions {
  roles?: RoleNameType[];
  tenantScope?: boolean;
  branchScope?: boolean;
}

export const authorize = (options: AuthorizeOptions = {}) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw unauthorized('Authentication required');
      }

      const { roles: requiredRoles = [], tenantScope = false, branchScope = false } = options;
      const userRoles = req.user.roles;

      // Super admin has access to everything
      const isSuperAdmin = userRoles.some(r => r.roleName === RoleName.SUPER_ADMIN);
      if (isSuperAdmin) {
        return next();
      }

      // Check if user has any of the required roles
      if (requiredRoles.length > 0) {
        const hasRequiredRole = userRoles.some(ur => requiredRoles.includes(ur.roleName));
        if (!hasRequiredRole) {
          throw forbidden('Insufficient permissions');
        }
      }

      // Check tenant scope
      if (tenantScope) {
        const tenantId = parseInt(req.params.tenantId || req.body?.tenantId, 10);
        if (tenantId) {
          const hasTenantAccess = userRoles.some(ur => 
            (ur.scope === RoleScope.TENANT || ur.scope === RoleScope.BRANCH) && 
            ur.tenantId === tenantId
          );
          if (!hasTenantAccess) {
            throw forbidden('Access denied to this tenant');
          }
        }
      }

      // Check branch scope
      if (branchScope) {
        const branchId = parseInt(req.params.branchId || req.body?.branchId, 10);
        if (branchId) {
          const hasBranchAccess = userRoles.some(ur => {
            // Tenant admins have access to all branches in their tenant
            if (ur.roleName === RoleName.TENANT_ADMIN) {
              return true; // Will be further validated in the controller
            }
            // Branch admins and staff only to their branch
            return ur.scope === RoleScope.BRANCH && ur.branchId === branchId;
          });
          if (!hasBranchAccess) {
            throw forbidden('Access denied to this branch');
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper to check if user has access to a specific tenant
export const hasAccessToTenant = (req: AuthenticatedRequest, tenantId: number): boolean => {
  if (!req.user) return false;
  
  const isSuperAdmin = req.user.roles.some(r => r.roleName === RoleName.SUPER_ADMIN);
  if (isSuperAdmin) return true;

  return req.user.roles.some(ur => 
    (ur.scope === RoleScope.TENANT || ur.scope === RoleScope.BRANCH) && 
    ur.tenantId === tenantId
  );
};

// Helper to check if user has access to a specific branch
export const hasAccessToBranch = (req: AuthenticatedRequest, branchId: number, tenantId?: number): boolean => {
  if (!req.user) return false;
  
  const isSuperAdmin = req.user.roles.some(r => r.roleName === RoleName.SUPER_ADMIN);
  if (isSuperAdmin) return true;

  return req.user.roles.some(ur => {
    // Tenant admins have access to all branches in their tenant
    if (ur.roleName === RoleName.TENANT_ADMIN && tenantId && ur.tenantId === tenantId) {
      return true;
    }
    // Branch admins and staff only to their branch
    return ur.scope === RoleScope.BRANCH && ur.branchId === branchId;
  });
};

// Get tenant IDs user has access to
export const getAccessibleTenantIds = (req: AuthenticatedRequest): number[] | null => {
  if (!req.user) return [];
  
  const isSuperAdmin = req.user.roles.some(r => r.roleName === RoleName.SUPER_ADMIN);
  if (isSuperAdmin) return null; // null means all

  const tenantIds = new Set<number>();
  req.user.roles.forEach(ur => {
    if (ur.tenantId) tenantIds.add(ur.tenantId);
  });

  return Array.from(tenantIds);
};

// Get branch IDs user has access to
export const getAccessibleBranchIds = (req: AuthenticatedRequest): number[] | null => {
  if (!req.user) return [];
  
  const isSuperAdmin = req.user.roles.some(r => r.roleName === RoleName.SUPER_ADMIN);
  if (isSuperAdmin) return null; // null means all

  // Tenant admins need special handling - return null for their tenant's branches
  const isTenantAdmin = req.user.roles.some(r => r.roleName === RoleName.TENANT_ADMIN);
  if (isTenantAdmin) return null; // Will be filtered by tenant in controller

  const branchIds = new Set<number>();
  req.user.roles.forEach(ur => {
    if (ur.branchId) branchIds.add(ur.branchId);
  });

  return Array.from(branchIds);
};
