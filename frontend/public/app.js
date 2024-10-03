// app.js
document.addEventListener('DOMContentLoaded', function() {
    var logoutLink = document.getElementById('logoutLink');

    if (logoutLink) { //登出功能
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault(); // 防止連結的默認行為

            // 清除用戶資料，例如本地存儲
            localStorage.removeItem('userToken'); // 根據你的存儲方式來調整
            
            // 導向登入頁面
            window.location.href = 'index.html'; // 替換為你的登入頁面 URL
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');

    // 切換選單的顯示狀態
    profileLink.addEventListener('click', (event) => {
        event.preventDefault(); // 防止跳轉
        const isVisible = profileMenu.style.display === 'block';
        profileMenu.style.display = isVisible ? 'none' : 'block';
    });

    // 點擊頁面其他地方隱藏選單
    document.addEventListener('click', (event) => {
        if (!profileLink.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.style.display = 'none';
        }
    });

    const powerInfoDiv = document.getElementById('powerInfo');
    const blockchainMessagesDiv = document.getElementById('blockchainMessages');
    const refreshButton = document.getElementById('refreshButton');

    // 建立 WebSocket 連接
    const socket = new WebSocket('ws://localhost:4000');

    // 當 WebSocket 連接成功
    socket.addEventListener('open', () => {
        console.log('WebSocket connection established.');
    });

    // 當接收到訊息
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        // 顯示區塊鏈訊息
        blockchainMessagesDiv.innerHTML += `<p>${data.message}</p>`;

        // 更新用電資訊
        if (data.powerInfo) {
            powerInfoDiv.textContent = `用電量: ${data.powerInfo} kWh`;
        }
    });

    // 刷新訊息的功能
    refreshButton.addEventListener('click', () => {
        socket.send(JSON.stringify({ action: 'refresh' }));
    });
});
