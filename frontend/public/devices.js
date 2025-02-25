document.addEventListener('DOMContentLoaded', () => {
    const deviceForm = document.getElementById('deviceForm');
    const deviceMessage = document.getElementById('deviceMessage');

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
}); 