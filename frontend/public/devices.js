document.addEventListener('DOMContentLoaded', () => {
    const deviceForm = document.getElementById('deviceForm');
    const deviceMessage = document.getElementById('deviceMessage');
    const deviceList = document.getElementById('deviceList').getElementsByTagName('tbody')[0];
    const usernameDisplay = document.getElementById('usernameDisplay'); // 獲取用於顯示用戶名稱的元素

    
    // 獲取並顯示裝置列表
    const fetchDevices = async () => {
        try {
            deviceList.innerHTML = '<tr><td colspan="3">載入中...</td></tr>'; // 顯示載入狀態
            const response = await fetch('/devices'); // 假設後端有這個 API
            if (!response.ok) throw new Error('無法獲取裝置列表');
            const devices = await response.json();
            
            // 清空表格並填充數據
            deviceList.innerHTML = '';
            if (devices.length === 0) {
                deviceList.innerHTML = '<tr><td colspan="3">尚無裝置</td></tr>';
                return;
            }
            devices.forEach(device => {
                const row = deviceList.insertRow();
                row.insertCell(0).textContent = device.device_name;
                row.insertCell(1).textContent = device.contract_address;
                row.insertCell(2).textContent = new Date(device.created_at).toLocaleString();
            });
        } catch (error) {
            console.error('Error fetching devices:', error);
            deviceList.innerHTML = '<tr><td colspan="3">載入失敗，請稍後再試</td></tr>';
        }
    };
   

    // 表單提交事件
    deviceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const deviceName = document.getElementById('deviceName').value;
        const contractAddress = document.getElementById('contractAddress').value;

        try {
            const response = await fetch('/devices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceName,
                    contractAddress
                }),
            });

            const result = await response.json();
            if (result.success) {
                deviceMessage.style.color = 'green';
                deviceMessage.textContent = '裝置新增成功！';
                deviceForm.reset();
                fetchDevices(); // 重新獲取並更新列表
            } else {
                deviceMessage.style.color = 'red';
                deviceMessage.textContent = result.message || '新增失敗，請稍後再試。';
            }
        } catch (error) {
            deviceMessage.style.color = 'red';
            deviceMessage.textContent = '發生錯誤，請稍後再試。';
            console.error('Error:', error);
        }
    });

    // 初始化時獲取用戶名稱和裝置列表
    fetchDevices();
});

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

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // 獲取當前頁面文件名
    const navLinks = document.querySelectorAll('nav ul li a');
  
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active'); // 為當前頁面連結添加 active 類
      }
    });
  });