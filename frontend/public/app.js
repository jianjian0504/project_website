// 確保所有 HTML 元素已載入後才執行 JavaScript 程式碼
document.addEventListener('DOMContentLoaded', () => {
    console.log('註冊頁面已載入');
});

// 等待 DOM 完全載入後再綁定登出功能的事件
document.addEventListener('DOMContentLoaded', function() {
    var logoutLink = document.getElementById('logoutLink');

    if (logoutLink) { // 如果找到登出連結元素，則設定點擊事件
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault(); // 防止點擊連結時的預設跳轉行為

            // 清除本地存儲中的用戶資料（範例為 userToken，可依需求調整）
            localStorage.removeItem('userToken');

            // 導向登入頁面
            window.location.href = 'index.html';
        });
    }
});

// 綁定頭像選單的顯示/隱藏行為
document.addEventListener('DOMContentLoaded', () => {
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');

    // 當使用者點擊頭像時，切換選單的顯示狀態
    profileLink.addEventListener('click', (event) => {
        event.preventDefault(); // 阻止超連結預設行為
        const isVisible = profileMenu.style.display === 'block'; // 判斷選單是否已顯示
        profileMenu.style.display = isVisible ? 'none' : 'block'; // 切換顯示/隱藏
    });

    // 若使用者點擊頁面其他地方，則隱藏選單
    document.addEventListener('click', (event) => {
        if (!profileLink.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.style.display = 'none'; // 隱藏選單
        }
    });


});

// 綁定註冊表單的提交事件
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表單預設提交行為，避免重整頁面

    const formData = new FormData(this); // 取得表單資料
    const data = {
        username: formData.get('username'), // 取得使用者輸入的帳號
        password: formData.get('password'),  // 取得使用者輸入的密碼
        confirmPassword: formData.get('confirm-password') // 取得使用者輸入的確認密碼
    };
    
    // 檢查密碼和確認密碼是否一致
    if (data.password !== data.confirmPassword) {
        alert('密碼不一致，請重新輸入！');
        return; // 停止進一步的處理
    }
    
    // 使用 Fetch API 呼叫後端 API 進行註冊請求
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // 設定請求的內容格式為 JSON
        },
        body: JSON.stringify(data) // 將表單資料轉為 JSON 格式傳送
    })
    .then(response => response.json()) // 將回應解析為 JSON
    .then(result => {
        if (result.success) { // 若註冊成功
            alert('註冊成功！請登入'); // 顯示成功提示
            window.location.href = '/index.html'; // 導向登入頁面
        } else { // 若註冊失敗
            alert('註冊失敗：' + result.message); // 顯示錯誤訊息
        }
    })
    .catch(error => {
        console.error('Error during registration:', error); // 在主控台顯示錯誤訊息
    });
})

