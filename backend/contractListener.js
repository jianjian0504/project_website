const { Web3 } = require('web3');
const mysql = require('mysql2/promise');

// 資料庫連接設置
const dbConfig = {
    host: '120.101.8.216',
    user: 'username',
    password: 'password',
    database: 'sql_account',
    port: 3306
};

// 建立資料庫連接池
const pool = mysql.createPool(dbConfig);

// 合約 ABI
const contractABI = [
    {
        "inputs": [],
        "name": "getData",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_data",
                "type": "string"
            }
        ],
        "name": "setData",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const web3 = new Web3(new Web3.providers.HttpProvider('http://192.168.1.253:8545'));

// 測試 Web3 連接
async function testWeb3Connection() {
    try {
        const isConnected = await web3.eth.net.isListening();
        console.log('Web3 連接狀態:', isConnected);
        
        const blockNumber = await web3.eth.getBlockNumber();
        console.log('當前區塊高度:', blockNumber);
        
        const networkId = await web3.eth.net.getId();
        console.log('網路 ID:', networkId);
    } catch (error) {
        console.error('Web3 連接測試失敗:', error);
    }
}

async function fetchPowerData(contractAddress) {
    try {
        console.log('開始獲取合約數據，合約地址:', contractAddress);
        
        if (!contractAddress) {
            throw new Error('Contract address is null or undefined');
        }

        if (!web3.utils.isAddress(contractAddress)) {
            throw new Error(`Invalid contract address format: ${contractAddress}`);
        }

        console.log('正在建立合約實例...');
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        
        console.log('正在調用 getData 方法...');
        const data = await contract.methods.getData().call();
        console.log(`從合約 ${contractAddress} 獲取的原始數據:`, data);

        // 嘗試解析 JSON
        try {
            const jsonData = JSON.parse(data);

            if (jsonData.result && jsonData.result.total_energy) {
                // 嘗試解析 total_energy
                const powerUsage = parseFloat(jsonData.result.total_energy);
                if (!isNaN(powerUsage)) {
                    console.log(`成功解析用電數據: ${powerUsage} kWh`);
                    return powerUsage;
                }
            }
        } catch (e) {
            console.log('數據不是 JSON 格式，嘗試直接解析數字');
        }

        // 若無法解析 JSON，則嘗試解析為數字
        const powerUsage = parseFloat(data);
        if (isNaN(powerUsage)) {
            console.log('收到非數字數據:', data);
            return 0;
        }

        console.log(`成功解析用電數據: ${powerUsage} kWh`);
        return powerUsage;
    } catch (error) {
        console.error(`從合約 ${contractAddress} 獲取數據時發生錯誤:`, error);
        return 0;
    }
}



// 從資料庫獲取所有裝置
async function getDevicesFromDB() {
    try {
        const connection = await pool.getConnection();
        console.log('正在從資料庫獲取裝置資訊...');
        
        const [devices] = await connection.query('SELECT id, user_id, contract_address FROM devices');
        connection.release();
        
        console.log('從資料庫找到的裝置:', devices);
        return devices;
    } catch (error) {
        console.error('從資料庫獲取裝置時發生錯誤:', error);
        throw error;
    }
}

// 將用電數據存入資料庫
async function savePowerData(deviceId, powerUsage) {
    try {
        const connection = await pool.getConnection();
        console.log(`準備儲存用電數據: 裝置ID=${deviceId}, 用電量=${powerUsage} kWh`);

        // 首先獲取裝置的用戶ID
        const [devices] = await connection.query(
            'SELECT user_id FROM devices WHERE id = ?',
            [deviceId]
        );

        if (devices.length === 0) {
            throw new Error(`找不到ID為 ${deviceId} 的裝置`);
        }

        const userId = devices[0].user_id;

        // 插入用電數據
        const [result] = await connection.query(
            'INSERT INTO power_data (user_id, device_id, power_usage, date) VALUES (?, ?, ?, NOW())',
            [userId, deviceId, powerUsage]
        );

        connection.release();
        console.log(`成功儲存用電數據: ID=${result.insertId}`);
        return result.insertId;
    } catch (error) {
        console.error('儲存用電數據時發生錯誤:', error);
        throw error;
    }
}

async function startListening() {
    try {
        console.log('開始監聽程序...');
        
        // 測試 Web3 連接
        await testWeb3Connection();
        
        // 從資料庫獲取所有裝置的合約地址
        const devices = await getDevicesFromDB();
        console.log(`找到 ${devices.length} 個裝置`);
        
        for (const device of devices) {
            console.log(`處理裝置 ID: ${device.id}`);
            if (device.contract_address) {
                try {
                    const powerUsage = await fetchPowerData(device.contract_address);
                    await savePowerData(device.id, powerUsage);
                    console.log(`成功處理裝置 ${device.id} 的數據`);
                } catch (error) {
                    console.error(`處理裝置 ${device.id} 時發生錯誤:`, error);
                    continue;
                }
            } else {
                console.log(`裝置 ${device.id} 沒有合約地址`);
            }
        }
        console.log('本次監聽程序完成');
    } catch (error) {
        console.error('監聽程序發生錯誤:', error);
    }
}

// 定期執行
console.log('正在啟動監聽程序...');
setInterval(startListening, 600000); // 每分鐘執行一次

// 立即執行第一次
console.log('執行第一次監聽...');
startListening();

// 匯出 web3 實例供其他模組使用
module.exports = web3;

// 處理未捕獲的 Promise 錯誤
process.on('unhandledRejection', (error) => {
    console.error('未處理的 Promise 錯誤:', error);
}); 