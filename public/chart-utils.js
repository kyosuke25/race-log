'use strict';
window.RaceCharts = (() => {
    const pace = seconds => {
      const rounded = Math.round(seconds);
      return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
    };
    // 停止などの外れ値で軸が間延びしないよう、遅い側は中央値+90秒で打ち切る（はみ出した値は描画範囲外）
    const paceRange = datasets => {
      const ys = datasets.flatMap(d => d.data.map(p => typeof p === 'number' ? p : p.y)).filter(Number.isFinite).sort((a, b) => a - b);
      const median = ys[Math.floor(ys.length / 2)];
      const min = Math.floor(ys[0] / 30) * 30, max = Math.ceil(Math.min(ys.at(-1), median + 90) / 30) * 30;
      return {min, max, ticks: {callback: pace, stepSize: max - min > 180 ? 60 : 30}};
    };
    const draw = (id, datasets, {unit, reverse = false, paceAxis = false, category = false, labels, type = 'line', xTick, tooltipTitle} = {}) => {
      Chart.defaults.font.family = '"Noto Sans JP", system-ui, sans-serif';
      Chart.defaults.color = '#6b7178';
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
            x: {type: category ? 'category' : 'linear', ...(category ? {} : {min: 0, max: Math.max(...datasets.flatMap(d => d.data.map(p => p.x)))}), grid: {display: false}, ticks: {maxTicksLimit: 7, maxRotation: 0, ...(xTick ? {callback(v) { return xTick(this.getLabelForValue(v)); }} : {})}},
            y: {reverse, beginAtZero: type === 'bar', grid: {color: '#eeeae2'}, ...(paceAxis ? paceRange(datasets) : {})}
          }
        }
      });
    };
    return {draw, pace};
})();
