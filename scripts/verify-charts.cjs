// Exercise the real chart adapters offline; browser rendering is covered separately.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const publicDir = path.join(__dirname, '../public');
const read = name => fs.readFileSync(path.join(publicDir, name), 'utf8');
const race = JSON.parse(read('data.json'));
const training = JSON.parse(read('training-2026-11.json'));
async function run(script, data, dataset) {
  const status = {hidden: false};
  const charts = new Map();
  await vm.runInNewContext(read(script), {
    document: {getElementById: () => status, querySelector: () => ({dataset})},
    fetch: async () => ({ok:true, json: async () => data}), Chart: {},
    window: {RaceCharts: {draw: (id, datasets, options) => charts.set(id, {datasets, options})}},
    console,
  });
  assert.equal(status.hidden, true, script);
  return charts;
}
const plain = value => JSON.parse(JSON.stringify(value));
(async () => {
  const raceCharts = await run('charts.js', race, {});
  assert.equal(raceCharts.size, 7);
  assert.deepEqual(plain(raceCharts.get('pace').datasets[0].data), race.km.map(k=>({x:k.km,y:k.pace_s})));
  assert.deepEqual(plain(raceCharts.get('elevation').datasets[0].data), race.session.elevation.map(([x,y])=>({x,y})));
  for (const session of training.sessions) {
    const charts = await run('training-charts.js', training, {trainingSlug:session.slug});
    assert.equal(charts.size, 6);
    assert.deepEqual(plain(charts.get('elevation').datasets[0].data), session.elevation.map(([x,y])=>({x,y})));
    for (const [id,key] of [['pace','pace'],['hr','hr'],['cadence','cadence'],['power','power'],['stance','gct']]) {
      assert.deepEqual(plain(charts.get(id).datasets[0].data),session.series[key].map(([m,y])=>({x:m/1000,y})));
    }
    assert.equal(charts.get('pace').options.reverse,true);
    assert.equal(charts.get('pace').datasets[0].label,'ペース（ムービングタイム基準）');
    if (session.slug === '2026-11-28-night') {
      assert(Math.max(...charts.get('pace').datasets[0].data.map(point=>point.y)) < 9 * 60);
    }
  }
  const month = await run('training-charts.js', training, {trainingMonth:training.month.ym});
  assert.equal(month.size,2);
  assert.equal(month.get('daily').datasets[0].data.length,30);
  console.log('PASS: race elapsed pace, training moving pace and distance axes, elevation km, reversed pace, and monthly charts.');
})().catch(error=>{console.error(error);process.exitCode=1;});
