document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已完全加載');

    const blockchainMessagesDiv = document.getElementById('blockchainMessages');
    const refreshButton = document.getElementById('refreshButton');
    const canvas = document.getElementById('powerChart');
    let powerChart;

    // 初始化登出按鈕
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('userToken'); // 清除用戶的本地存取令牌
            window.location.href = 'index.html'; // 跳轉到首頁
        });
    }

    // 初始化頭像選單
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');
    if (profileLink && profileMenu) {
        profileLink.addEventListener('click', (event) => {
            event.preventDefault();
            const isVisible = profileMenu.style.display === 'block';
            profileMenu.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', (event) => {
            if (!profileLink.contains(event.target) && !profileMenu.contains(event.target)) {
                profileMenu.style.display = 'none';
            }
        });
    }

    // 確保在初始化圖表前先銷毀舊的圖表
    if (powerChart) {
        powerChart.destroy();
    }

    // 初始化圖表
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            console.log('成功取得 canvas 上下文');

            // 初始化圖表
            const powerChart = new Chart(ctx, {
                type: 'line', // 設定為折線圖
                data: {
                    labels: ['1秒', '2秒', '3秒', '4秒', '5秒', '6秒'], // 初始 X 軸標籤
                    datasets: [{
                        label: '用電量 (kWh)', // 資料集標籤
                        data: [120, 150, 180, 200, 170, 190], // 初始的用電數據
                        borderColor: 'rgba(75, 192, 192, 1)', // 線條顏色
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // 背景顏色（透明）
                        borderWidth: 2 // 邊框寬度
                    }]
                },
                options: {
                    responsive: true, // 讓圖表在大小變動時自動調整
                    scales: {
                        y: {
                            beginAtZero: true // Y 軸從零開始
                        }
                    }
                }
            }); 
            let counter=6;
            // 確保 powerChart 完全初始化後，再開始更新數據
            setInterval(() => {
                if (powerChart.data.labels.length > 6) {
                        powerChart.data.labels.shift(); // 移除最舊的標籤
                        powerChart.data.datasets[0].data.shift(); // 移除最舊的數據
                    }
                if (powerChart) {
                    const newData = Math.floor(Math.random() * 100) + 100; // 隨機模擬用電量
                    powerChart.data.labels.push(`${counter + 1}秒`); // 新增時間標籤
                    powerChart.data.datasets[0].data.push(newData); // 新增模擬數據
                    console.log(newData);
                    // 限制顯示的數據點數量（例如最多顯示 10 個）
                    
                    powerChart.update(); // 更新圖表
                    counter++
                }
            }, 1000); // 每秒更新一次數據
        } else {
            console.error('無法取得 canvas 上下文');
        }
    } else {
        console.error('找不到 canvas 元素');
    }

    // WebSocket 初始化
    const socket = new WebSocket('ws://localhost:3000');

    socket.addEventListener('open', () => {
        console.log('WebSocket 連線成功');
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.message) {
            blockchainMessagesDiv.innerHTML += `<p>${data.message}</p>`;
        }
    });

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            socket.send(JSON.stringify({ action: 'refresh' }));
        });
    }
});
