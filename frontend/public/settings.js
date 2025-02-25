document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');
    const settingsMessage = document.getElementById('settingsMessage');
    const profilePicInput = document.getElementById('profilePic');
    const previewImage = document.getElementById('previewImage');
    const logoutLink = document.getElementById('logoutLink');

    // 載入現有設定
    async function loadCurrentSettings() {
        try {
            const response = await fetch('/user-settings');
            const data = await response.json();
            if (data.email) {
                document.getElementById('email').value = data.email;
            }
            if (data.profilePicUrl) {
                previewImage.src = data.profilePicUrl;
            }
        } catch (error) {
            console.error('載入設定失敗:', error);
        }
    }

    // 預覽圖片
    profilePicInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                // 儲存 base64 字串供後續使用
                previewImage.dataset.base64 = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 處理表單提交
    settingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        settingsMessage.textContent = '正在儲存...';
        
        const data = {
            email: document.getElementById('email').value,
            profilePic: previewImage.dataset.base64 || previewImage.src
        };

        try {
            const response = await fetch('/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                settingsMessage.style.color = 'green';
                settingsMessage.textContent = '設定已儲存！';
                // 更新頁面上的大頭貼
                document.querySelector('.profile-pic').src = data.profilePic;
            } else {
                settingsMessage.style.color = 'red';
                settingsMessage.textContent = result.message || '儲存失敗';
            }
        } catch (error) {
            settingsMessage.style.color = 'red';
            settingsMessage.textContent = '發生錯誤，請稍後再試';
            console.error('Error:', error);
        }
    });

    // 登出功能
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const response = await fetch('/logout');
                const result = await response.json();
                if (response.ok) {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('登出失敗:', error);
            }
        });
    }

    // 載入現有設定
    loadCurrentSettings();
});
