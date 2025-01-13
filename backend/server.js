const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const http = require('http');  // 需要 http 模組來啟動伺服器
const WebSocket = require('ws');  // 引入 ws 模組
const os = require('os');
const networkInterfaces = os.networkInterfaces();

const app = express();
const PORT = 4000;

// ======== MySQL 資料庫連接設置 ========
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'sql_account',
    port: 3306
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
        cookie: { maxAge: 600000 } // 設定 Session 有效期 10 分鐘
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

    const query = 'SELECT * FROM power_data WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: '無法取得用電資訊' });
        res.json(results);
    });
});

// ======== 儲存用電資訊 API ========
app.post('/power-data', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const { powerUsage, date } = req.body;

    const query = 'INSERT INTO power_data (user_id, power_usage, date) VALUES (?, ?, ?)';
    db.query(query, [userId, powerUsage, date], (err) => {
        if (err) return res.status(500).json({ message: '儲存失敗' });
        res.json({ success: true, message: '用電資訊已儲存' });
    });
});

// ======== 登出路由 ========
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: '無法登出' });
        res.json({ message: '已登出' });
    });
});

// ======== 處理 404 錯誤 ========
app.use((req, res) => {
    res.status(404).send('Not Found');
});



let apower = 0; // 在作用域頂部宣告變數，用來儲存來自 WebSocket 的 apower 值
let total_kWh=0;
// ======== WebSocket 設置 ========

// 創建 HTTP 伺服器來支持 WebSocket
const server = http.createServer(app);

// 創建 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

// 當 WebSocket 連線建立時
wss.on('connection', (ws) => {
    console.log('有新的 WebSocket 連線');

    // 處理 WebSocket 傳來的訊息
    ws.on('message', (message) => {
        try {
            // 解析收到的訊息
            const data = JSON.parse(message);

            // 檢查是否包含 `result.apower` 並提取其值
            if (data.result && typeof data.result.apower === 'number') {
                apower = data.result.apower;  // 更新 apower 的值
                console.log(`更新的 apower 值: ${apower}`);
            } else {
                console.error('訊息中不包含有效的 apower 資料');
                ws.send('無效的資料格式');
            }

            if (data.result && typeof data.result.total_kWh === 'number') {
                total_kWh = data.result.total_kWh;  // 更新 apower 的值
                console.log(`更新的 total_kWh 值: ${total_kWh}`);
            } else {
                console.error('訊息中不包含有效的 total_kwh 資料');
                ws.send('無效的資料格式');
            }
        } catch (error) {
            console.error('無法解析訊息:', error);
            ws.send('解析錯誤');
        }
    });

    // 當 WebSocket 連線關閉時
    ws.on('close', () => {
        console.log('客戶端已斷線');
    });
});

// 創建另一個 WebSocket 伺服器，用來向前端傳送 apower 數據
const wss2 = new WebSocket.Server({ port: 8080 });

wss2.on('connection', (ws) => {
    console.log('前端已連線');
    
    // 定時每秒傳送一次 apower 數據
    setInterval(() => {
        ws.send(JSON.stringify({ apower }));
        ws.send(JSON.stringify({ total_kWh}));
    }, 5000); // 每 1 秒發送一次 apower 值
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
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`伺服器運行於 http://${localIP}:${PORT}`);
});

