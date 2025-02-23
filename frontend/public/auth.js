// 檢查用戶是否已登入的函數
function checkAuth() {
    return fetch('/check-auth')
        .then(response => {
            if (!response.ok) {
                throw new Error('未登入');
            }
            return response.json();
        })
        .then(data => {
            if (!data.authenticated) {
                throw new Error('未登入');
            }
            return true;
        })
        .catch(error => {
            alert('未登入，請先登入');
            window.location.href = 'index.html';
            return false;
        });
}

// 在頁面載入時檢查登入狀態
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
}); 