#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'booking_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function runFixedMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Add original_price
    console.log('Checking original_price...');
    const originalPriceCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='booking' AND column_name='original_price'
    `);

    if (originalPriceCheck.rowCount === 0) {
      console.log('Adding original_price to booking table...');
      await client.query(`
        ALTER TABLE booking 
        ADD COLUMN original_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
      `);
      await client.query(`
        UPDATE booking SET original_price = total_price WHERE original_price = 0;
      `);
      console.log('  ✅ original_price added and populated');
    } else {
      console.log('  ✓ original_price already exists');
    }

    // 2. Add survey_sent
    console.log('Checking survey_sent...');
    const surveySentCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='booking' AND column_name='survey_sent'
    `);

    if (surveySentCheck.rowCount === 0) {
      console.log('Adding survey_sent to booking table...');
      await client.query(`
        ALTER TABLE booking 
        ADD COLUMN survey_sent BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('  ✅ survey_sent added');
    } else {
      console.log('  ✓ survey_sent already exists');
    }

    // 3. Add discount_id
    console.log('Checking discount_id...');
    const discountIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='booking' AND column_name='discount_id'
    `);

    if (discountIdCheck.rowCount === 0) {
      console.log('Adding discount_id to booking table...');
      // We assume the discount table exists or will be created by sync
      try {
        await client.query(`
          ALTER TABLE booking 
          ADD COLUMN discount_id INTEGER REFERENCES discount(id) ON DELETE SET NULL ON UPDATE CASCADE;
        `);
        console.log('  ✅ discount_id added with foreign key');
      } catch (err) {
        console.log('  ⚠️ Could not add foreign key for discount_id (discount table might not exist yet). Adding column only.');
        await client.query(`
          ALTER TABLE booking 
          ADD COLUMN discount_id INTEGER;
        `);
      }
    } else {
      console.log('  ✓ discount_id already exists');
    }

    console.log('🚀 Finalizing: Verifying constraints...');
    // Ensure the exclusion constraint exists (similar to Server.ts)
    await client.query(`
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
    console.log('  ✅ Exclusion constraint verified');

    console.log('\n✨ Database fix completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration fix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runFixedMigration();
