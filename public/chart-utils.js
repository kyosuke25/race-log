'use strict';
window.RaceCharts = (() => {
    const pace = seconds => {
      const rounded = Math.round(seconds);
      return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
    };
    const draw = (id, datasets, {unit, reverse = false, paceAxis = false, category = false, labels, type = 'line', xTitle, tooltipTitle} = {}) => {
      Chart.defaults.font.family = 'system-ui, sans-serif';
      Chart.defaults.color = '#596671';
      new Chart(document.getElementById(id), {
        type,
        data: {labels, datasets: datasets.map(dataset => ({borderWidth: 2, pointRadius: 0, pointHitRadius: 12, tension: 0, ...dataset}))},
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: {mode: 'index', intersect: false},
          plugins: {
            legend: {display: datasets.length > 1, position: 'bottom', labels: {usePointStyle: true}},
            tooltip: {callbacks: {
              title: items => tooltipTitle ? tooltipTitle(items[0]) : `${items[0].label} km`,
              label: context => `${context.dataset.label}: ${paceAxis ? pace(context.parsed.y) : context.parsed.y} ${unit}`
            }}
          },
          scales: {
            x: {type: category ? 'category' : 'linear', title: {display: true, text: xTitle || (category ? '区間（km）' : '距離（km）')}, grid: {display: false}, ticks: {maxTicksLimit: 7, maxRotation: 0}},
            y: {reverse, beginAtZero: type === 'bar', title: {display: true, text: unit}, grid: {color: '#edf0f2'}, ticks: paceAxis ? {callback: pace} : {}}
          }
        }
      });
    };
    return {draw, pace};
})();
