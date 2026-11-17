const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const d=JSON.parse(fs.readFileSync('public/training-2026-11.json'));
 const comments=JSON.parse(fs.readFileSync('public/comments.json')).comments;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:375,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.VERIFY_URL||'http://localhost:8787';
 const visit=async path=>{const r=await page.goto(base+path);assert.equal(r.status(),200,path);};
 const ready=()=>page.waitForFunction(()=>document.querySelector('#chart-status').hidden);
 const chart=id=>page.evaluate(id=>{const c=Chart.getChart(id);return {type:c.config.type,data:c.data.datasets.map(d=>d.data),reverse:c.options.scales.y.reverse};},id);
 const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');
 await visit('/');await page.locator('main a[href="/training/"]').click();
 assert.equal(await page.locator('.posts li').count(),1);
 await page.locator('a[href="/training/2026-11"]').click();await ready();
 assert.deepEqual(await page.locator('.month-summary dd').allTextContents(),['6 件','36.7 km','4:04:21','79.15 km']);
 assert.equal(await page.locator('.session-table tbody tr').count(),7);
 assert.equal(await page.locator('.session-table a[href="/fukuoka-2026"]').count(),2);
 for(const [id,key] of [['weekly','weekly_m'],['daily','daily_m']]){
 const c=await chart(id);assert.equal(c.type,'bar');assert.deepEqual(c.data[0],Object.entries(d.month[key]).sort(([a],[b])=>a.localeCompare(b)).map(([,m])=>m/1000));
 }
 await noOverflow();await page.screenshot({path:'verification/training-month-375.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(300);await noOverflow();
 await page.screenshot({path:'verification/training-month-1280.png',fullPage:true});
 const pace=s=>{const n=Math.round(s);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')} /km`;};
 for(const s of d.sessions){
 await page.setViewportSize({width:375,height:900});await visit('/training/'+s.slug);await ready();
 assert.equal(await page.locator('canvas').count(),6);
 assert.equal(await page.locator('.times dd').nth(2).innerText(),pace(s.elapsed_s/s.distance_m*1000));
 assert.equal(await page.locator('.gear dd').innerText(),s.shoe);
 assert.equal(await page.locator('tbody tr').count(),s.splits.length);
 for(const [i,split] of s.splits.entries())if(split.partial_m!=null){const row=await page.locator('tbody tr').nth(i).innerText();assert(row.includes(`${split.partial_m} m`));assert(row.includes('端数'));}
 assert.equal(await page.locator('.comment-summary').textContent(),comments[s.slug].summary);
 assert.deepEqual(await page.locator('.comment-good li').allTextContents(),comments[s.slug].good);
 assert.deepEqual(await page.locator('.comment-improve li').allTextContents(),comments[s.slug].improve);
 for(const [id,key] of [['pace','pace'],['hr','hr'],['cadence','cadence'],['power','power'],['stance','gct']]){
 const c=await chart(id);assert.deepEqual(c.data[0],s.series[key].map(([m,y])=>({x:m/1000,y})));if(id==='pace')assert(c.reverse);
 }
 assert.deepEqual((await chart('elevation')).data[0],s.elevation.map(([m,y])=>({x:m/1000,y})));
 await noOverflow();
 if(s===d.sessions[0])await page.screenshot({path:'verification/training-session-375.png',fullPage:true});
 console.log('PASS session:',s.slug);
 }
 assert(!fs.existsSync('public/training/2026-11-08.html'));
 assert.deepEqual(errors,[]);
 console.log('PASS: training navigation, source month summary, 7 session/race rows, monthly bars, all 6 sessions and 36 charts, elapsed pace, partial splits, verbatim comments, responsive layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
