import dotenv from "dotenv";
dotenv.config();

import sequelize, {
  testConnection,
  syncDatabase,
  initializeExtensions,
} from "./connection";
import {
  Tenant,
  Branch,
  Sport,
  BranchSport,
  Resource,
  AppUser,
  Role,
  UserRole,
  BranchHours,
} from "../models/associations";
import { hashPassword } from "../helpers/password";
import { RoleName, RoleScope } from "../interfaces";

const seedDatabase = async (): Promise<void> => {
  try {
    console.log("🌱 Starting database seed...");

    // Connect and sync
    await testConnection();
    await initializeExtensions();
    await syncDatabase(true); // Force sync (drops tables)

    // Create exclusion constraint
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'booking_no_overlap'
        ) THEN
          ALTER TABLE booking ADD CONSTRAINT booking_no_overlap
          EXCLUDE USING gist (
            resource_id WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
          ) WHERE (status IN ('pending', 'confirmed'));
        END IF;
      END $$;
    `);

    // ============ ROLES ============
    console.log("Creating roles...");
    const roles = await Role.bulkCreate([
      { name: RoleName.SUPER_ADMIN, description: "Full system access" },
      {
        name: RoleName.TENANT_ADMIN,
        description: "Administrates a tenant (company)",
      },
      { name: RoleName.BRANCH_ADMIN, description: "Administrates a branch" },
      { name: RoleName.STAFF, description: "Staff operator" },
    ]);
    const [superAdminRole, tenantAdminRole, branchAdminRole, staffRole] = roles;

    // ============ SPORTS ============
    console.log("Creating sports...");
    const sports = await Sport.bulkCreate([
      { name: "Fútbol", description: "Football/Soccer" },
      { name: "Tenis", description: "Tennis" },
      { name: "Pádel", description: "Padel tennis" },
      { name: "Básquetbol", description: "Basketball" },
      { name: "Voleibol", description: "Volleyball" },
    ]);
    const [futbol, tenis, padel, basquetbol, voleibol] = sports;

    // ============ TENANTS ============
    console.log("Creating tenants...");
    const tenant1 = await Tenant.create({
      name: "Deportes Unidos",
      slug: "deportes-unidos",
      email: "admin@deportesunidos.com",
      phone: "+52 55 1234 5678",
    });

    const tenant2 = await Tenant.create({
      name: "Centro Deportivo Elite",
      slug: "centro-elite",
      email: "admin@centroelite.com",
      phone: "+52 55 8765 4321",
    });

    // ============ BRANCHES ============
    console.log("Creating branches...");

    // Tenant 1 branches
    const branch1T1 = await Branch.create({
      tenantId: tenant1.tenantId,
      name: "Sucursal Norte",
      slug: "sucursal-norte",
      address: "Av. Norte 123, Col. Centro",
      phone: "+52 55 1111 2222",
      timezone: "America/Mexico_City",
    });

    // Tenant 2 branches
    const branch1T2 = await Branch.create({
      tenantId: tenant2.tenantId,
      name: "Elite Centro",
      slug: "elite-centro",
      address: "Calle Principal 456, Col. Roma",
      phone: "+52 55 3333 4444",
      timezone: "America/Mexico_City",
    });

    const branch2T2 = await Branch.create({
      tenantId: tenant2.tenantId,
      name: "Elite Sur",
      slug: "elite-sur",
      address: "Av. Sur 789, Col. Del Valle",
      phone: "+52 55 5555 6666",
      timezone: "America/Mexico_City",
    });

    // ============ BRANCH HOURS ============
    console.log("Creating branch hours...");
    const createBranchHours = async (branchId: number): Promise<void> => {
      const hours = [];
      for (let day = 0; day <= 6; day++) {
        hours.push({
          branchId,
          dayOfWeek: day,
          openTime: day === 0 ? "10:00" : "08:00",
          closeTime: "22:00",
          isClosed: false,
        });
      }
      await BranchHours.bulkCreate(hours);
    };

    await createBranchHours(branch1T1.branchId);
    await createBranchHours(branch1T2.branchId);
    await createBranchHours(branch2T2.branchId);

    // ============ BRANCH SPORTS ============
    console.log("Creating branch sports...");
    await BranchSport.bulkCreate([
      // Tenant 1 - Branch Norte: Fútbol y Tenis
      { branchId: branch1T1.branchId, sportId: futbol.sportId },
      { branchId: branch1T1.branchId, sportId: tenis.sportId },
      // Tenant 2 - Elite Centro: Pádel, Tenis, Básquetbol
      { branchId: branch1T2.branchId, sportId: padel.sportId },
      { branchId: branch1T2.branchId, sportId: tenis.sportId },
      { branchId: branch1T2.branchId, sportId: basquetbol.sportId },
      // Tenant 2 - Elite Sur: Fútbol, Voleibol, Pádel
      { branchId: branch2T2.branchId, sportId: futbol.sportId },
      { branchId: branch2T2.branchId, sportId: voleibol.sportId },
      { branchId: branch2T2.branchId, sportId: padel.sportId },
    ]);

    // ============ RESOURCES (CANCHAS) ============
    console.log("Creating resources...");

    // Tenant 1 - 2 canchas
    await Resource.bulkCreate([
      {
        branchId: branch1T1.branchId,
        sportId: futbol.sportId,
        name: "Cancha Fútbol 1",
        description: "Cancha de fútbol 7 con pasto sintético",
        pricePerHour: 25000,
        currency: "CLP",
      },
      {
        branchId: branch1T1.branchId,
        sportId: tenis.sportId,
        name: "Cancha Tenis A",
        description: "Cancha de tenis con superficie dura",
        pricePerHour: 12000,
        currency: "CLP",
      },
    ]);

    // Tenant 2 - 5 canchas total
    await Resource.bulkCreate([
      // Elite Centro - 3 canchas
      {
        branchId: branch1T2.branchId,
        sportId: padel.sportId,
        name: "Cancha Pádel 1",
        description: "Cancha de pádel techada",
        pricePerHour: 18000,
        currency: "CLP",
      },
      {
        branchId: branch1T2.branchId,
        sportId: padel.sportId,
        name: "Cancha Pádel 2",
        description: "Cancha de pádel al aire libre",
        pricePerHour: 15000,
        currency: "CLP",
      },
      {
        branchId: branch1T2.branchId,
        sportId: basquetbol.sportId,
        name: "Cancha Básquetbol",
        description: "Cancha de básquetbol profesional",
        pricePerHour: 20000,
        currency: "CLP",
      },
      // Elite Sur - 2 canchas
      {
        branchId: branch2T2.branchId,
        sportId: futbol.sportId,
        name: "Cancha Fútbol 5",
        description: "Cancha de fútbol rápido",
        pricePerHour: 18000,
        currency: "CLP",
      },
      {
        branchId: branch2T2.branchId,
        sportId: voleibol.sportId,
        name: "Cancha Voleibol",
        description: "Cancha de voleibol de playa",
        pricePerHour: 12000,
        currency: "CLP",
      },
    ]);

    // ============ USERS ============
    console.log("Creating users...");

    // Super Admin
    const superAdminPassword = await hashPassword("SuperAdmin123!");
    const superAdmin = await AppUser.create({
      email: "superadmin@sistema.com",
      passwordHash: superAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      phone: "+52 55 0000 0001",
    });

    // Tenant Admin for Tenant 1
    const tenantAdmin1Password = await hashPassword("TenantAdmin123!");
    const tenantAdmin1 = await AppUser.create({
      email: "admin@deportesunidos.com",
      passwordHash: tenantAdmin1Password,
      firstName: "Carlos",
      lastName: "García",
      phone: "+52 55 0000 0002",
    });

    // Tenant Admin for Tenant 2
    const tenantAdmin2Password = await hashPassword("TenantAdmin123!");
    const tenantAdmin2 = await AppUser.create({
      email: "admin@centroelite.com",
      passwordHash: tenantAdmin2Password,
      firstName: "María",
      lastName: "López",
      phone: "+52 55 0000 0003",
    });

    // Branch Admin for Tenant 2
    const branchAdminPassword = await hashPassword("BranchAdmin123!");
    const branchAdmin = await AppUser.create({
      email: "branchadmin@centroelite.com",
      passwordHash: branchAdminPassword,
      firstName: "Pedro",
      lastName: "Martínez",
      phone: "+52 55 0000 0004",
    });

    // Staff
    const staffPassword = await hashPassword("Staff123!");
    const staff = await AppUser.create({
      email: "staff@centroelite.com",
      passwordHash: staffPassword,
      firstName: "Ana",
      lastName: "Rodríguez",
      phone: "+52 55 0000 0005",
    });

    // Regular user for testing
    const userPassword = await hashPassword("User123!");
    const regularUser = await AppUser.create({
      email: "usuario@test.com",
      passwordHash: userPassword,
      firstName: "Juan",
      lastName: "Pérez",
      phone: "+52 55 0000 0006",
    });

    // ============ USER ROLES ============
    console.log("Assigning roles...");
    await UserRole.bulkCreate([
      // Super Admin - global
      {
        userId: superAdmin.userId,
        roleId: superAdminRole.roleId,
        scope: RoleScope.GLOBAL,
      },
      // Tenant Admin 1 - tenant scope
      {
        userId: tenantAdmin1.userId,
        roleId: tenantAdminRole.roleId,
        scope: RoleScope.TENANT,
        tenantId: tenant1.tenantId,
      },
      // Tenant Admin 2 - tenant scope
      {
        userId: tenantAdmin2.userId,
        roleId: tenantAdminRole.roleId,
        scope: RoleScope.TENANT,
        tenantId: tenant2.tenantId,
      },
      // Branch Admin - branch scope
      {
        userId: branchAdmin.userId,
        roleId: branchAdminRole.roleId,
        scope: RoleScope.BRANCH,
        tenantId: tenant2.tenantId,
        branchId: branch1T2.branchId,
      },
      // Staff - branch scope
      {
        userId: staff.userId,
        roleId: staffRole.roleId,
        scope: RoleScope.BRANCH,
        tenantId: tenant2.tenantId,
        branchId: branch2T2.branchId,
      },
    ]);

    console.log("");
    console.log("✅ Database seeded successfully!");
    console.log("");
    console.log("========== TEST USERS ==========");
    console.log("");
    console.log("Super Admin:");
    console.log("  Email: superadmin@sistema.com");
    console.log("  Password: SuperAdmin123!");
    console.log("");
    console.log("Tenant Admin (Deportes Unidos):");
    console.log("  Email: admin@deportesunidos.com");
    console.log("  Password: TenantAdmin123!");
    console.log("");
    console.log("Tenant Admin (Centro Elite):");
    console.log("  Email: admin@centroelite.com");
    console.log("  Password: TenantAdmin123!");
    console.log("");
    console.log("Branch Admin (Centro Elite - Elite Centro):");
    console.log("  Email: branchadmin@centroelite.com");
    console.log("  Password: BranchAdmin123!");
    console.log("");
    console.log("Staff (Centro Elite - Elite Sur):");
    console.log("  Email: staff@centroelite.com");
    console.log("  Password: Staff123!");
    console.log("");
    console.log("Regular User:");
    console.log("  Email: usuario@test.com");
    console.log("  Password: User123!");
    console.log("");
    console.log("================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
