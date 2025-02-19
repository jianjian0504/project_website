/**
 * 此模擬程式用於每隔一段時間隨機產生用電數據
 * 並存入 MySQL 資料庫，藉以測試前端圖表與資料庫數據儲存是否正常。
 *
 * 執行方式：
 *   node backend/simulator.js
 */

const mysql = require('mysql2');

// 建立與資料庫的連線設定（請依照您實際的設定做調整）
const db = mysql.createConnection({
    host: '120.101.8.216',
    user: 'username',
    password: 'password',
    database: 'sql_account',
    port: 3306,
    timezone: '+08:00' // 使用 UTC+8 的偏移量
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
 * 取得目前時間（中國標準時間 - CST）的格式化字串
 * 格式為 "YYYY-MM-DD HH:MM:SS"
 */
function getCSTDateTime() {
    const now = new Date();
    // 取得 UTC 時間（以毫秒為單位）再加上當前時區的分鐘差
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    // 加上 8 小時的毫秒數得到 CST 時間
    const cst = new Date(utc + (8 * 3600000));
    const year = cst.getFullYear();
    const month = ('0' + (cst.getMonth() + 1)).slice(-2);
    const day = ('0' + cst.getDate()).slice(-2);
    const hours = ('0' + cst.getHours()).slice(-2);
    const minutes = ('0' + cst.getMinutes()).slice(-2);
    const seconds = ('0' + cst.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 隨機產生一筆用電數據，
 * device_id 從 deviceIds 中隨機選取，
 * power_usage 為 0.5 ~ 5.5 kWh 隨機數，
 * date 改為 CST 時區字串格式。
 */
function insertRandomPowerData() {
    const formattedDate = getCSTDateTime();
    console.log(formattedDate);  // 輸出類似 "2023-08-15 14:35:22"

    const randomDeviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    const randomPowerUsage = (Math.random() * 5 + 0.5).toFixed(2); // 隨機用電量

    const query = 'INSERT INTO power_data (user_id, device_id, power_usage, date) VALUES (?, ?, ?, ?)';
    db.query(query, [testUserId, randomDeviceId, randomPowerUsage, formattedDate], (err, result) => {
        if (err) {
            console.error('新增 power_data 資料失敗:', err);
        } else {
            console.log(`[${formattedDate}] 插入記錄：user_id = ${testUserId}, device_id = ${randomDeviceId}, power_usage = ${randomPowerUsage} kWh`);
        }
    });
}

// 每60秒插入一筆新的用電資料
setInterval(insertRandomPowerData, 60000);

console.log('模擬程式已啟動，每60秒插入一筆用電數據到資料庫。');