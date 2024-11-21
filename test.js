// 等待 DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('testChart').getContext('2d');

    // 初始化 Chart.js 圖表
    new Chart(ctx, {
        type: 'bar', // 圖表類型：長條圖
        data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'], // X 軸標籤
            datasets: [{
                label: '用電量 (kWh)',
                data: [12, 19, 3, 5, 2, 3], // Y 軸數據
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1 // 條形邊框寬度
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true // Y 軸從零開始
                }
            }
        }
    });
});
