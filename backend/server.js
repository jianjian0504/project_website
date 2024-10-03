const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');  // 引入 mysql2 模組

const app = express();
const PORT = 3000;  // 這是你的應用伺服器運行的端口，不是 MySQL 端口

// MySQL 資料庫連接設置
const db = mysql.createConnection({
    host: 'localhost',  // 資料庫主機
    user: 'root',       // 資料庫用戶
    database: 'sql_account',   // 使用的資料庫名稱
    port: 3306           // MySQL 預設port
});

// 連接資料庫
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the MySQL database.');
    }
});

// 中間件設置
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

// 服務靜態文件
app.use(express.static(path.join(__dirname, '../frontend/public')));

// 登入路由
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username or password is missing' });
    }

    // 從資料庫中查詢用戶
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (results.length > 0) {
            // 登入成功
            req.session.user = username;
            res.json({ success: true, message: 'Login successful!' });
        } else {
            // 登入失敗
            res.json({ success: false, message: 'Invalid username or password' });
        }
    });
});

// 登出路由
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logged out');
});

// 處理其他路由，返回 404
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
