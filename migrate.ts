import sequelize from "./src/db/connection";

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB.");

    // Add original_price (using current total_price as default to avoid null constraint failure)
    await sequelize.query(`
      ALTER TABLE booking 
      ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
    `);

    // Update original_price to match total_price for existing rows
    await sequelize.query(`
      UPDATE booking SET original_price = total_price WHERE original_price = 0;
    `);

    // Add survey_sent
    await sequelize.query(`
      ALTER TABLE booking 
      ADD COLUMN IF NOT EXISTS survey_sent BOOLEAN NOT NULL DEFAULT false;
    `);

    // For discount_id we must wait until the Discount table is created by sync.
    // Sync will create Discount and SurveyResponse.
    await sequelize.sync({ alter: false });
    
    // Now we can safely add discount_id
    await sequelize.query(`
      ALTER TABLE booking 
      ADD COLUMN IF NOT EXISTS discount_id INTEGER REFERENCES discount(id) ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
