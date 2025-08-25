// const { Pool, Client } = require('pg');
// require('dotenv').config();

// // Option 1: Use connection string (external DB)
// const getConnection = () => {
//   return new Client({
//     connectionString: process.env.DATABASE_URL,
//     ssl: {
//       rejectUnauthorized: false // needed for cloud providers
//     }
//   });
// };

// // Option 2: Use pool (local DB)
// const pool = new Pool({
//   user: process.env.LOCAL_USER || "postgres",
//   host: process.env.LOCAL_HOST || "localhost",
//   database: process.env.LOCAL_DB || "sacatalog",
//   password: process.env.LOCAL_PASSWORD || "kasi",
//   port: process.env.LOCAL_PORT || 5432
// });

// // Test pool connection
// pool.connect((err, client, release) => {
//   if (err) {
//     return console.error('❌ Error acquiring client', err.stack);
//   }
//   client.query('SELECT NOW()', (err, result) => {
//     release();
//     if (err) {
//       return console.error('❌ Error executing test query', err.stack);
//     }
//     console.log('✅ Database connected:', result.rows[0].now);
//   });
// });

// module.exports = { pool, getConnection };
