document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已完全加載');

    const blockchainMessagesDiv = document.getElementById('blockchainMessages');
    const refreshButton = document.getElementById('refreshButton');
    const canvas = document.getElementById('dataChart');
    const chartSelector = document.getElementById('chartSelector');
    const totalPowerElement = document.getElementById('totalPower');
    const totalCarbonElement = document.getElementById('totalCarbon');
    const logoutLink = document.getElementById('logoutLink');
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');

    let powerChart;
    let powerData = [];
    let totalPower = 0;
    const carbonPerUnit = 0.494; // 每度電碳排放量（kg）
    let counter = 0;

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

    // WebSocket 連線初始化
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
        
          
        if (data.apower !== undefined) {
            const latestPowerValue = parseFloat(data.apower.toFixed(2));
            console.log(`接收到的用電數據: ${latestPowerValue}`);
            socket.onopen = () => {
                console.log('成功連線到 WebSocket 後端伺服器');
            };

            // 更新圖表資料

            powerData.push(latestPowerValue);


            if (powerChart.data.labels.length > 6) {
                powerChart.data.labels.shift();
                powerChart.data.datasets[0].data.shift();
            }

            counter++;
            powerChart.data.labels.push(`${counter}秒`);
            powerChart.data.datasets[0].data.push(latestPowerValue);
            powerChart.update();
        }
    };
    socket.onerror = (error) => {
        console.error('WebSocket 發生錯誤:', error);
    };
    
    socket.onclose = () => {
        console.warn('WebSocket 連線已關閉');
    };
    
    // 初始化圖表
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            console.log('成功取得 canvas 上下文');

            powerChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '用電量 (kWh)',
                        data: [],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                    }],
                },
                options: {
                    responsive: true,
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

    // Chart 選擇器處理
    if (chartSelector && powerChart) {
        chartSelector.addEventListener('change', (event) => {
            const selectedOption = event.target.value;
            if (selectedOption === 'carbon') {
                const carbonData = powerData.map(value => (value * carbonPerUnit).toFixed(2));
                powerChart.data.datasets[0].label = '碳排放量 (kg)';
                powerChart.data.datasets[0].data = carbonData;
            } else {
                powerChart.data.datasets[0].label = '用電量 (kWh)';
                powerChart.data.datasets[0].data = powerData;
            }
            powerChart.update();
        });
    }
});
