import sequelize from "./src/db/connection";
import { Discount } from "./src/models";

async function test() {
  await sequelize.authenticate();
  console.log("DB connected");
  try {
    const d = await Discount.create({
      tenantId: 1,
      branchId: 1,
      name: "Test Multi",
      type: "percentage",
      value: 10,
      conditionType: "promo_code",
      code: "TESTMULTI",
      resourceIds: [1, 2] // The missing column that might be failing
    } as any);
    console.log("Success!", d.toJSON());
  } catch (err: any) {
    console.error("Sequelize Error:", err.message);
  }
  process.exit(0);
}
test();
