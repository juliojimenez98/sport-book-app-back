const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('booking_platform', 'postgres', 'postgres123', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres',
  logging: false
});

async function find() {
  await sequelize.authenticate();
  const resources = await sequelize.query(`
    SELECT * FROM resource LIMIT 5;
  `, { type: QueryTypes.SELECT });
  const discounts = await sequelize.query(`
    SELECT * from discount_resource;
  `, { type: QueryTypes.SELECT });
  
  console.log("Resources:", resources.map(r => r.id));
  console.log("Discount associations:", discounts);
  process.exit(0);
}

find().catch(console.error);
