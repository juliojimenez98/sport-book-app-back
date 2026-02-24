const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('booking_platform', 'postgres', 'postgres123', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres',
  logging: false
});

async function find() {
  await sequelize.authenticate();
  const discounts = await sequelize.query(`
    SELECT * FROM discount ORDER BY created_at DESC LIMIT 5;
  `, { type: QueryTypes.SELECT });
  
  console.log("Recent discounts:", discounts);
  process.exit(0);
}

find().catch(console.error);
