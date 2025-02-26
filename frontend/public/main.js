document.addEventListener('DOMContentLoaded', () => {
    // 檢查登入狀態後初始化頁面
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            initializePage();
        }
    });
});

// 將原本的初始化代碼移到這個函數中
function initializePage() {
    console.log('DOM 已完全加載');

    const blockchainMessagesDiv = document.getElementById('blockchainMessages');
    const refreshButton = document.getElementById('refreshButton');
    const canvas = document.getElementById('statsChart');
    const chartSelector = document.getElementById('chartSelector');
    const deviceSelector = document.getElementById('deviceSelector');
    const timeRangeSelector = document.getElementById('timeRangeSelector');
    const selectedDate = document.getElementById('selectedDate');
    const dateRangeContainer = document.getElementById('dateRangeContainer');
    const selectedYear = document.getElementById('selectedYear');
    const selectedMonth = document.getElementById('selectedMonth');
    const monthRangeContainer = document.getElementById('monthRangeContainer');
    const totalPowerElement = document.getElementById('totalPower');
    const totalCarbonElement = document.getElementById('totalCarbon');
    const logoutLink = document.getElementById('logoutLink');
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');
    const usernameDisplay = document.getElementById('usernameDisplay');

    let powerChart;
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

    // 新增全域變數，儲存各裝置的顏色，避免數據更新時重新取得顏色
    const deviceColors = {};

    // 將 hex 顏色轉換為 rgba 格式，alpha 為透明度
    function hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
            // 使用 HTML 中唯一的 canvas (id 為 statsChart) 建立圖表實例
            powerChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['點1','點2','點3','點4','點5'],
                    datasets: [],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
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
            // 新增「全部裝置」選項
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = '全部裝置';
            deviceSelector.appendChild(allOption);
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

    // 生成年份選項（從 2020 年到當前年份）
    function generateYearOptions() {
        const currentYear = new Date().getFullYear();
        for (let year = 2020; year <= currentYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + ' 年';
            selectedYear.appendChild(option);
        }
        selectedYear.value = currentYear; // 預設選擇當前年份
    }
    
    // 初始化年份選項
    generateYearOptions();

    // 設定日期選擇器預設值
    selectedDate.valueAsDate = new Date();
    // 設定月份選擇器預設值為當前月份
    const now = new Date();
    selectedMonth.value = String(now.getMonth() + 1).padStart(2, '0');
    
    // 根據時間範圍顯示/隱藏日期範圍選擇器
    function toggleDateRange() {
        dateRangeContainer.style.display = 
            timeRangeSelector.value === 'day' ? 'block' : 'none';
        monthRangeContainer.style.display = 
            timeRangeSelector.value === 'month' ? 'block' : 'none';
    }
    
    // 初始化時執行一次
    toggleDateRange();
    
    // 當時間範圍改變時切換日期範圍選擇器顯示狀態
    timeRangeSelector.addEventListener('change', () => {
        toggleDateRange();
        updateDashboard();
    });
    
    // 當日期範圍改變時更新圖表
    selectedDate.addEventListener('change', () => {
        console.log('選擇的日期:', selectedDate.value);
        updateDashboard();
    });
    selectedYear.addEventListener('change', updateDashboard);
    selectedMonth.addEventListener('change', updateDashboard);

    // 用於儲存裝置名稱對應的全域變數
    const deviceNameMap = {};
    
    // 取得裝置資訊並建立映射
    async function fetchDeviceNameMap() {
        try {
            const response = await fetch('/devices');
            const devices = await response.json();
            devices.forEach(device => {
                deviceNameMap[device.id] = device.device_name;
            });
            console.log('裝置名稱映射:', deviceNameMap);
        } catch (error) {
            console.error('無法獲取裝置名稱映射:', error);
        }
    }
    
    // 初始化時取得裝置名稱映射
    fetchDeviceNameMap();

    // 新增函式：從 /power-data 取得各裝置的分段用電數據並更新圖表
    async function fetchPowerDataAndUpdateChart() {
        try {
            let url = '/power-data';
            const currentTimeRange = timeRangeSelector ? timeRangeSelector.value : 'hour';
            console.log('當前時間範圍:', currentTimeRange);
            
            let queryParams = new URLSearchParams();
            queryParams.append('timeRange', currentTimeRange);
            
            // 根據視圖類型加入對應的日期或月份參數
            if (currentTimeRange === 'day' && selectedDate.value) {
                console.log('添加日期參數:', selectedDate.value);
                queryParams.append('date', selectedDate.value);
            } else if (currentTimeRange === 'month') {
                const monthStr = `${selectedYear.value}-${selectedMonth.value}`;
                queryParams.append('month', monthStr);
            }
            
            url += '?' + queryParams.toString();
            console.log('請求 URL:', url);
            
            const response = await fetch(url);
            const result = await response.json();
            console.log('收到的數據:', result);

            if (!Array.isArray(result)) {
                console.error("回傳的資料格式不正確，期待陣列，但收到：", result);
                return;
            }
            if (currentTimeRange === 'hour') {
                const records = result; // records：{ device_id, total_usage, date }
                records.forEach(record => {
                    record.parsedEpoch = new Date(record.date.replace(' ', 'T')).getTime();
                    // 若資料包含device_name，更新裝置名稱映射
                    if (record.device_name) {
                        deviceNameMap[record.device_id] = record.device_name;
                    }
                });

                const deviceData = {};
                records.forEach(record => {
                    const deviceId = record.device_id;
                    if (!deviceData[deviceId]) {
                        deviceData[deviceId] = [];
                    }
                    deviceData[deviceId].push(record);
                });

                const labelsSet = new Set();
                Object.keys(deviceData).forEach(deviceId => {
                    deviceData[deviceId].sort((a, b) => a.parsedEpoch - b.parsedEpoch);
                    deviceData[deviceId].forEach(record => {
                        labelsSet.add(record.parsedEpoch);
                    });
                });
                let sortedEpochs = Array.from(labelsSet).sort((a, b) => a - b);
                if (sortedEpochs.length === 0) {
                    const now = Date.now();
                    sortedEpochs = [now - 4 * 60000, now - 3 * 60000, now - 2 * 60000, now - 60000, now];
                }
                const labelsArray = sortedEpochs.map(epoch => new Date(epoch).toLocaleString());

                let selectedDevices = [];
                if (deviceSelector && deviceSelector.selectedOptions.length > 0) {
                    const selected = Array.from(deviceSelector.selectedOptions).map(option => option.value);
                    if (selected.includes('all')) {
                        selectedDevices = Object.keys(deviceData);
                    } else {
                        selectedDevices = selected;
                    }
                } else {
                    selectedDevices = Object.keys(deviceData);
                }
                if (selectedDevices.length === 0) {
                    selectedDevices = ["No Data"];
                    deviceData["No Data"] = [];
                }

                // 生成當前小時60分鐘標籤 (格式 hh:mm)
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth();
                const currentDate = now.getDate();
                const currentHour = now.getHours();
                const currentLabelsArray = [];
                for (let m = 0; m < 60; m++) {
                    const dt = new Date(currentYear, currentMonth, currentDate, currentHour, m);
                    currentLabelsArray.push(dt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
                }

                // 對每個裝置，依據記錄中的分鐘數取用電數值，沒數值則補0
                const currentDatasets = selectedDevices.map(deviceId => {
                    const usageMap = {};
                    (deviceData[deviceId] || []).forEach(record => {
                        const recordDate = new Date(record.date);
                        const minute = recordDate.getMinutes();
                        const key = minute < 10 ? '0' + minute : '' + minute;
                        usageMap[key] = record.total_usage;
                    });
                    const dataArray = [];
                    for (let m = 0; m < 60; m++) {
                        const key = m < 10 ? '0' + m : '' + m;
                        dataArray.push(usageMap[key] !== undefined ? usageMap[key] : 0);
                    }
                    const color = deviceColors[deviceId] || (deviceColors[deviceId] = getRandomColor());
                    // 使用裝置名稱作為標籤
                    const deviceName = deviceNameMap[deviceId] || `裝置 ${deviceId}`;
                    return {
                        label: `${deviceName} 用電量 (kWh)`,
                        data: dataArray,
                        borderColor: color,
                        backgroundColor: hexToRGBA(color, 0.2),
                        borderWidth: 2,
                    };
                });
                powerChart.data.labels = currentLabelsArray;
                powerChart.data.datasets = currentDatasets;
                powerChart.update();
            } else {
                const aggregatedRecords = result;
                // 更新裝置名稱映射
                aggregatedRecords.forEach(record => {
                    if (record.device_name) {
                        deviceNameMap[record.device_id] = record.device_name;
                    }
                });
                
                const deviceData = {};
                aggregatedRecords.forEach(record => {
                    const deviceId = record.device_id;
                    if (!deviceData[deviceId]) {
                        deviceData[deviceId] = [];
                    }
                    deviceData[deviceId].push(record);
                });

                let labelsArray = [];
                if (currentTimeRange === 'day') {
                    // 以小時為單位，生成全天 24 小時，如 "00:00", "01:00", …, "23:00"
                    for (let i = 0; i < 24; i++) {
                        labelsArray.push((i < 10 ? '0' + i : i) + ":00");
                    }
                } else if (currentTimeRange === 'week') {
                    // 生成最近 7 天的日期，格式 "YYYY-MM-DD"
                    let expected = [];
                    for (let i = 6; i >= 0; i--) {
                        let d = new Date();
                        d.setDate(d.getDate() - i);
                        expected.push(d.toISOString().slice(0, 10));
                    }
                    labelsArray = expected;
                } else if (currentTimeRange === 'month') {
                    // 生成本月所有日期，格式 "YYYY-MM-DD"
                    let now = new Date();
                    let year = now.getFullYear();
                    let month = now.getMonth();
                    let daysInMonth = new Date(year, month + 1, 0).getDate();
                    let expected = [];
                    for (let d = 1; d <= daysInMonth; d++) {
                        let dayStr = d < 10 ? '0' + d : d;
                        let monStr = (month + 1) < 10 ? '0' + (month + 1) : (month + 1);
                        expected.push(`${year}-${monStr}-${dayStr}`);
                    }
                    labelsArray = expected;
                } else {
                    labelsArray = [new Date().toLocaleString()];
                }

                let selectedDevices = [];
                if (deviceSelector && deviceSelector.selectedOptions.length > 0) {
                    const selected = Array.from(deviceSelector.selectedOptions).map(option => option.value);
                    if (selected.includes('all')) {
                        selectedDevices = Object.keys(deviceData);
                    } else {
                        selectedDevices = selected;
                    }
                } else {
                    selectedDevices = Object.keys(deviceData);
                }
                if (selectedDevices.length === 0) {
                    selectedDevices = ["No Data"];
                    deviceData["No Data"] = [];
                }

                const datasets = selectedDevices.map(deviceId => {
                    const usageMap = {};
                    (deviceData[deviceId] || []).forEach(record => {
                        usageMap[record.label] = record.total_usage;
                    });
                    const dataArray = labelsArray.map(label => (usageMap[label] !== undefined ? usageMap[label] : 0));
                    const color = deviceColors[deviceId] || (deviceColors[deviceId] = getRandomColor());
                    // 使用裝置名稱作為標籤
                    const deviceName = deviceNameMap[deviceId] || `裝置 ${deviceId}`;
                    return {
                        label: `${deviceName} 用電量 (kWh)`,
                        data: dataArray,
                        borderColor: color,
                        backgroundColor: hexToRGBA(color, 0.2),
                        borderWidth: 2,
                    };
                });

                powerChart.data.labels = labelsArray;
                powerChart.data.datasets = datasets;
                powerChart.update();
            }
        } catch (error) {
            console.error('獲取用電資料並更新圖表失敗:', error);
        }
    }

    // 修改：更新方法來取得最新用電統計數據
    async function fetchPowerStats() {
        try {
            // 獲取數據
            let url = '/power-data';
            const currentTimeRange = timeRangeSelector ? timeRangeSelector.value : 'hour';
            url += '?timeRange=' + currentTimeRange;
            const response = await fetch(url);
            const records = await response.json();
    
            // 建立裝置ID到最新用電數據的映射
            const latestDeviceUsage = {};
            const deviceNames = {}; // 用來存儲 device_id 對應的 device_name
            
            // 先按裝置ID分組
            const deviceRecords = {};
            records.forEach(record => {
                const deviceId = record.device_id;
                if (!deviceRecords[deviceId]) {
                    deviceRecords[deviceId] = [];
                }
                deviceRecords[deviceId].push(record);
                
                // 儲存裝置名稱
                if (record.device_name) {
                    deviceNames[deviceId] = record.device_name;
                    // 同時更新全域的裝置名稱映射
                    deviceNameMap[deviceId] = record.device_name;
                }
            });
            
            // 對每個裝置找出最新的用電數據
            for (const deviceId in deviceRecords) {
                const deviceData = deviceRecords[deviceId];
                // 如果數據中有日期時間欄位，按時間排序取最新的
                if (deviceData.length > 0 && deviceData[0].date) {
                    deviceData.sort((a, b) => {
                        return new Date(b.date) - new Date(a.date);
                    });
                    latestDeviceUsage[deviceId] = deviceData[0].total_usage || 0;
                } 
                // 如果沒有日期欄位，假設記錄是最新的，取用電量最大值
                else {
                    latestDeviceUsage[deviceId] = Math.max(...deviceData.map(d => d.total_usage || 0));
                }
            }
    
            // 計算所有裝置的總最新用電量
            let overallTotal = 0;
            for (const id in latestDeviceUsage) {
                overallTotal += Number(latestDeviceUsage[id]);
            }
            
            // 更新UI顯示
            totalPowerElement.textContent = overallTotal.toFixed(2);
            totalCarbonElement.textContent = (overallTotal * carbonPerUnit).toFixed(2);
    
            // 更新各裝置統計，使用實際裝置名稱顯示
            let deviceStatsDiv = document.getElementById('deviceStats');
            if (!deviceStatsDiv) {
                deviceStatsDiv = document.createElement('div');
                deviceStatsDiv.id = 'deviceStats';
                document.getElementById('statistics').appendChild(deviceStatsDiv);
            }
            deviceStatsDiv.innerHTML = '';
            
            for (const id in latestDeviceUsage) {
                const p = document.createElement('p');
                // 優先使用裝置名稱
                const deviceName = deviceNames[id] || deviceNameMap[id] || `裝置 ${id}`;
                p.textContent = `${deviceName} 用電數：${Number(latestDeviceUsage[id]).toFixed(2)} 度`;
                deviceStatsDiv.appendChild(p);
            }
        } catch (error) {
            console.error('獲取統計數據失敗:', error);
        }
    }

    // 新增計算刷新間隔的函式，單位為毫秒
    function calculateRefreshInterval() {
        const selected = timeRangeSelector.value;
        let interval = 10000; // 預設 10 秒
        if (selected === 'hour') {
            interval = 10000; // 小時：10秒
        } else if (selected === 'day') {
            interval = 30000; // 日：30秒
        } else if (selected === 'week') {
            interval = 60000; // 週：60秒
        } else if (selected === 'month') {
            interval = 120000; // 月：120秒
        }
        return interval;
    }

    // 宣告一個全域變數來儲存定時器標識
    let dashboardTimer = null;

    // 新增函式，根據當前選擇的時間重新設定更新定時器
    function setDashboardTimer() {
        if (dashboardTimer) clearInterval(dashboardTimer);
        const interval = calculateRefreshInterval();
        dashboardTimer = setInterval(updateDashboard, interval);
        console.log(`設定自動更新間隔：${interval} 毫秒`);
    }

    // 統整圖表與統計數據更新的函式
    function updateDashboard() {
        fetchPowerDataAndUpdateChart();
        fetchPowerStats();
    }

    // 初次載入時立即更新資料，並根據選擇的時間設定自動更新定時器
    updateDashboard();
    setDashboardTimer();

    // 修改各選擇器變更事件，當用戶改變選項時，立即更新並重設定時器
    if (chartSelector && powerChart) {
        chartSelector.addEventListener('change', () => {
            updateDashboard();
            setDashboardTimer();
        });
    }

    if (deviceSelector && powerChart) {
        deviceSelector.addEventListener('change', () => {
            updateDashboard();
            setDashboardTimer();
        });
    }
    
    if (timeRangeSelector) {
        timeRangeSelector.addEventListener('change', () => {
            updateDashboard();
            setDashboardTimer();
        });
    }

    if (usernameDisplay) {
        fetch('/user-info')
            .then(response => response.json())
            .then(data => {
                usernameDisplay.textContent = data.username ? data.username : "訪客";
            })
            .catch(error => {
                console.error("無法取得用戶資訊:", error);
                usernameDisplay.textContent = "訪客";
            });
    }
}