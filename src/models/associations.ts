// Model associations setup
import Tenant from './Tenant';
import Branch from './Branch';
import Sport from './Sport';
import BranchSport from './BranchSport';
import Resource from './Resource';
import AppUser from './AppUser';
import Guest from './Guest';
import Booking from './Booking';
import BookingCancellation from './BookingCancellation';
import Role from './Role';
import UserRole from './UserRole';
import BranchHours from './BranchHours';
import RefreshToken from './RefreshToken';

// ============ TENANT ASSOCIATIONS ============
Tenant.hasMany(Branch, { foreignKey: 'tenantId', as: 'branches' });
Tenant.hasMany(Guest, { foreignKey: 'tenantId', as: 'guests' });
Tenant.hasMany(Booking, { foreignKey: 'tenantId', as: 'bookings' });
Tenant.hasMany(UserRole, { foreignKey: 'tenantId', as: 'userRoles' });

// ============ BRANCH ASSOCIATIONS ============
Branch.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Branch.hasMany(BranchSport, { foreignKey: 'branchId', as: 'branchSports' });
Branch.hasMany(Resource, { foreignKey: 'branchId', as: 'resources' });
Branch.hasMany(Booking, { foreignKey: 'branchId', as: 'bookings' });
Branch.hasMany(BranchHours, { foreignKey: 'branchId', as: 'branchHours' });
Branch.hasMany(UserRole, { foreignKey: 'branchId', as: 'userRoles' });

// Many-to-many: Branch <-> Sport through BranchSport
Branch.belongsToMany(Sport, { through: BranchSport, foreignKey: 'branchId', as: 'sports' });
Sport.belongsToMany(Branch, { through: BranchSport, foreignKey: 'sportId', as: 'branches' });

// ============ SPORT ASSOCIATIONS ============
Sport.hasMany(BranchSport, { foreignKey: 'sportId', as: 'branchSports' });
Sport.hasMany(Resource, { foreignKey: 'sportId', as: 'resources' });

// ============ BRANCH SPORT ASSOCIATIONS ============
BranchSport.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
BranchSport.belongsTo(Sport, { foreignKey: 'sportId', as: 'sport' });

// ============ RESOURCE ASSOCIATIONS ============
Resource.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Resource.belongsTo(Sport, { foreignKey: 'sportId', as: 'sport' });
Resource.hasMany(Booking, { foreignKey: 'resourceId', as: 'bookings' });

// ============ APP USER ASSOCIATIONS ============
AppUser.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
AppUser.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
AppUser.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
AppUser.hasMany(BookingCancellation, { foreignKey: 'cancelledBy', as: 'cancellations' });

// ============ GUEST ASSOCIATIONS ============
Guest.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Guest.hasMany(Booking, { foreignKey: 'guestId', as: 'bookings' });

// ============ BOOKING ASSOCIATIONS ============
Booking.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Booking.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Booking.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });
Booking.belongsTo(AppUser, { foreignKey: 'userId', as: 'user' });
Booking.belongsTo(Guest, { foreignKey: 'guestId', as: 'guest' });
Booking.hasOne(BookingCancellation, { foreignKey: 'bookingId', as: 'cancellation' });

// ============ BOOKING CANCELLATION ASSOCIATIONS ============
BookingCancellation.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
BookingCancellation.belongsTo(AppUser, { foreignKey: 'cancelledBy', as: 'cancelledByUser' });

// ============ ROLE ASSOCIATIONS ============
Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'userRoles' });

// ============ USER ROLE ASSOCIATIONS ============
UserRole.belongsTo(AppUser, { foreignKey: 'userId', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
UserRole.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
UserRole.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

// ============ BRANCH HOURS ASSOCIATIONS ============
BranchHours.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

// ============ REFRESH TOKEN ASSOCIATIONS ============
RefreshToken.belongsTo(AppUser, { foreignKey: 'userId', as: 'user' });

// Export all models
export {
  Tenant,
  Branch,
  Sport,
  BranchSport,
  Resource,
  AppUser,
  Guest,
  Booking,
  BookingCancellation,
  Role,
  UserRole,
  BranchHours,
  RefreshToken,
};
