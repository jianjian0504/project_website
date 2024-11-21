import {Chart, registerables} from 'chart.js/dist/chart.js';

Chart.register(...registerables);

export * from 'chart.js/dist/chart.js';
export default Chart;
