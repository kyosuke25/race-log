import { readFile, writeFile } from 'node:fs/promises';
const d = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
const m = d.meta;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shell = (title, body, charts = false) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | レース記録</title><link rel="stylesheet" href="style.css">${charts ? '<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js"></script><script defer src="charts.js"></script>' : ''}</head><body><header class="site-header"><a href="index.html">レース記録</a></header><main>${body}</main></body></html>\n`;
const date = m.date.replace(/（.*）/, '');
await writeFile(new URL('../public/index.html', import.meta.url), shell('レース記録', `<h1>レース記録</h1><ul class="posts"><li><a href="fukuoka-2026.html">${esc(m.race)} ― ${esc(date)} / ネット ${esc(m.net)}</a></li></ul>`));
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
<dl class="gear">${metric('シューズ',m.shoes)}${metric('ウォッチ',m.watch)}</dl>
<p class="note">スプリットとグラフはウォッチのGPS計測ベース。タイムは公式ネット。</p></section>
<section aria-labelledby="graphs"><h2 id="graphs">グラフ</h2><p id="chart-status" role="status">グラフを読み込んでいます。</p><noscript><p>グラフの表示にはJavaScriptが必要です。<a href="data.json">計測データ</a></p></noscript>
${chart('pace','ペース推移')}${chart('elevation','高低図')}${chart('hr','心拍推移')}
<div class="small-charts">${chart('cadence','ケイデンス')}${chart('power','パワー')}${chart('stance','接地時間')}</div>
<figure><h3>前年比較</h3><p class="comparison">2025年 ${esc(d.yoy5k.total2025)} → 2026年 ${esc(d.yoy5k.total2026)}</p><div class="chart"><canvas id="yoy" role="img" aria-label="前年との5km区間平均ペース比較"></canvas></div></figure>
</section></article>`, true));
console.log('Generated index.html and fukuoka-2026.html from public/data.json');
