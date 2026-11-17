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
      const md = date => `${Number(date.slice(5,7))}/${Number(date.slice(8))}`;
      const bar = (id, entries, tick) => draw(id, [{label:'距離',data:entries.map(([,m])=>m/1000),borderColor:'#e2512a',backgroundColor:'#e2512ab0'}], {
        type:'bar',unit:'km',category:true,labels:entries.map(([date])=>date),xTick:tick,tooltipTitle:item=>tick(item.label)
      });
      bar('weekly', Object.entries(training.month.weekly_m).sort(([a],[b])=>a.localeCompare(b)), date=>`${md(date)}〜`);
      // 月の全日を並べ、記録のない日は 0 km（休養日）として表示
      const [y, mo] = training.month.ym.split('-').map(Number);
      const days = Array.from({length:new Date(y, mo, 0).getDate()}, (_, i) => `${training.month.ym}-${String(i+1).padStart(2,'0')}`);
      bar('daily', days.map(date=>[date, training.month.daily_m[date] ?? 0]), md);
    } else {
      const session = training.sessions.find(s=>s.slug===article.dataset.trainingSlug);
      if (!session) throw new Error('Session not found');
      const series = (key,label,color) => ({label,data:session.series[key].map(([m,y])=>({x:m/1000,y})),borderColor:color});
      draw('pace',[series('pace','ペース','#e2512a')],{unit:'分:秒 /km',reverse:true,paceAxis:true});
      draw('elevation',[{label:'標高',data:session.elevation.map(([m,y])=>({x:m/1000,y})),borderColor:'#16191d',backgroundColor:'#16191d30',fill:'origin'}],{unit:'m'});
      draw('hr',[series('hr','心拍','#c0392b')],{unit:'bpm'});
      draw('cadence',[series('cadence','ケイデンス','#e2512a')],{unit:'spm'});
      draw('power',[series('power','パワー','#16191d')],{unit:'W'});
      draw('stance',[series('gct','接地時間','#6b7178')],{unit:'ms'});
    }
    status.hidden = true;
  } catch (error) {
    console.error(error);
    status.textContent = 'グラフを読み込めませんでした。時間をおいて再読み込みしてください。';
  }
})();
