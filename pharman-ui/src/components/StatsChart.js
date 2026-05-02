import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StatsChart = ({ statsData }) => {
    const data = {
        labels: ['2023', '2024', '2025', '2026'],
        datasets: [
            {
                label: 'Ventes',
                data: statsData.ventes || [120, 190, 300, 250],
                backgroundColor: 'rgba(46, 204, 113, 0.6)',
            },
            {
                label: 'Stock Global',
                data: statsData.stocks || [200, 250, 210, 180],
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
            }
        ],
    };

    return (
        <div style={{ width: '100%', height: '300px', marginTop: '20px' }}>
            <h3>Analyse Comparative Annuelle</h3>
            <Bar data={data} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
    );
};

export default StatsChart;