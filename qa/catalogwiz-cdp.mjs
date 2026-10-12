import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9333
const root = resolve('qa/catalogwiz-scenes')
const profile = await mkdtemp(join(tmpdir(), 'catalogwiz-chrome-'))
await mkdir(root, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms))
let version
for (let i = 0; i < 30; i += 1) {
  try {
    version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json())
    break
  } catch { await wait(100) }
}
if (!version) throw new Error('Chrome DevTools endpoint did not start')

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('http://127.0.0.1:5173/how-it-works#catalogwiz')}`, { method: 'PUT' }).then((r) => r.json())
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolveOpen, rejectOpen) => {
  ws.addEventListener('open', resolveOpen, { once: true })
  ws.addEventListener('error', rejectOpen, { once: true })
})

let messageId = 0
const pending = new Map()
const browserErrors = []
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data)
  if (msg.method === 'Runtime.exceptionThrown') browserErrors.push(msg.params.exceptionDetails.text || 'Runtime exception')
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') browserErrors.push(msg.params.entry.text)
  if (!msg.id || !pending.has(msg.id)) return
  const { resolve: resolveMessage, reject: rejectMessage } = pending.get(msg.id)
  pending.delete(msg.id)
  if (msg.error) rejectMessage(new Error(msg.error.message))
  else resolveMessage(msg.result)
})

function send(method, params = {}) {
  messageId += 1
  return new Promise((resolveMessage, rejectMessage) => {
    pending.set(messageId, { resolve: resolveMessage, reject: rejectMessage })
    ws.send(JSON.stringify({ id: messageId, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function viewport(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await wait(250)
}

async function capture(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
  await writeFile(join(root, name), Buffer.from(data, 'base64'))
}

async function stage(index, name) {
  await evaluate(`(() => { const s=document.getElementById('catalogwiz'); s.scrollIntoView({block:'start'}); document.querySelectorAll('.cws-step')[${index}].click(); return true })()`)
  await wait(700)
  if (name) await capture(name)
}

async function auditStage(index) {
  await stage(index)
  return evaluate(`(() => {
    const index=${index};
    const scene=document.querySelectorAll('.cws-scene')[index];
    const visible=(el)=>{ const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.02&&r.width>1&&r.height>1; };
    const rect=(el)=>{ const r=el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
    const within=(a,b,t=2)=>a.left>=b.left-t&&a.top>=b.top-t&&a.right<=b.right+t&&a.bottom<=b.bottom+t;
    const intersects=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const sr=rect(scene);
    const cards=[...scene.querySelectorAll('.cws-card,.cws-static-card,.cws-qc,.cws-review-workbench,.cws-store')].filter(visible);
    const outside=cards.filter((el)=>!within(rect(el),sr)).map((el)=>el.className);
    const slot=scene.querySelector('.cws-slot[data-slot]');
    const normalCard=scene.querySelector('.cws-static-card');
    const slotContainment=!slot||!normalCard||!visible(normalCard)||within(rect(normalCard),rect(slot));
    const qc=scene.querySelector('.cws-qc');
    const approvalOverlap=qc&&normalCard&&visible(qc)&&visible(normalCard)?Math.round(intersects(rect(qc),rect(normalCard))):0;
    const textClips=[...scene.querySelectorAll('.tc-specs span,.tc-specs b,.cws-qc li,.cws-signoff-card dt,.cws-signoff-card dd')]
      .filter(visible).filter((el)=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1).map((el)=>el.textContent.trim());
    const specs=[...scene.querySelectorAll('.tc-specs li')].filter(visible).map((el)=>Math.round(el.getBoundingClientRect().top));
    const specRows=[...new Set(specs)].map((top)=>specs.filter((x)=>Math.abs(x-top)<3).length);
    const geometryOutliers=[...scene.querySelectorAll('*')].filter((el)=>{
      const s=getComputedStyle(el); const r=rect(el); return s.display!=='none'&&r.width>1&&r.height>1&&(r.left<sr.left-2||r.right>sr.right+2||r.top<sr.top-2||r.bottom>sr.bottom+2);
    }).slice(0,8).map((el)=>({className:el.className?.baseVal||el.className||el.tagName,rect:rect(el)}));
    const overlay=document.querySelector('.cws-travel');
    return {
      stage:index+1,
      outside,
      slotContainment,
      approvalOverlap,
      textClips,
      specRows,
      horizontalOverflow:scene.scrollWidth>scene.clientWidth+2,
      verticalOverflow:scene.scrollHeight>scene.clientHeight+2,
      dimensions:{clientWidth:scene.clientWidth,scrollWidth:scene.scrollWidth,clientHeight:scene.clientHeight,scrollHeight:scene.scrollHeight},
      slotRects:slot&&normalCard&&!slotContainment?{slot:rect(slot),card:rect(normalCard)}:null,
      geometryOutliers,
      motionOverlayVisible:Number(getComputedStyle(overlay).opacity)>.02,
    };
  })()`)
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await viewport(1440, 900)
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/how-it-works#catalogwiz' })
  await wait(1800)

  if (process.env.LOOP_QA === '1') {
    await evaluate(`(() => { document.getElementById('catalogwiz').scrollIntoView({block:'start'}); const b=[...document.querySelectorAll('.cws-ctl')].find((x)=>x.textContent.includes('Replay')); b.click(); return true })()`)
    const transitions = []
    let previous = ''
    for (let i = 0; i < 60; i += 1) {
      await wait(2000)
      const label = await evaluate(`(() => document.querySelector('.cws-step.is-active b')?.textContent || (document.querySelectorAll('.cws-step.is-done').length===5 ? 'Complete' : 'Reset'))()`)
      if (label !== previous) { transitions.push({ second: (i + 1) * 2, label }); previous = label }
    }
    console.log(JSON.stringify({ durationSeconds: 120, transitions, connectPasses: transitions.filter((x) => x.label === 'Connect').length }, null, 2))
  } else {
    const labels = ['01-upload-final.png', '02-enrich-final.png', '03-review-final.png', '04-approve-final.png', '05-publish-final.png']
    for (let i = 0; i < labels.length; i += 1) await stage(i, labels[i])

    const viewportMatrix = []
    for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1024,900],[768,1024],[390,844],[360,800]]) {
      await viewport(width, height, width < 640)
      const stages = []
      for (let i = 0; i < 5; i += 1) stages.push(await auditStage(i))
      viewportMatrix.push({ width, height, stages })
    }

    await viewport(1440, 900)

  const controls = await evaluate(`(async () => {
    const buttons=[...document.querySelectorAll('.cws-ctl')];
    const replay=buttons.find((b)=>b.textContent.includes('Replay'));
    const toggle=buttons.find((b)=>b.textContent.includes('Pause')||b.textContent.includes('Play'));
    replay.click(); await new Promise((r)=>setTimeout(r,120));
    const afterReplay=document.querySelector('.cws-step.is-active b')?.textContent;
    toggle.click(); await new Promise((r)=>setTimeout(r,80)); const afterPause=toggle.textContent.trim();
    toggle.click(); await new Promise((r)=>setTimeout(r,80)); const afterPlay=toggle.textContent.trim();
    return {afterReplay,afterPause,afterPlay};
  })()`)

  const desktop = await evaluate(`(() => { const s=document.getElementById('catalogwiz'); const c=s.querySelector('.cws-canvas'); const r=s.getBoundingClientRect(); return {sectionOverflow:s.scrollWidth>s.clientWidth,canvasHeight:Math.round(c.getBoundingClientRect().height),top:Math.round(r.top),bottom:Math.round(r.bottom),active:document.querySelector('.cws-step.is-active b')?.textContent}; })()`)

  await viewport(900, 1024)
  await stage(2, 'tablet-review.png')
  const tablet = await evaluate(`(() => { const s=document.getElementById('catalogwiz'); return {overflow:s.scrollWidth>s.clientWidth,width:s.clientWidth,scrollWidth:s.scrollWidth}; })()`)

  await viewport(390, 844, true)
  await stage(4, 'mobile-publish.png')
  const mobile = await evaluate(`(() => { const s=document.getElementById('catalogwiz'); return {overflow:s.scrollWidth>s.clientWidth,width:s.clientWidth,scrollWidth:s.scrollWidth}; })()`)

    await send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await send('Page.navigate', { url: 'about:blank' })
    await wait(250)
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/how-it-works#catalogwiz' })
    await wait(2600)
    const reduced = await evaluate(`(() => ({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,disabled:[...document.querySelectorAll('.cws-controls button')].filter((b)=>b.disabled).map((b)=>b.textContent.trim()),completed:[...document.querySelectorAll('.cws-step.is-done b')].map((b)=>b.textContent),ready:document.readyState}))()`)

    console.log(JSON.stringify({ controls, desktop, tablet, mobile, reduced, viewportMatrix, browserErrors }, null, 2))
  }
} finally {
  ws.close()
  chrome.kill()
  await new Promise((resolveExit) => chrome.once('exit', resolveExit))
  for (let i = 0; i < 5; i += 1) {
    try { await rm(profile, { recursive: true, force: true }); break } catch { await wait(200) }
  }
}
