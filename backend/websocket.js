const WebSocket = require('ws');

// 建立 WebSocket 伺服器
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 4001 });

console.log('WebSocket 伺服器正在運行，端口: 4001');

// 當有客戶端連線時觸發
wss.on('connection', (ws) => {
    console.log('客戶端已連線');

    // 傳送歡迎訊息
    ws.send('歡迎來到 WebSocket 伺服器！');

    // 接收客戶端訊息
    ws.on('message', (message) => {
        console.log(`收到訊息: ${message}`);

        try {
            // 將 JSON 字串解析為物件
            const data = JSON.parse(message);

            // 檢查是否包含 `result.apower` 並提取其值
            if (data.result && typeof data.result.apower === 'number') {
                const apower = data.result.apower;
                console.log(`提取的 apower 值: ${apower}`);

                // 回應客戶端
                ws.send(`伺服器已收到 apower 值: ${apower}`);
            } else {
                console.error('訊息中不包含有效的 apower 資料');
                ws.send('無效的資料格式');
            }
        } catch (error) {
            console.error('JSON 解析失敗:', error);
            ws.send('無效的 JSON 格式');
        }
    });

    // 客戶端斷線時觸發
    ws.on('close', () => {
        console.log('客戶端已斷線');
    });

    // 錯誤處理
    ws.on('error', (error) => {
        console.error('WebSocket 錯誤:', error);
    });
});
