import sequelize from "./src/db/connection";
import { QueryTypes } from "sequelize";

async function checkConstraints() {
  try {
    const rawQuery = `
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE table_name = 'branch' AND constraint_type = 'FOREIGN KEY';
    `;
    const results = await sequelize.query(rawQuery, { type: QueryTypes.SELECT });
    console.log("Foreign keys on branch table:", results);
    
    const alterQuery = `ALTER TABLE branch ADD CONSTRAINT branch_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE ON UPDATE CASCADE;`;
    
    // Attempting to add it so that Sequelize can safely drop it next time
    console.log("Attempting to add constraint manually...");
    await sequelize.query(alterQuery);
    console.log("Constraint added.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkConstraints();
