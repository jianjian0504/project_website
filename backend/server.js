const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2/promise'); // 使用 mysql2/promise
const bcrypt = require('bcryptjs');
const http = require('http');
const os = require('os');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
let db; // 全局變數

// 資料庫連線設置
async function connectDB() {
    try {
        db = await mysql.createPool({ // 使用連線池提升效能
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            connectionLimit: 10,
        });
        console.log('✅ MySQL 連線成功');
    } catch (err) {
        console.error('❌ 連線失敗:', err);
        process.exit(1);
    }
}

// 中間件設置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1800000 },
}));

// 驗證使用者登入狀態
function isAuthenticated(req, res, next) {
    if (req.session.user) next();
    else res.status(401).json({ message: '未登入，請先登入' });
}

// 登入路由
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '請提供帳號和密碼' });
    }

    try {
        const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length === 0) {
            return res.status(400).json({ message: '無效的帳號或密碼' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.user = { id: user.id, username: user.username };
            res.json({ success: true, message: '登入成功！' });
        } else {
            res.status(400).json({ message: '帳號或密碼錯誤' });
        }
    } catch (err) {
        console.error('登入錯誤:', err);
        res.status(500).json({ message: '內部伺服器錯誤' });
    }
});

// 註冊路由
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: '請提供帳號和密碼' });
    }

    try {
        const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length > 0) {
            return res.status(400).json({ message: '該帳號已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.json({ success: true, message: '註冊成功' });
    } catch (err) {
        console.error('註冊錯誤:', err);
        res.status(500).json({ message: '註冊失敗' });
    }
});

// 取得個人用電資訊 API
app.get('/power-data', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const chosenMonth = req.query.month;
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
            let dateCondition = dateParam ? 'DATE(pd.date) = ?' : 'DATE(pd.date) = DATE(NOW())';
            if (dateParam) params.push(dateParam);

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
                    AND pd.date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                    AND pd.date < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
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

    try {
        const [results] = await db.execute(query, params);
        res.json(results);
    } catch (err) {
        console.error('查詢失敗:', err);
        res.status(500).json({ message: '無法取得用電資訊', error: err.message });
    }
});


// Nodemailer 設定
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const multer = require('multer');

// 設定 multer 儲存配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: (req, file, cb) => {
    const userId = req.session.user?.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile_${userId}_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('不支援的檔案類型'), false);
  }

  if (file.size > maxSize) {
    return cb(new Error('檔案大小不能超過 5MB'), false);
  }

  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

app.post('/settings', upload.single('profilePic'), async (req, res) => {
  const { email } = req.body;
  const userId = req.session.user?.id;

  if (!email || !userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email 和 userId 為必填欄位' 
    });
  }

  try {
    // 先查詢舊的頭像路徑
    const [oldUserData] = await db.execute(
      'SELECT profile_pic_url FROM users WHERE id = ?', 
      [userId]
    );
    const oldProfilePic = oldUserData[0]?.profile_pic_url;

    // 更新 email
    await db.execute('UPDATE users SET email = ? WHERE id = ?', [email, userId]);

    // 處理上傳的頭像
    let profilePicUrl = null;
    if (req.file) {
      profilePicUrl = `/uploads/${req.file.filename}`;
      
      // 更新資料庫中的頭像路徑
      await db.execute(
        'UPDATE users SET profile_pic_url = ? WHERE id = ?', 
        [profilePicUrl, userId]
      );

      // 刪除舊頭像檔案（如果存在）
      if (oldProfilePic) {
        const oldFilePath = path.join(__dirname, 'public', oldProfilePic);
        try {
          await fs.unlink(oldFilePath);
        } catch (unlinkError) {
          console.warn('刪除舊頭像失敗:', unlinkError);
        }
      }
    }

    // 發送確認信
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '設定更新確認',
      html: `
        <h2>設定已更新</h2>
        <p>您的 email 已更新為：${email}</p>
        ${profilePicUrl ? `<p>頭像已成功更新</p>` : ''}
      `
    };
    
    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      profilePicUrl,
      message: '設定更新成功' 
    });

  } catch (error) {
    console.error('儲存設定失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '儲存設定失敗', 
      error: error.message 
    });
  }
});

// 獲取用戶資訊
app.get('/user-info', async (req, res) => {
    const userId = req.session.user?.id;

    if (!userId) {
        return res.json({
            username: '訪客',
            profilePicUrl: 'default.png',
            email: '尚未註冊',
        });
    }

    try {
        const [rows] = await db.execute('SELECT username, email, profile_pic_url FROM users WHERE id = ?', [userId]);
        const user = rows[0] || {};
        res.json({
            username: user.username || '訪客',
            profilePicUrl: user.profile_pic_url || 'default.png',
            email: user.email || '尚未註冊',
        });
    } catch (error) {
        console.error('獲取用戶資訊失敗:', error);
        res.status(500).json({ error: '無法獲取用戶資訊' });
    }
});

// 新增裝置
app.post('/devices', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const { deviceName, contractAddress } = req.body;

    if (!deviceName || !contractAddress) {
        return res.status(400).json({ message: '請提供裝置名稱和合約地址' });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        return res.status(400).json({ message: '無效的合約地址格式' });
    }

    try {
        await db.execute('INSERT INTO devices (user_id, device_name, contract_address) VALUES (?, ?, ?)', [userId, deviceName, contractAddress]);
        res.json({ success: true, message: '裝置已新增' });
    } catch (err) {
        console.error('新增裝置失敗:', err);
        res.status(500).json({ message: '新增裝置失敗' });
    }
});

// 取得用戶裝置
app.get('/devices', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [results] = await db.execute('SELECT * FROM devices WHERE user_id = ?', [userId]);
        res.json(results);
    } catch (err) {
        console.error('取得裝置資訊失敗:', err);
        res.status(500).json({ message: '無法取得裝置資訊' });
    }
});

// 登出路由
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: '無法登出' });
        res.json({ message: '已登出' });
    });
});

// 檢查登入狀態
app.get('/check-auth', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// 取得用戶設定
app.get('/user-settings', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [results] = await db.execute('SELECT email, profile_pic_url FROM users WHERE id = ?', [userId]);
        if (results.length === 0) return res.status(404).json({ message: '找不到用戶' });
        res.json({
            email: results[0].email,
            profilePicUrl: results[0].profile_pic_url,
        });
    } catch (err) {
        console.error('取得設定失敗:', err);
        res.status(500).json({ message: '無法取得設定' });
    }
});

// 處理 404 錯誤
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// 啟動伺服器
function getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    for (const iface of Object.values(networkInterfaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) {
                return details.address;
            }
        }
    }
    return 'localhost';
}

async function startServer() {
    await connectDB();
    const server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
        const localIP = getLocalIPAddress();
        console.log(`伺服器運行於 http://${localIP}:${PORT}`);
    });
}

startServer();