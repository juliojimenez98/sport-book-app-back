import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME || 'booking_platform';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

/**
 * Pre-inject all known FK constraints that Sequelize's alter mode
 * expects to exist before it tries to DROP + recreate them.
 * This prevents SequelizeUnknownConstraintError on alter sync.
 */
const ensureConstraints = async (): Promise<void> => {
  const knownConstraints: { table: string; constraint: string; sql: string }[] = [
    {
      table: 'branch',
      constraint: 'branch_tenant_id_fkey',
      sql: 'ALTER TABLE branch ADD CONSTRAINT branch_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'branch_sport',
      constraint: 'branch_sport_branch_id_fkey',
      sql: 'ALTER TABLE branch_sport ADD CONSTRAINT branch_sport_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'branch_sport',
      constraint: 'branch_sport_sport_id_fkey',
      sql: 'ALTER TABLE branch_sport ADD CONSTRAINT branch_sport_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'resource',
      constraint: 'resource_branch_id_fkey',
      sql: 'ALTER TABLE resource ADD CONSTRAINT resource_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'resource',
      constraint: 'resource_sport_id_fkey',
      sql: 'ALTER TABLE resource ADD CONSTRAINT resource_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES sport(id) ON DELETE SET NULL ON UPDATE CASCADE',
    },
    {
      table: 'app_user',
      constraint: 'app_user_tenant_id_fkey',
      sql: 'ALTER TABLE app_user ADD CONSTRAINT app_user_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'user_role',
      constraint: 'user_role_user_id_fkey',
      sql: 'ALTER TABLE user_role ADD CONSTRAINT user_role_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'user_role',
      constraint: 'user_role_role_id_fkey',
      sql: 'ALTER TABLE user_role ADD CONSTRAINT user_role_role_id_fkey FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'booking',
      constraint: 'booking_branch_id_fkey',
      sql: 'ALTER TABLE booking ADD CONSTRAINT booking_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'booking',
      constraint: 'booking_resource_id_fkey',
      sql: 'ALTER TABLE booking ADD CONSTRAINT booking_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resource(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'booking',
      constraint: 'booking_tenant_id_fkey',
      sql: 'ALTER TABLE booking ADD CONSTRAINT booking_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'branch_image',
      constraint: 'branch_image_branch_id_fkey',
      sql: 'ALTER TABLE branch_image ADD CONSTRAINT branch_image_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'tenant_image',
      constraint: 'tenant_image_tenant_id_fkey',
      sql: 'ALTER TABLE tenant_image ADD CONSTRAINT tenant_image_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
    {
      table: 'resource_image',
      constraint: 'resource_image_resource_id_fkey',
      sql: 'ALTER TABLE resource_image ADD CONSTRAINT resource_image_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resource(id) ON DELETE CASCADE ON UPDATE CASCADE',
    },
  ];

  for (const { table, constraint, sql } of knownConstraints) {
    try {
      // Check if table exists first
      const [tableRows] = await sequelize.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        { bind: [table], type: 'SELECT' as any }
      );
      if (!tableRows || (tableRows as any[]).length === 0) continue;

      // Check if constraint already exists
      const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name=$1 AND table_name=$2`,
        { bind: [constraint, table], type: 'SELECT' as any }
      );
      if (!rows || (rows as any[]).length === 0) {
        await sequelize.query(sql);
        console.log(`  ✅ Pre-injected FK: ${constraint}`);
      }
    } catch {
      // Ignore — might fail if parent table doesn't exist yet (first run)
    }
  }
};

export const syncDatabase = async (force = false): Promise<void> => {
  try {
    if (!force && process.env.NODE_ENV === 'development') {
      await ensureConstraints();
    }
    // Never use alter: true in dev as it causes Postgres constraint drop errors
    // with freezeTableName and underscored options due to quoting bugs in Sequelize.
    await sequelize.sync({ force, alter: false });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

export const initializeExtensions = async (): Promise<void> => {
  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');
    console.log('✅ PostgreSQL extensions initialized.');
  } catch (error) {
    console.error('❌ Error initializing extensions:', error);
    throw error;
  }
};

export default sequelize;

