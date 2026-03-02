import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5433,
  database: 'booking_platform',
  user: 'postgres',
  password: 'postgres123',
});

await client.connect();

// Show current state
const branches = await client.query(`SELECT id, name, requires_address FROM branch LIMIT 10;`);
console.log('\nBranches:');
branches.rows.forEach(r => console.log(`  [${r.id}] ${r.name} => requiresAddress: ${r.requires_address}`));

const tenants = await client.query(`SELECT id, name, requires_address FROM tenant LIMIT 10;`);
console.log('\nTenants:');
tenants.rows.forEach(r => console.log(`  [${r.id}] ${r.name} => requiresAddress: ${r.requires_address}`));

// Show user address
const users = await client.query(`SELECT id, email, address FROM app_user WHERE email = 'j.jimenezv098@gmail.com';`);
console.log('\nUser:');
users.rows.forEach(r => console.log(`  [${r.id}] ${r.email} => address: ${r.address}`));

await client.end();
