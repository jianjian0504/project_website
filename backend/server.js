const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const http = require('http');  // 需要 http 模組來啟動伺服器
const os = require('os');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const networkInterfaces = os.networkInterfaces();
require('dotenv').config(); // 引入並配置 dotenv

const app = express();
const PORT = 4000;
// ======== MySQL 資料庫連接設置 ========

const db = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
});

// 這段程式碼在 `mysql2/promise` 不能用
db.connect((err) => {
    if (err) {
        console.error('❌ 連線失敗:', err);
    } else {
        console.log('✅ MySQL 連線成功');
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
                    AND pd.date >= DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY)
                    AND pd.date < DATE_ADD(DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY), INTERVAL 7 DAY)
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


// Nodemailer 設定 (使用 Gmail 為例)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

// 儲存設定並發送 email
app.post('/settings', async (req, res) => {
    const { email, profilePic } = req.body;
    const userId = req.session.user?.id;

    if (!email || !userId) {
        return res.status(400).json({ success: false, message: 'Email 和 userId 為必填欄位' });
    }

    try {
        console.log('儲存資料:', { email, userId });
        const queryResult = await db.execute(
            'UPDATE users SET email = ? WHERE id = ?',
            [email, userId]
        );
        console.log('查詢結果:', queryResult);

        let profilePicUrl = null;
        if (profilePic && profilePic.startsWith('data:image')) {
            const base64Data = profilePic.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `profile_${userId}_${Date.now()}.png`;
            const filePath = path.join(__dirname, 'public/uploads', fileName);
            await fs.writeFile(filePath, buffer);
            profilePicUrl = `/uploads/${fileName}`;

            const updatePicResult = await db.execute(
                'UPDATE users SET profile_pic_url = ? WHERE id = ?',
                [profilePicUrl, userId]
            );
            console.log('大頭照更新結果:', updatePicResult);
        }

        const mailOptions = {
            from: 'nicknicklive123@gmail.com',
            to: email,
            subject: '設定更新確認',
            html: `<h2>設定已更新</h2><p>您的 email 已更新為：${email}</p>`
        };
        await transporter.sendMail(mailOptions);

        res.json({ success: true, profilePicUrl });
    } catch (error) {
        console.error('儲存設定失敗:', error);
        res.status(500).json({ success: false, message: '儲存設定失敗', error: error.message });
    }
});

app.get('/user-info', async (req, res) => {
    const userId = req.session.user?.id;
    console.log('User ID from session:', userId); // 檢查 session

    if (!userId) {
        return res.json({
            username: '訪客',
            profilePicUrl: 'default.png',
            email: '尚未註冊',
        });
    }

    try {
        const [rows] = await db.execute(
            'SELECT username, email, profile_pic_url FROM users WHERE id = ?',
            [userId]
        );
        const user = rows[0];
        console.log('查詢結果:', user); // 檢查查詢結果

        res.json({
            username: user?.username || '訪客',
            profilePicUrl: user?.profile_pic_url || 'default.png',
            email: user?.email || '尚未註冊',
        });
    } catch (error) {
        console.error('獲取用戶資訊失敗:', error);
        res.status(500).json({ error: '無法獲取用戶資訊' });
    }
});



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

// 使用 http 模組建立 HTTP 伺服器
const server = http.createServer(app);

// 啟動伺服器
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`伺服器運行於 http://${localIP}:${PORT}`);
});
