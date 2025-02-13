 /**
 * 此模擬程式用於每隔一段時間隨機產生用電數據
 * 並存入 MySQL 資料庫，藉以測試前端圖表與資料庫數據儲存是否正常。
 *
 * 執行方式：
 *   node backend/simulator.js
 */

const mysql = require('mysql2');
   // 取得當前日期並轉換格式

// 建立與資料庫的連線設定（請依照您實際的設定做調整）
const db = mysql.createConnection({
    host: '120.101.8.216',
    user: 'username',
    password: 'password',
    database: 'sql_account',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('資料庫連接錯誤:', err);
        process.exit(1);
    }
    console.log('已成功連接至 MySQL 資料庫。');
});

// 測試用戶 ID （確保此用戶已存在於資料庫中）
const testUserId = 3;
// 模擬的裝置 ID (可依實際需要調整)
const deviceIds = [1, 2];

/**
 * 隨機產生一筆用電數據，
 * device_id 從 deviceIds 中隨機選取，
 * power_usage 為 0.5 ~ 5.5 kWh 隨機數，
 * date 取當前 ISO 格式字串。
 */
function insertRandomPowerData() {
    const date = new Date();
    const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
    console.log(formattedDate);  // 輸出類似 "2025-02-11 09:14:14"

    const randomDeviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    const randomPowerUsage = (Math.random() * 5 + 0.5).toFixed(2); // 隨機用電量
    const currentDate = new Date().toISOString();

    const query = 'INSERT INTO power_data (user_id, device_id, power_usage, date) VALUES (?, ?, ?, ?)';
    db.query(query, [testUserId, randomDeviceId, randomPowerUsage, formattedDate], (err, result) => {
        if (err) {
            console.error('新增 power_data 資料失敗:', err);
        } else {
            console.log(`[${formattedDate}] 插入記錄：user_id = ${testUserId}, device_id = ${randomDeviceId}, power_usage = ${randomPowerUsage} kWh`);
        }
    });
}

// 每10秒插入一筆新的用電資料
setInterval(insertRandomPowerData, 60000);

console.log('模擬程式已啟動，每60秒插入一筆用電數據到資料庫。');