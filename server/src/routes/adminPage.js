/**
 * The owner's usage dashboard: one self-contained page (no libraries, no outside requests). Everything that comes from visitors
 * (URLs, company names, emails) is written into the page with textContent, never as HTML.
 */
export function renderDashboard(nonce, base) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>Usage</title>
<style nonce="${nonce}">
:root{--bg:#071832;--card:#0f2850;--line:#1e3a6b;--tx:#e8eefc;--mut:#8fa6c9;--or:#ff6a1a;--bl:#7aa7ff;--gr:#34d399;--rd:#ff7a7a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
.w{max-width:1180px;margin:0 auto;padding:24px 20px 60px}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:22px}
h1{font-size:22px;margin:0}h1 small{display:block;font-size:13px;color:var(--mut);font-weight:400;margin-top:2px}
button{font:inherit;color:var(--tx);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 14px;cursor:pointer}button:hover{border-color:var(--or)}
.g{display:grid;gap:14px}.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:860px){.g2,.g3,.g4{grid-template-columns:1fr 1fr}}@media(max-width:520px){.g2,.g3,.g4{grid-template-columns:1fr}}
.c{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.c h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0 0 12px;font-weight:600}
.big{font-size:38px;font-weight:700;line-height:1.1}.big.or{color:var(--or)}.big.bl{color:var(--bl)}.sub{color:var(--mut);font-size:13px;margin-top:4px}
.k{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)}.k:last-child{border:0}.k b{font-weight:600}
table{width:100%;border-collapse:collapse;font-size:13.5px}th{color:var(--mut);text-align:left;font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top;word-break:break-word}
.tw{overflow-x:auto}.ok{color:var(--gr)}.bad{color:var(--rd)}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.sec{margin-top:18px}.empty{color:var(--mut);padding:8px 0}.lg{text-transform:none;letter-spacing:0;font-weight:400}.d1{background:var(--or)}.d2{background:var(--bl);margin-left:12px}.mt12{margin-top:12px}.mt10{margin-top:10px}.num{font-size:22px;font-weight:700}
</style></head><body><div class="w">
<header><h1>Usage<small id="meta">Loading…</small></h1><div><button id="refresh" type="button">Refresh</button> <button id="out" type="button">Sign out</button></div></header>
<div class="g g2" id="kpis"></div>
<div class="c sec"><h2>Last 30 days <span class="lg"><span class="dot d1"></span>Product pages enriched <span class="dot d2"></span>Reports generated</span></h2><div id="chart"></div></div>
<div class="g g3 sec" id="mid"></div>
<div class="c sec"><h2>Recent activity</h2><div class="tw"><table><thead><tr><th>When</th><th>Feature</th><th>Result</th><th>Time</th><th>Product page</th><th>Who</th></tr></thead><tbody id="recent"></tbody></table></div></div>
<p class="sub" id="note"></p>
</div>
<script nonce="${nonce}">
(function(){
var BASE=${JSON.stringify(base)};
var $=function(id){return document.getElementById(id)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function n(v){return v===null||v===undefined?'-':String(v)}
function mins(s){if(s===null||s===undefined)return '-';return s<90?s+' s':(Math.round(s/6)/10)+' min'}
function when(ts,tz){try{return new Date(ts).toLocaleString('en-GB',{timeZone:tz,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return ts}}
var NAMES={enrich:'Product page enrichment',report:'AI Readiness Report'};
function kpi(title,t,cls){
  var c=el('div','c');c.appendChild(el('h2','',title));
  c.appendChild(el('div','big '+cls,n(t.done)));c.appendChild(el('div','sub','all time'));
  var g=el('div','g g3 mt12');
  [['Today',t.today],['Last 7 days',t.last7],['Last 30 days',t.last30]].forEach(function(p){var b=el('div');b.appendChild(el('div','num',n(p[1])));b.appendChild(el('div','sub',p[0]));g.appendChild(b)});
  c.appendChild(g);
  var f=el('div','sub mt10','Failed: '+t.failed+'  ·  Success rate: '+(t.successRate===null?'-':t.successRate+'%')+'  ·  Typical time: '+mins(t.seconds.median));c.appendChild(f);
  return c}
function chart(days){
  var box=$('chart');box.textContent='';
  var W=1100,H=210,pl=28,pb=24,max=2;days.forEach(function(d){max=Math.max(max,d.enrich,d.report)});max+=max%2;
  var ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 '+W+' '+H);s.setAttribute('width','100%');s.setAttribute('role','img');s.setAttribute('aria-label','Daily usage, last 30 days');
  var iw=W-pl,bw=iw/days.length;
  [0,.5,1].forEach(function(f){var y=H-pb-(H-pb-8)*f;var l=document.createElementNS(ns,'line');l.setAttribute('x1',pl);l.setAttribute('x2',W);l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('stroke','#1e3a6b');s.appendChild(l);var t=document.createElementNS(ns,'text');t.setAttribute('x',0);t.setAttribute('y',y+4);t.setAttribute('fill','#8fa6c9');t.setAttribute('font-size','11');t.textContent=Math.round(max*f);s.appendChild(t)});
  days.forEach(function(d,i){
    [['enrich','#ff6a1a',0],['report','#7aa7ff',1]].forEach(function(p){
      var h=(H-pb-8)*(d[p[0]]/max),r=document.createElementNS(ns,'rect');
      r.setAttribute('x',pl+i*bw+bw*.12+p[2]*bw*.38);r.setAttribute('y',H-pb-h);r.setAttribute('width',bw*.36);r.setAttribute('height',Math.max(h,d[p[0]]?2:0));r.setAttribute('rx',2);r.setAttribute('fill',p[1]);
      var tt=document.createElementNS(ns,'title');tt.textContent=d.day+': '+d[p[0]]+' '+(p[0]==='enrich'?'enriched':'reports');r.appendChild(tt);s.appendChild(r)});
    if(i%5===0||i===days.length-1){var t=document.createElementNS(ns,'text');t.setAttribute('x',pl+i*bw+bw/2);t.setAttribute('y',H-6);t.setAttribute('text-anchor','middle');t.setAttribute('fill','#8fa6c9');t.setAttribute('font-size','11');t.textContent=d.day.slice(5);s.appendChild(t)}
  });
  box.appendChild(s)}
function render(d){
  $('meta').textContent='Updated '+when(d.generatedAt,d.tz)+' ('+d.tz+')';
  var k=$('kpis');k.textContent='';k.appendChild(kpi('Product pages enriched',d.totals.enrich,'or'));k.appendChild(kpi('AI Readiness Reports generated',d.totals.report,'bl'));
  chart(d.days);
  var mid=$('mid');mid.textContent='';
  var q=el('div','c');q.appendChild(el('h2','','Enrichment quality'));
  [['Average attributes found',d.quality.avgAttributes],['Average technical attributes',d.quality.avgTechnical],['Reached 15 attributes',d.quality.pctAtLeast15===null?'-':d.quality.pctAtLeast15+'%'],['Had 6+ technical',d.quality.pctTechnical6===null?'-':d.quality.pctTechnical6+'%'],['Product image found',d.quality.pctImage===null?'-':d.quality.pctImage+'%'],['Taxonomy placed',d.quality.pctTaxonomy===null?'-':d.quality.pctTaxonomy+'%']].forEach(function(r){var row=el('div','k');row.appendChild(el('span','',r[0]));row.appendChild(el('b','',n(r[1])));q.appendChild(row)});
  mid.appendChild(q);
  var f=el('div','c');f.appendChild(el('h2','','Failures'));
  if(!d.failures.length)f.appendChild(el('div','empty','No failures recorded.'));
  d.failures.slice(0,8).forEach(function(r){var row=el('div','k');row.appendChild(el('span','',(r.type==='enrich'?'Enrichment: ':'Report: ')+r.reason));row.appendChild(el('b','bad',n(r.count)));f.appendChild(row)});
  mid.appendChild(f);
  var h=el('div','c');h.appendChild(el('h2','','Most used product sites'));
  if(!d.topHosts.length)h.appendChild(el('div','empty','Nothing yet.'));
  d.topHosts.forEach(function(r){var row=el('div','k');row.appendChild(el('span','',r.host));row.appendChild(el('b','',n(r.count)));h.appendChild(row)});
  mid.appendChild(h);
  var tb=$('recent');tb.textContent='';
  if(!d.recent.length){var tr0=el('tr');var td0=el('td','empty','No activity recorded yet.');td0.colSpan=6;tr0.appendChild(td0);tb.appendChild(tr0)}
  d.recent.forEach(function(e){
    var tr=el('tr');
    tr.appendChild(el('td','',when(e.ts,d.tz)));
    tr.appendChild(el('td','',e.type==='enrich'?'Enrichment':'Report'));
    var res=el('td',e.status==='done'?'ok':'bad',e.status==='done'?(e.type==='enrich'?'Done'+(e.attrs!==null?' · '+e.attrs+' attributes':''):'Done'+(e.emailStatus?' · email '+e.emailStatus:'')):'Failed'+(e.reason?' · '+e.reason:''));tr.appendChild(res);
    tr.appendChild(el('td','',mins(e.secs)));
    tr.appendChild(el('td','',e.url||e.host||'-'));
    tr.appendChild(el('td','',[e.company,e.name,e.email].filter(Boolean).join(' · ')||'-'));
    tb.appendChild(tr)});
  var first=[d.totals.enrich.firstAt,d.totals.report.firstAt].filter(Boolean).sort()[0];
  $('note').textContent=first?'Counting since '+when(first,d.tz)+'. Only finished runs are counted; a run that is still going is added when it ends.':'Counting starts with the first finished run.'}
function load(){fetch(BASE+'data',{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('x');return r.json()}).then(render).catch(function(){$('meta').textContent='Session ended. Sign in again from the website.'})}
$('refresh').addEventListener('click',load);
$('out').addEventListener('click',function(){fetch(BASE+'logout',{method:'POST',credentials:'same-origin'}).finally(function(){location.replace('/')})});
load();setInterval(load,60000);
})();
</script></body></html>`
}
