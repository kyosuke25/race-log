const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page = await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.VERIFY_URL || 'http://localhost:8787';
 await page.goto(base+'/');
 assert.equal(await page.locator('.posts li').count(),1);
 assert.match(await page.locator('.posts').innerText(),/福岡マラソン2026 ― 2026年11月8日 \/ ネット 3:57:48/);
 await page.locator('.posts a').click();
 await page.waitForFunction(()=>document.querySelector('#chart-status').hidden);
 const d=await page.evaluate(()=>fetch('./data.json').then(r=>r.json()));
 assert.equal(await page.locator('article > section').count(),5);
 assert.equal(await page.locator('tbody tr').count(),d.splits5k.length);
 assert.deepEqual(await page.locator('.times dd').allTextContents(),[d.meta.net,d.meta.first_half,d.meta.second_half]);
 const charts=await page.evaluate(()=>Array.from(document.querySelectorAll('canvas')).map(c=>{const ch=Chart.getChart(c);return {id:c.id,data:ch.data.datasets.map(s=>s.data),reverse:ch.options.scales.y.reverse}}));
 assert.equal(charts.length,7);
 for(const [id,key] of [['pace','pace_s'],['hr','hr'],['cadence','cadence_spm'],['power','power_w'],['stance','stance_ms']]) assert.deepEqual(charts.find(c=>c.id===id).data[0],d.km.map(k=>({x:k.km,y:k[key]})));
 assert.equal(charts.find(c=>c.id==='pace').reverse,true);
 assert.deepEqual(charts.find(c=>c.id==='elevation').data[0],d.elevation.map(([x,y])=>({x,y})));
 assert.deepEqual(charts.find(c=>c.id==='yoy').data,[d.yoy5k.pace2025_s,d.yoy5k.pace2026_s]);
 for(const width of [375,1280]) {
 await page.setViewportSize({width,height:900});
 await page.waitForTimeout(300);
 await page.screenshot({path:`verification/article-${width}.png`,fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
 }
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('PASS: one post; five sections; all split rows; result times; seven charts match JSON; reversed pace axis; 375px/1280px without overflow; no page errors.');
})().catch(e=>{console.error(e);process.exit(1)});
