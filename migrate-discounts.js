const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('booking_platform', 'postgres', 'postgres123', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres',
  logging: false
});

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected.');
  
  // 2. Migrate existing references
  // Check if resource_id still exists in discount table
  try {
     await sequelize.query(`
      INSERT INTO discount_resource (discount_id, resource_id, created_at, updated_at)
      SELECT id, resource_id, NOW(), NOW() FROM discount WHERE resource_id IS NOT NULL
      ON CONFLICT DO NOTHING;
     `);
     console.log('Migrated existing resource_id references.');
     
     // 3. Drop resource_id constraint and column
     // First find the constraint name
     const [fks] = await sequelize.query(`
        SELECT constraint_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'discount' AND column_name = 'resource_id';
     `);
     for (const fk of fks) {
       await sequelize.query(`ALTER TABLE discount DROP CONSTRAINT IF EXISTS ${fk.constraint_name}`);
     }
     await sequelize.query(`ALTER TABLE discount DROP COLUMN IF EXISTS resource_id;`);
     console.log('Dropped resource_id column from discount.');
  } catch (err) {
     console.log('resource_id column might already be dropped or an error occurred.', err.message);
  }

  process.exit(0);
}

migrate().catch(console.error);
