document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');
    const settingsMessage = document.getElementById('settingsMessage');
    const profilePicInput = document.getElementById('profilePic');
    const previewImage = document.getElementById('previewImage');
    const logoutLink = document.getElementById('logoutLink');
    const usernameDisplay = document.getElementById('usernameDisplay');

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
            };
            reader.readAsDataURL(file);
        }
    });

    // 處理表單提交（改用 FormData 傳送 multipart/form-data）
    settingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        settingsMessage.textContent = '正在儲存...';

        const formData = new FormData(settingsForm);

        try {
            const response = await fetch('/settings', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                settingsMessage.style.color = 'green';
                settingsMessage.textContent = '設定已儲存並發送確認信！';
                if (result.profilePicUrl) {
                    previewImage.src = result.profilePicUrl;
                }
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

    // 顯示用戶名稱
    if (usernameDisplay) {
        fetch('/user-info')
            .then(response => response.json())
            .then(data => {
                usernameDisplay.textContent = data.username || '訪客';
            })
            .catch(error => {
                console.error('無法取得用戶資訊:', error);
                usernameDisplay.textContent = '訪客';
            });
    }
});
