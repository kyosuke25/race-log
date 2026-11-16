'use strict';
(async () => {
  const status = document.getElementById('chart-status');
  try {
    const response = await fetch('/training-2026-11.json');
    if (!response.ok) throw new Error('Training data: ' + response.status);
    const training = await response.json();
    if (typeof Chart === 'undefined') throw new Error('Chart.js unavailable');
    const {draw} = window.RaceCharts;
    const article = document.querySelector('article');
    if (article.dataset.trainingMonth) {
      for (const [id, field] of [['weekly','weekly_m'], ['daily','daily_m']]) {
        const entries = Object.entries(training.month[field]).sort(([a],[b])=>a.localeCompare(b));
        draw(id, [{label:'距離',data:entries.map(([,m])=>m/1000),borderColor:'#286287',backgroundColor:'#286287b0'}], {
          type:'bar',unit:'km',category:true,labels:entries.map(([date])=>date),
          xTitle:id==='weekly' ? '週の月曜' : '日付',tooltipTitle:item=>item.label
        });
      }
    } else {
      const session = training.sessions.find(s=>s.slug===article.dataset.trainingSlug);
      if (!session) throw new Error('Session not found');
      const series = (key,label,color) => ({label,data:session.series[key].map(([m,y])=>({x:m/1000,y})),borderColor:color});
      draw('pace',[series('pace','ペース','#286287')],{unit:'分:秒 /km',reverse:true,paceAxis:true});
      draw('elevation',[{label:'標高',data:session.elevation.map(([m,y])=>({x:m/1000,y})),borderColor:'#698267',backgroundColor:'#69826730',fill:'origin'}],{unit:'m'});
      draw('hr',[series('hr','心拍','#b65d54')],{unit:'bpm'});
      draw('cadence',[series('cadence','ケイデンス','#286287')],{unit:'spm'});
      draw('power',[series('power','パワー','#8b7042')],{unit:'W'});
      draw('stance',[series('gct','接地時間','#77658d')],{unit:'ms'});
    }
    status.hidden = true;
  } catch (error) {
    console.error(error);
    status.textContent = 'グラフを読み込めませんでした。時間をおいて再読み込みしてください。';
  }
})();
