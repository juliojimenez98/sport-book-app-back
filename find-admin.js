const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('booking_platform', 'postgres', 'postgres123', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres',
  logging: false
});

async function find() {
  await sequelize.authenticate();
  const users = await sequelize.query(`
    SELECT u.email, r.name as role_name
    FROM app_user u
    JOIN user_role ur ON u.id = ur.user_id
    JOIN role r ON ur.role_id = r.id
    WHERE r.name IN ('tenant_admin', 'super_admin', 'branch_admin');
  `, { type: QueryTypes.SELECT });
  
  console.log("Admins:", users);
  process.exit(0);
}

find().catch((e) => {
  console.error("DB Error:", e);
  process.exit(1);
});
