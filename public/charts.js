'use strict';
(async () => {
  const status = document.getElementById('chart-status');
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error('data.json: ' + response.status);
    const data = await response.json();
    if (typeof Chart === 'undefined') throw new Error('Chart.js unavailable');
    const {draw} = window.RaceCharts;
    const series = (key, label, color) => ({label, data: data.km.map(k => ({x: k.km, y: k[key]})), borderColor: color});
    draw('pace', [series('pace_s', 'ペース', '#e2512a')], {unit: '分:秒 /km', reverse: true, paceAxis: true});
    draw('elevation', [{label: '標高', data: data.elevation.map(([x,y]) => ({x,y})), borderColor: '#16191d', backgroundColor: '#16191d30', fill: 'origin'}], {unit: 'm'});
    draw('hr', [series('hr', '心拍', '#c0392b')], {unit: 'bpm'});
    draw('cadence', [series('cadence_spm', 'ケイデンス', '#e2512a')], {unit: 'spm'});
    draw('power', [series('power_w', 'パワー', '#16191d')], {unit: 'W'});
    draw('stance', [series('stance_ms', '接地時間', '#6b7178')], {unit: 'ms'});
    const yoy = data.yoy5k;
    draw('yoy', [
      {label: '2025年', data: yoy.pace2025_s, borderColor: '#9aa0a6', borderDash: [5,4]},
      {label: '2026年', data: yoy.pace2026_s, borderColor: '#e2512a'}
    ], {unit: '分:秒 /km', reverse: true, paceAxis: true, category: true, labels: yoy.labels});
    status.hidden = true;
  } catch (error) {
    console.error(error);
    status.textContent = 'グラフを読み込めませんでした。時間をおいて再読み込みしてください。';
  }
})();
