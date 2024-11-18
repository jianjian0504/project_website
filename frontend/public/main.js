// 確保所有 HTML 元素已載入後才執行 JavaScript 程式碼
document.addEventListener('DOMContentLoaded', () => {
    console.log('主頁已載入');
    
    // 等待 DOM 完全載入後再綁定登出功能的事件
    var logoutLink = document.getElementById('logoutLink');

    if (logoutLink) {
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.removeItem('userToken');
            window.location.href = 'index.html';
        });
    }

    // 綁定頭像選單的顯示/隱藏行為
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');

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

    const powerInfoDiv = document.getElementById('powerInfo');
    const blockchainMessagesDiv = document.getElementById('blockchainMessages');
    const refreshButton = document.getElementById('refreshButton');

    const socket = new WebSocket('ws://localhost:3000');

    socket.addEventListener('open', () => {
        console.log('WebSocket connection established.');
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        blockchainMessagesDiv.innerHTML += `<p>${data.message}</p>`;
        if (data.powerInfo) {
            powerInfoDiv.textContent = `用電量: ${data.powerInfo} kWh`;
        }
    });

    refreshButton.addEventListener('click', () => {
        socket.send(JSON.stringify({ action: 'refresh' }));

    });
});

// 初始化圖表
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('powerChart').getContext('2d');
    
    if (ctx) {
        console.log('Canvas element found and ready to draw chart.');
        
        // 初始化圖表
        const powerChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // X 軸上的時間標籤
                datasets: [{
                    label: '用電量 (kWh)',
                    data: [], // Y 軸上的用電量數據
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second'
                        }
                    }
                }
            }
        });

        console.log('Chart initialized:', powerChart);
    } else {
        console.error('Canvas element not found!');
    }
});


// 動態更新圖表數據
function updateChart(data) {
    powerChart.data.labels.push(new Date()); // 新增時間標籤
    powerChart.data.datasets[0].data.push(data.powerUsage); // 新增用電量數據
    powerChart.update(); // 更新圖表
}

// 模擬數據上傳
setInterval(() => {
    fetch('/mock-power-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ powerUsage: Math.random() * 100 }) // 隨機模擬用電量
    })
    .then(response => response.json())
    .then(data => console.log(data));
}, 100000); // 每秒上傳一次數據

// 從後端取得用電數據並更新圖表
fetch('/power-data')
    .then(response => response.json())
    .then(data => {
        data.forEach(record => updateChart(record));
    });

    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('powerChart');
        if (canvas) {
            console.log('找到 canvas 元素');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                console.log('成功取得 canvas 上下文');
            } else {
                console.error('無法取得 canvas 上下文');
            }
        } else {
            console.error('找不到 canvas 元素');
        }
    });
    
    console.log(Chart); // 應該會在控制台輸出 Chart 的定義，如果沒有，則可能是 CDN 加載問題


// 確保 DOM 完全載入後再執行 JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('測試訊息：DOM 已經完全加載');
});
