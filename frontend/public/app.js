// app.js

// 確保 DOM 完全載入後執行
document.addEventListener('DOMContentLoaded', () => {
    console.log('頁面已載入');
    updateUserInfo(); // 頁面載入時更新用戶資訊

    // 綁定登出功能
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const response = await fetch('/logout', { 
                    credentials: 'include' // 確保攜帶 session cookie
                });
                if (response.ok) {
                    localStorage.removeItem('userToken'); // 清除本地存儲（若有）
                    window.location.href = 'index.html'; // 登出後跳轉
                }
            } catch (error) {
                console.error('登出失敗:', error);
            }
        });
    }

    // 綁定頭像選單顯示/隱藏
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

    // 綁定註冊表單提交（如果頁面有 registerForm）
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(registerForm);
            const data = {
                username: formData.get('username'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirm-password')
            };

            if (data.password !== data.confirmPassword) {
                alert('密碼不一致，請重新輸入！');
                return;
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    alert('註冊成功！請登入');
                    window.location.href = '/index.html';
                } else {
                    alert('註冊失敗：' + result.message);
                }
            } catch (error) {
                console.error('Error during registration:', error);
                alert('註冊時發生錯誤');
            }
        });
    }

    // 設置導航欄 active 樣式
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
});

// 獲取用戶資訊並更新前端
async function updateUserInfo() {
    try {
        const response = await fetch('/user-info', {
            credentials: 'include', // 確保攜帶 session cookie
        });
        if (!response.ok) {
            throw new Error('無法獲取用戶資訊');
        }
        const data = await response.json();
        console.log('User Info:', data);

        // 更新頭像、用戶名和 email
        const profilePic = document.getElementById('profilePic');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const emailDisplay = document.getElementById('emailDisplay');

        if (profilePic) {
            profilePic.src = data.profilePicUrl || 'default.png';
        }
        if (usernameDisplay) {
            usernameDisplay.textContent = data.username || '訪客';
        }
        if (emailDisplay) {
            emailDisplay.textContent = data.email || '尚未註冊';
        }
    } catch (error) {
        console.error('更新用戶資訊失敗:', error);
        // 預設顯示
        const profilePic = document.getElementById('profilePic');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const emailDisplay = document.getElementById('emailDisplay');
        if (profilePic) profilePic.src = 'default.png';
        if (usernameDisplay) usernameDisplay.textContent = '訪客';
        if (emailDisplay) emailDisplay.textContent = '尚未註冊';
    }
}