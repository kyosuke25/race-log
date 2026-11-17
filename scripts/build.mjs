import { readFile, writeFile, mkdir } from 'node:fs/promises';
const d = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
const m = d.meta;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shell = (title, body, charts = false) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Pace Notes</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;1,700&family=Noto+Sans+JP:wght@400;500;700&display=swap"><link rel="stylesheet" href="/style.css">${charts ? `<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js"></script><script defer src="/chart-utils.js"></script><script defer src="/${charts === true ? 'charts.js' : charts}"></script>` : ''}</head><body><header class="site-header"><div class="bar"><a class="brand" href="/">Pace<span>Notes</span></a><nav aria-label="サイト"><a href="/">レース</a><a href="/training/">トレーニング</a></nav></div></header><main>${body}</main><footer class="site-footer">Pace Notes — 走った距離と数字の記録</footer></body></html>\n`;
const date = m.date.replace(/（.*）/, '');
await writeFile(new URL('../public/index.html', import.meta.url), shell('ホーム', `<div class="hero"><p class="eyebrow">Running log</p><h1>Pace Notes</h1><p class="lede">走った距離と数字の記録</p></div><section><h2>レース</h2><ul class="posts"><li><a href="fukuoka-2026.html">${esc(m.race)} ― ${esc(date)} / ネット ${esc(m.net)}</a></li></ul></section><section><h2>トレーニング</h2><p class="link-card"><a href="/training/">トレーニング記録</a></p></section>`));
const shoeBar = (total, target) => `<span class="shoe-bar" role="img" aria-label="目標の${Math.round(total / target * 100)}%"><span style="width:${Math.min(100, total / target * 100).toFixed(1)}%"></span></span>`;
const shoeMetric = (total, target) => `<div><dt>シューズ累計／目標（この日時点）</dt><dd>${total.toFixed(1)} km ／ ${esc(target)} km ${shoeBar(total, target)}</dd></div>`;
const metric = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
const chart = (id, title) => `<figure><h3>${title}</h3><div class="chart"><canvas id="${id}" role="img" aria-label="${title}"></canvas></div></figure>`;
await writeFile(new URL('../public/fukuoka-2026.html', import.meta.url), shell(m.race, `<article>
<h1>${esc(m.race)}</h1><p class="date">${esc(m.date)}</p>
<section aria-labelledby="about"><h2 id="about">大会について</h2><ul class="facts">
<li>${esc(m.edition)}福岡マラソン（2014年に始まった大会）</li>
<li>${esc(m.date)}8:20スタート</li>
<li>コース：福岡市中央区天神（渡辺通り）スタート → 糸島市交流プラザ志摩館フィニッシュのワンウェイ42.195km、日本陸連公認コース</li>
<li>定員：マラソン13,000人（ファンラン・車いす競技を含む全種目で約15,000人）</li>
<li>主な通過点：百道浜（福岡タワー、みずほPayPayドーム前）、生の松原、九州大学伊都キャンパス付近、二見ヶ浦</li></ul></section>
<section aria-labelledby="results"><h2 id="results">結果</h2>
<dl class="times">${metric('ネットタイム', m.net)}${metric('前半',m.first_half)}${metric('後半',m.second_half)}</dl>
<h3>5kmスプリット</h3><table><thead><tr><th scope="col">区間</th><th scope="col">タイム</th><th scope="col">ペース /km</th></tr></thead><tbody>${d.splits5k.map(s=>`<tr><th scope="row">${esc(s.range)}</th><td>${esc(s.time)}</td><td>${esc(s.pace)}</td></tr>`).join('')}</tbody></table>
<h3>参考値</h3><dl class="metrics">${metric('平均心拍',m.avg_hr+' bpm')}${metric('最大心拍',m.max_hr+' bpm')}${metric('平均ケイデンス',m.avg_cadence_spm+' spm')}${metric('消費カロリー',m.calories_kcal.toLocaleString('ja-JP')+' kcal')}</dl>
<dl class="gear">${metric('シューズ',m.shoes)}${shoeMetric(m.shoe_total_km, m.shoe_target_km)}${metric('ウォッチ',m.watch)}</dl>
<p class="note">スプリットとグラフはウォッチのGPS計測ベース。タイムは公式ネット。</p></section>
<section aria-labelledby="graphs"><h2 id="graphs">グラフ</h2><p id="chart-status" role="status">グラフを読み込んでいます。</p><noscript><p>グラフの表示にはJavaScriptが必要です。<a href="data.json">計測データ</a></p></noscript>
${chart('pace','ペース推移（/km）')}${chart('elevation','高低図（m）')}${chart('hr','心拍推移（bpm）')}
<div class="small-charts">${chart('cadence','ケイデンス（spm）')}${chart('power','パワー（W）')}${chart('stance','接地時間（ms）')}</div>
<figure><h3>前年比較（/km）</h3><p class="comparison">2025年 ${esc(d.yoy5k.total2025)} → 2026年 ${esc(d.yoy5k.total2026)}</p><div class="chart"><canvas id="yoy" role="img" aria-label="前年との5km区間平均ペース比較"></canvas></div></figure>
</section></article>`, true));
console.log('Generated index.html and fukuoka-2026.html from public/data.json');

const training = JSON.parse(await readFile(new URL('../public/training-2026-11.json', import.meta.url), 'utf8'));
const comments = JSON.parse(await readFile(new URL('../public/comments.json', import.meta.url), 'utf8')).comments;
const month = training.month;
const km1 = meters => `${(Math.round(meters / 100) / 10).toFixed(1)} km`; // 小数第一位（第二位で四捨五入）
const distance = km1;
const mdw = (date, weekday) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}（${weekday}）`;
const jpDate = (date, weekday) => `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日（${weekday}）`;
// シューズの累計・目標はセッションごとの値（その時点）。月次表は各シューズの最後のセッション時点の値を出す
const duration = seconds => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const paceText = seconds => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const avgPace = session => `${paceText(session.elapsed_s / session.distance_m * 1000)} /km`;
const trainingDir = new URL('../public/training/', import.meta.url);
await mkdir(trainingDir, {recursive: true});
const back = `<p class="breadcrumb"><a href="/training/${esc(month.ym)}">${esc(month.ym)}</a></p>`;
const status = '<p id="chart-status" role="status">グラフを読み込んでいます。</p><noscript><p>グラフの表示にはJavaScriptが必要です。</p></noscript>';
await writeFile(new URL('index.html', trainingDir), shell('トレーニング記録', `<h1>トレーニング記録</h1><ul class="posts"><li><a href="/training/${esc(month.ym)}">${esc(month.ym)}</a></li></ul>`));
const rows = [...training.sessions.map(s => ({...s, href: `/training/${s.slug}`})), {...month.race, shoe: m.shoes, href: month.race.link}].sort((a,b) => a.date.localeCompare(b.date));
await writeFile(new URL(`${month.ym}.html`, trainingDir), shell(`${month.ym} トレーニング記録`, `<article data-training-month="${esc(month.ym)}">
<h1>${esc(month.ym)} トレーニング記録</h1><p class="date">${esc(month.through)} まで</p>
<section><h2>サマリ</h2><dl class="metrics month-summary">${metric('練習セッション数',`${month.training_sessions} 件`)}${metric('練習距離',km1(month.training_km*1000))}${metric('累計時間',duration(month.training_time_s))}${metric('レース込み総距離',km1(month.total_km_with_race*1000))}</dl></section>
<section><h2>距離</h2><p class="note">レースを含む</p>${status}<div class="month-charts">${chart('weekly','週別距離（km）')}${chart('daily','日別距離（km）')}</div></section>
<section><h2>セッション一覧</h2><div class="table-scroll" tabindex="0" role="region" aria-label="セッション一覧"><table class="session-table"><thead><tr>${['日付','距離','経過時間','平均ペース','平均心拍','シューズ'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(s=>`<tr><th scope="row"><a href="${esc(s.href)}">${esc(mdw(s.date, s.weekday))}</a></th><td>${distance(s.distance_m)}</td><td>${duration(s.elapsed_s)}</td><td>${avgPace(s)}</td><td>${s.avg_hr == null ? '—' : `${esc(s.avg_hr)} bpm`}</td><td>${esc(s.shoe ?? '—')}</td></tr>`).join('')}</tbody></table></div><p class="note">距離・経過時間はウォッチ計測。平均ペースは経過時間基準。</p></section>
<section><h2>シューズ</h2><div class="table-scroll" tabindex="0" role="region" aria-label="シューズ"><table class="shoe-table"><thead><tr>${['シューズ','累計距離','目標距離','達成率','時点'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${[...new Map([...training.sessions, {...month.race, shoe: m.shoes, shoe_total_km: m.shoe_total_km, shoe_target_km: m.shoe_target_km}].sort((a,b)=>a.date.localeCompare(b.date)).map(s => [s.shoe, s])).values()].sort((a,b) => b.shoe_total_km - a.shoe_total_km).map(s=>`<tr><th scope="row">${esc(s.shoe)}</th><td>${s.shoe_total_km.toFixed(1)} km</td><td>${esc(s.shoe_target_km)} km</td><td>${Math.round(s.shoe_total_km / s.shoe_target_km * 100)}% ${shoeBar(s.shoe_total_km, s.shoe_target_km)}</td><td>${esc(mdw(s.date, s.weekday))}</td></tr>`).join('')}</tbody></table></div><p class="note">各シューズの最後の練習・レース時点の値。</p></section></article>`, 'training-charts.js'));
for (const session of training.sessions) {
  if (!/^[a-z0-9-]+$/.test(session.slug)) throw new Error('Invalid session slug');
  const c = comments[session.slug];
  if (!c) throw new Error(`Missing comments: ${session.slug}`);
  const commentList = items => `<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
  await writeFile(new URL(`${session.slug}.html`, trainingDir), shell(jpDate(session.date, session.weekday), `${back}<article data-training-slug="${esc(session.slug)}">
<h1>${esc(jpDate(session.date, session.weekday))}</h1><p class="date">${esc(session.label)} · ${esc(session.start_time)} 開始</p>
<section><h2>結果</h2><dl class="times">${metric('距離',distance(session.distance_m))}${metric('経過時間',duration(session.elapsed_s))}${metric('平均ペース',avgPace(session))}</dl>
<dl class="metrics">${metric('平均心拍',`${session.avg_hr} bpm`)}${metric('最大心拍',`${session.max_hr} bpm`)}${metric('カロリー',`${session.calories.toLocaleString('ja-JP')} kcal`)}${metric('獲得標高',`${session.ascent_m} m`)}</dl>
<dl class="gear">${metric('シューズ',session.shoe)}${shoeMetric(session.shoe_total_km, session.shoe_target_km)}</dl><p class="note">平均ペースは経過時間基準。</p></section>
<section><h2>グラフ</h2>${status}<div class="small-charts tiles">${chart('pace','ペース（/km）')}${chart('elevation','標高（m）')}${chart('hr','心拍（bpm）')}${chart('cadence','ケイデンス（spm）')}${chart('power','パワー（W）')}${chart('stance','接地時間（ms）')}</div></section>
<section><h2>1kmスプリット</h2><div class="table-scroll" tabindex="0" role="region" aria-label="1kmスプリット"><table><thead><tr>${['区間','ペース /km','平均心拍'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${session.splits.map(s=>`<tr><th scope="row">${esc(s.km)} km${s.partial_m == null ? '' : `（端数 ${esc(s.partial_m)} m / ${paceText(s.sec)}）`}</th><td>${paceText(s.pace_s_km ?? s.sec)}</td><td>${esc(s.hr)} bpm</td></tr>`).join('')}</tbody></table></div></section>
<section class="manager-comments"><h2>マネージャーのコメント</h2><h3>総評</h3><p class="comment-summary">${esc(c.summary)}</p><h3>良かった点</h3><div class="comment-good">${commentList(c.good)}</div><h3>改善点</h3><div class="comment-improve">${commentList(c.improve)}</div></section></article>`, 'training-charts.js'));
}
console.log(`Generated training index, ${month.ym} and ${training.sessions.length} session pages`);
