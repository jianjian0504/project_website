const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const http = require('http');  // 需要 http 模組來啟動伺服器
const WebSocket = require('ws');  // 引入 ws 模組
const os = require('os');
const networkInterfaces = os.networkInterfaces();

const app = express();
const PORT = 4000;

// ======== MySQL 資料庫連接設置 ========
const db = mysql.createConnection({
    host: '120.101.8.216',
    user: 'username',
    password: 'password',
    database: 'sql_account',
    port: 3306,
    //timezone: 'UTC+8' // 使用 UTC+8 的偏移量
});

db.connect((err) => {
    if (err) {
        console.error('資料庫連線錯誤:', err);
    } else {
        console.log('已成功連接 MySQL 資料庫。');
    }
});

// ======== 中間件設置 ========
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Session 設置
app.use(
    session({
        secret: 'your_secret_key', 
        resave: false,
        saveUninitialized: false, 
        cookie: { maxAge: 1800000 } // 設定 Session 有效期 30 分鐘
    })
);

// ======== 驗證使用者登入狀態的中介函數 ========
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: '未登入，請先登入' });
    }
}

// ======== 登入路由 ========
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: '請提供帳號和密碼' });
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) return res.status(500).json({ message: '內部伺服器錯誤' });

        if (results.length === 0) {
            return res.status(400).json({ message: '無效的帳號或密碼' });
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ message: '伺服器錯誤' });

            if (isMatch) {
                req.session.user = { id: user.id, username: user.username }; // 儲存使用者資訊於 Session
                res.json({ success: true, message: '登入成功！' });
            } else {
                res.status(400).json({ message: '帳號或密碼錯誤' });
            }
        });
    });
});

// ======== 註冊路由 ========
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '請提供帳號和密碼' });
    }

    const checkQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkQuery, [username], (err, results) => {
        if (err) return res.status(500).json({ message: '內部伺服器錯誤' });

        if (results.length > 0) {
            return res.status(400).json({ message: '該帳號已存在' });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).json({ message: '密碼加密失敗' });

            const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
            db.query(insertQuery, [username, hashedPassword], (err) => {
                if (err) return res.status(500).json({ message: '註冊失敗' });

                res.json({ success: true, message: '註冊成功' });
            });
        });
    });
});

// ======== 取得個人用電資訊 API ========
app.get('/power-data', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const chosenMonth = req.query.month; // 前端傳入的月份，例如 "2023-08"
    let query = '';
    let params = [userId];

    if (chosenMonth) {
        query = `
            SELECT 
                pd.device_id,
                
                pd.power_usage AS total_usage,
                pd.date,
                DATE_FORMAT(pd.date, '%Y-%m-%d') AS label
            FROM power_data pd
            JOIN devices d ON pd.device_id = d.id
            WHERE 
                pd.user_id = ? 
                AND DATE_FORMAT(pd.date, '%Y-%m') = ?
            ORDER BY pd.device_id, pd.date ASC;
        `;
        params.push(chosenMonth);
    } else {
        const timeRange = req.query.timeRange || 'day';
        if (timeRange === 'hour') {
            query = `
              SELECT 
                  pd.device_id,
                  pd.power_usage AS total_usage,
                  pd.date,
                  DATE_FORMAT(pd.date, '%H:00') AS label
              FROM power_data pd
              JOIN devices d ON pd.device_id = d.id
              WHERE 
                  pd.user_id = ? 
                  AND DATE_FORMAT(pd.date, '%Y-%m-%d %H') = DATE_FORMAT(NOW(), '%Y-%m-%d %H')
                  AND pd.date <= NOW()
              ORDER BY pd.device_id, pd.date ASC;
            `;
        } else if (timeRange === 'day') {
            const dateParam = req.query.date;
            let dateCondition;
            if (dateParam) {
                dateCondition = 'DATE(pd.date) = ?';
                params.push(dateParam);
            } else {
                dateCondition = 'DATE(pd.date) = DATE(NOW())';
            }
        
            query = `
                SELECT 
                    pd.device_id,
                    pd.power_usage AS total_usage,
                    pd.date,
                    DATE_FORMAT(pd.date, '%H:00') AS label
                FROM power_data pd
                JOIN devices d ON pd.device_id = d.id
                WHERE 
                    pd.user_id = ? 
                    AND ${dateCondition}
                    AND pd.date <= NOW()
                ORDER BY pd.device_id, pd.date ASC;
            `;
        } else if (timeRange === 'week') {
            query = `
                SELECT 
                    pd.device_id,
                    pd.power_usage AS total_usage,
                    pd.date,
                    DATE_FORMAT(pd.date, '%Y-%m-%d') AS label
                FROM power_data pd
                JOIN devices d ON pd.device_id = d.id
                WHERE 
                    pd.user_id = ? 
                    AND YEARWEEK(pd.date) = YEARWEEK(NOW())
                    AND pd.date <= NOW()
                ORDER BY pd.device_id, pd.date ASC;
            `;
        } else if (timeRange === 'month') {
            query = `
                SELECT 
                    pd.device_id,
                    pd.power_usage AS total_usage,
                    pd.date,
                    DATE_FORMAT(pd.date, '%Y-%m-%d') AS label
                FROM power_data pd
                JOIN devices d ON pd.device_id = d.id
                WHERE 
                    pd.user_id = ? 
                    AND DATE_FORMAT(pd.date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
                    AND pd.date <= NOW()
                ORDER BY pd.device_id, pd.date ASC;
            `;
        } else {
            query = `
                SELECT 
                    pd.device_id,
                    pd.power_usage AS total_usage,
                    pd.date,
                    DATE_FORMAT(pd.date, '%Y-%m-%d') AS label
                FROM power_data pd
                JOIN devices d ON pd.device_id = d.id
                WHERE 
                    pd.user_id = ? 
                    AND pd.date >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                ORDER BY pd.device_id, pd.date ASC;
            `;
        }
    }
    

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('查詢失敗:', err);
            return res.status(500).json({ message: '無法取得用電資訊', error: err });
        }
        res.json(results);
    });
}
);

// ======== 取得個人統計數據 API ========
// 此 API 回傳整體（所有裝置）的時序數據，使用資料庫完成累計加總統計，再將結果傳回前端
/*app.get('/power-stats', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const timeRange = req.query.timeRange || 'day';
    
    if(timeRange === 'hour'){
        const query = `
            SELECT SUM(power_usage) AS total_usage
            FROM power_data
            WHERE user_id = ? 
            AND DATE_FORMAT(date, '%Y-%m-%d %H') = DATE_FORMAT(NOW(), '%Y-%m-%d %H')
            AND date <= NOW()
        `;
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error("DB query error in /power-stats (hour):", err);
                return res.status(500).json({ message: '無法取得統計數據', error: err });
            }
            const row = results[0] || { total_usage: 0 };
            res.json({ overallTimeseries: [row.total_usage] });
        });
    } else {
        let dateCondition = '';
        switch(timeRange) {
            case 'day':
                dateCondition = 'DATE(date) = DATE(NOW()) AND date <= NOW()';
                break;
            case 'week':
                dateCondition = 'YEARWEEK(date) = YEARWEEK(NOW()) AND date <= NOW()';
                break;
            case 'month':
                dateCondition = 'DATE_FORMAT(date, "%Y-%m") = DATE_FORMAT(NOW(), "%Y-%m") AND date <= NOW()';
                break;
            default:
                dateCondition = 'DATE(date) = DATE(NOW()) AND date <= NOW()';
                break;
        }
        
        const query = `
            SELECT SUM(power_usage) AS total_usage
            FROM power_data
            WHERE user_id = ? AND ${dateCondition}
        `;
        
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error("DB query error in /power-stats:", err);
                return res.status(500).json({ message: '無法取得統計數據', error: err });
            }
            const row = results[0] || { total_usage: 0 };
            res.json({ overallTimeseries: [row.total_usage] });
        });
    }
});*/

// ======== 儲存用電資訊 API ========
/*app.post('/power-data', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { powerUsage, date } = req.body;

    const query = 'INSERT INTO power_data (user_id, power_usage, date) VALUES (?, ?, ?)';
    db.query(query, [userId, powerUsage, date], (err) => {
        if (err) return res.status(500).json({ message: '儲存失敗' });
        res.json({ success: true, message: '用電資訊已儲存' });
    });
});*/


// ======== 新增裝置 API ========
app.post('/devices', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { deviceName, contractAddress } = req.body;

    if (!deviceName || !contractAddress) {
        return res.status(400).json({ message: '請提供裝置名稱和合約地址' });
    }

    // 驗證合約地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return res.status(400).json({ message: '無效的合約地址格式' });
    }

    const query = 'INSERT INTO devices (user_id, device_name, contract_address) VALUES (?, ?, ?)';
    db.query(query, [userId, deviceName, contractAddress], (err) => {
        if (err) return res.status(500).json({ message: '新增裝置失敗' });
        res.json({ success: true, message: '裝置已新增' });
    });
});

// ======== 取得用戶裝置 API ========
app.get('/devices', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const query = 'SELECT * FROM devices WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: '無法取得裝置資訊' });
        res.json(results);
    });
});

// ======== 設定表單提交 API ========
app.post('/settings', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { email, profilePic } = req.body;

    const query = 'UPDATE users SET email = ?, profile_pic = ? WHERE id = ?';
    db.query(query, [email, profilePic, userId], (err) => {
        if (err) return res.status(500).json({ message: '儲存失敗' });
        res.json({ 
            success: true, 
            message: '設定已儲存',
            profilePicUrl: profilePic 
        });
    });
});

// ======== 登出路由 ========
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: '無法登出' });
        res.json({ message: '已登出' });
    });
});

// ======== 新增用戶資訊 API，取得目前登入用戶的 username ========
app.get('/user-info', isAuthenticated, (req, res) => {
    if (req.session && req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.status(401).json({ message: '未登入' });
    }
});

// ======== 檢查用戶是否已登入的 API ========
app.get('/check-auth', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// ======== 取得用戶設定 API ========
app.get('/user-settings', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const query = 'SELECT email, profile_pic FROM users WHERE id = ?';
    
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: '無法取得設定' });
        if (results.length === 0) return res.status(404).json({ message: '找不到用戶' });
        
        res.json({
            email: results[0].email,
            profilePicUrl: results[0].profile_pic
        });
    });
});

// ======== 處理 404 錯誤 ========
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// ======== 啟動伺服器 ========
function getLocalIPAddress() {
    for (const iface of Object.values(networkInterfaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) {
                return details.address;
            }
        }
    }
    return 'localhost'; // 如果無法找到 IP，就返回 localhost
}

// 使用 http 模組建立 HTTP 伺服器，讓 WebSocket 等功能也能正常運作
const server = http.createServer(app);

// 啟動伺服器
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`伺服器運行於 http://${localIP}:${PORT}`);
});

