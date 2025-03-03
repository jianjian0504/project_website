const mysql = require('mysql2/promise');

// 建立 MySQL 連線池（推薦用 connection pool，效能較好）
const pool = mysql.createPool({
    host: '120.101.8.216',
    user: 'username',
    password: 'password',
    database: 'sql_account',
    port:3306,
    waitForConnections: true,
    connectionLimit: 10, // 最大連線數
    queueLimit: 0
});

// 匯出 pool，讓其他檔案可以使用
module.exports = pool;
