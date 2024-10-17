const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt'); // 用於密碼加密

const app = express();
const PORT = 3000;

// ======== MySQL 資料庫連接設置 ========
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'sql_account',
    port: 3306
});

// 連接資料庫
db.connect((err) => {
    if (err) {
        console.error('資料庫連線錯誤:', err);
    } else {
        console.log('已成功連接 MySQL 資料庫。');
    }
});

// ======== 中間件設置 ========
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// ======== 登入路由 ========
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: '請提供帳號和密碼' });
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('資料庫查詢錯誤:', err);
            return res.status(500).json({ success: false, message: '內部伺服器錯誤' });
        }

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: '無效的帳號或密碼' });
        }

        const user = results[0]; // 取得用戶資料

        // 使用 bcrypt 比對密碼
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('密碼比對錯誤:', err);
                return res.status(500).json({ success: false, message: '內部伺服器錯誤' });
            }

            if (isMatch) {
                req.session.user = username; // 儲存 session
                res.json({ success: true, message: '登入成功！' });
            } else {
                res.status(400).json({ success: false, message: '無效的帳號或密碼' });
            }
        });
    });
});

// ======== 註冊路由 ========
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: '請提供帳號和密碼' });
    }

    // 檢查帳號是否已存在
    const checkQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkQuery, [username], (err, results) => {
        if (err) {
            console.error('資料庫查詢錯誤:', err);
            return res.status(500).json({ success: false, message: '內部伺服器錯誤' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: '該帳號已存在' });
        }

        // 加密密碼並儲存新使用者
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('密碼加密錯誤:', err);
                return res.status(500).json({ success: false, message: '密碼加密失敗' });
            }

            const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
            db.query(insertQuery, [username, hashedPassword], (err, result) => {
                if (err) {
                    console.error('插入資料錯誤:', err);
                    return res.status(500).json({ success: false, message: '註冊失敗，請稍後再試' });
                }

                res.json({ success: true, message: '註冊成功' });
            });
        });
    });
});

// ======== 登出路由 ========
app.get('/logout', (req, res) => {
    req.session.destroy(); // 清除 session
    res.send('已登出');
});

// ======== 處理 404 錯誤 ========
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// ======== 啟動伺服器 ========
app.listen(PORT, () => {
    console.log(`伺服器正在運行於 http://localhost:${PORT}`);
});
