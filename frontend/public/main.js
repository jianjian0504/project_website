document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已完全加載');

    const blockchainMessagesDiv = document.getElementById('blockchainMessages');
    const refreshButton = document.getElementById('refreshButton');
    const canvas = document.getElementById('dataChart');
    const chartSelector = document.getElementById('chartSelector');
    const deviceSelector = document.getElementById('deviceSelector');
    const timeRangeSelector = document.getElementById('timeRangeSelector');
    const totalPowerElement = document.getElementById('totalPower');
    const totalCarbonElement = document.getElementById('totalCarbon');
    const logoutLink = document.getElementById('logoutLink');
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');

    let powerChart;
    let totalPower = 0;
    const carbonPerUnit = 0.494; // 每度電碳排放量（kg）

    // 隨機生成顏色函式 (供 chart 資料集使用)
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // 初始化登出按鈕
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('userToken');
            window.location.href = 'index.html';
        });
    }

    // 初始化頭像選單
    if (profileLink && profileMenu) {
        profileLink.addEventListener('click', (event) => {
            event.preventDefault();
            profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (event) => {
            if (!profileLink.contains(event.target) && !profileMenu.contains(event.target)) {
                profileMenu.style.display = 'none';
            }
        });
    }

    // 綁定新增裝置表單的提交事件
    const deviceForm = document.getElementById('deviceForm');
    const deviceMessage = document.getElementById('deviceMessage');

    if (deviceForm) {
        deviceForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new URLSearchParams(new FormData(deviceForm));

            try {
                const response = await fetch('/devices', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });

                const result = await response.json();
                if (result.success) {
                    deviceMessage.style.color = 'green';
                    deviceMessage.textContent = '裝置新增成功！';
                } else {
                    deviceMessage.style.color = 'red';
                    deviceMessage.textContent = '新增失敗: ' + result.message;
                }
            } catch (error) {
                deviceMessage.style.color = 'red';
                deviceMessage.textContent = '新增過程中出現錯誤，請稍後再試。';
            }
        });
    }

    // 初始化圖表
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            console.log('成功取得 canvas 上下文');

            powerChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // 確保圖表不會被壓縮
                    scales: {
                        y: {
                            beginAtZero: true,
                        },
                    },
                },
            });
        } else {
            console.error('無法取得 canvas 上下文');
        }
    } else {
        console.error('找不到 canvas 元素');
    }

    // 獲取裝置列表並填充裝置選擇器
    async function fetchDevices() {
        try {
            const response = await fetch('/devices');
            const devices = await response.json();
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.device_name;
                deviceSelector.appendChild(option);
            });
        } catch (error) {
            console.error('無法獲取裝置列表:', error);
        }
    }

    fetchDevices();

    // 初始化 WebSocket 連線，保留總用電更新 (若不需要也可全部刪除)
    const socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.total_kWh !== undefined) {
            totalPower = parseFloat(data.total_kWh.toFixed(2)); // 確保數字格式正確
            console.log(`接收到的總用電量數據: ${totalPower}`);

            // 更新前端顯示
            if (totalPowerElement) totalPowerElement.textContent = totalPower.toFixed(2);
            if (totalCarbonElement) totalCarbonElement.textContent = (totalPower * carbonPerUnit).toFixed(2);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket 發生錯誤:', error);
    };
    socket.onclose = () => {
        console.warn('WebSocket 連線已關閉');
    };

    const settingsLink = document.getElementById('settingsLink');
    const settingsSection = document.getElementById('settingsSection');
    const settingsForm = document.getElementById('settingsForm');
    const settingsMessage = document.getElementById('settingsMessage');

    if (settingsLink && settingsSection) {
        settingsLink.addEventListener('click', (event) => {
            event.preventDefault();
            settingsSection.style.display = settingsSection.style.display === 'block' ? 'none' : 'block';
        });
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(settingsForm);

            try {
                const response = await fetch('/settings', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();
                if (result.success) {
                    settingsMessage.style.color = 'green';
                    settingsMessage.textContent = '設定已儲存！';
                } else {
                    settingsMessage.style.color = 'red';
                    settingsMessage.textContent = '儲存失敗: ' + result.message;
                }
            } catch (error) {
                settingsMessage.style.color = 'red';
                settingsMessage.textContent = '儲存過程中出現錯誤，請稍後再試。';
            }
        });
    }

    // 新增函式：從資料庫獲取數據並依裝置分組以更新圖表
    async function fetchPowerDataAndUpdateChart() {
        try {
            // 根據選擇的時間範圍傳入 query string (假設後端根據 timeRange 做資料過濾)
            let url = '/power-data';
            if (timeRangeSelector) {
                url += '?timeRange=' + timeRangeSelector.value;
            }
            const response = await fetch(url);
            const records = await response.json();
            
            // 將資料依照不同裝置分組
            const groupedData = {};
            const labelsSet = new Set();
            records.forEach(record => {
                // 假設 power_data 表中有 device_id 欄位
                const deviceId = record.device_id;
                if (!groupedData[deviceId]) {
                    groupedData[deviceId] = [];
                }
                groupedData[deviceId].push(record);
                // 假設 record.date 為日期或時間字串
                labelsSet.add(record.date);
            });
            // 將日期排序，作為 X 軸 labels
            const labelsArray = Array.from(labelsSet).sort();

            // 根據目前裝置選擇器中所選擇的裝置更新圖表
            if (deviceSelector) {
                const selectedDevices = Array.from(deviceSelector.selectedOptions).map(option => option.value);
                
                powerChart.data.labels = labelsArray;
                powerChart.data.datasets = selectedDevices.map(deviceId => {
                    const deviceRecords = groupedData[deviceId] || [];
                    // 建立日期到 power_usage 的對應，如果同一天有多筆資料則取最後一筆 (可依需求調整)
                    const usageMap = {};
                    deviceRecords.forEach(rec => {
                        usageMap[rec.date] = rec.power_usage;
                    });
                    const datasetData = labelsArray.map(label => usageMap[label] || 0);
                    return {
                        label: `裝置 ${deviceId} 用電量 (kWh)`,
                        data: datasetData,
                        borderColor: getRandomColor(),
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                    };
                });
                powerChart.update();
            }
        } catch (error) {
            console.error('獲取用電資料並更新圖表失敗:', error);
        }
    }

    // 當圖表選擇器或裝置選擇變更時，重新從資料庫抓取數據更新圖表
    if (chartSelector && powerChart) {
        chartSelector.addEventListener('change', (event) => {
            fetchPowerDataAndUpdateChart();
        });
    }

    if (deviceSelector && powerChart) {
        deviceSelector.addEventListener('change', (event) => {
            fetchPowerDataAndUpdateChart();
        });
    }

    // 當時間範圍選擇變更時，重新從資料庫取得資料
    if (timeRangeSelector) {
        timeRangeSelector.addEventListener('change', (event) => {
            fetchPowerDataAndUpdateChart();
        });
    }

    // 設定一個定時器，每隔 10 秒從資料庫取得數據並更新圖表
    setInterval(fetchPowerDataAndUpdateChart, 10000);
});
