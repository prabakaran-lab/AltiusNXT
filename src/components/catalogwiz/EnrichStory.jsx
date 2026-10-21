import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { BadgeCheck, Check, FileText, Globe, Sparkles } from 'lucide-react'

/* The wait while a visitor's page is enriched, told as a short 3D story. Each scene follows the server's real stage:
   the page is scanned, its identity floats out, the manufacturer's datasheets fan out and are checked, attribute tiles
   drop into the page, the category tree is built, and the page splits into its before and after. Nothing shown here is a
   result: the labels name what is being done, never values. CSS 3D for the objects, GSAP for the camera between scenes. */

const STORY = [
  { stage: 'Reading your product page', short: 'Read page', say: (h) => `Reading every line of ${h}` },
  { stage: 'Identifying the product', short: 'Identify', say: () => 'Finding the brand, model and part number' },
  { stage: 'Checking the manufacturer’s published specifications', short: 'Verify', say: () => 'Cross-checking the manufacturer’s published data' },
  { stage: 'Writing the enriched title, description and attributes', short: 'Enrich', say: () => 'Writing a richer title, description and attributes' },
  { stage: 'Looking for more verified attributes', short: 'Deepen', say: () => 'Looking for more attributes we can verify' },
  { stage: 'Placing the product in its taxonomy', short: 'Classify', say: () => 'Placing it in the right category tree' },
  { stage: 'Preparing the before and after view of your page', short: 'Before / after', say: () => 'Building your before and after view' },
]
// stages the server reports in between (picture capture, queue) belong to the scene they happen in
const ALIAS = { 'Capturing the product picture': 1, 'Sending your request': 0, Queued: 0 }
const sceneOf = (stage) => {
  const i = STORY.findIndex((s) => s.stage === stage)
  return i >= 0 ? i : ALIAS[stage] ?? 0
}

// the camera for each scene: how the 3D world is turned to face what happens in it
const CAMERA = [
  { rotationX: 16, rotationY: -20, z: 0 },
  { rotationX: 10, rotationY: -6, z: 40 },
  { rotationX: 12, rotationY: -32, z: 0 },
  { rotationX: 8, rotationY: -12, z: 30 },
  { rotationX: 8, rotationY: -16, z: 30 },
  { rotationX: 12, rotationY: 20, z: 0 },
  { rotationX: 6, rotationY: 0, z: -20 },
]
const CHIPS = ['Brand', 'Model', 'Part number', 'Product type']
const DOCS = [['Datasheet', FileText], ['Manufacturer page', Globe], ['Spec sheet', FileText]]
const TILES = ['Material', 'Dimensions', 'Weight', 'Finish', 'Standard', 'Capacity', 'Rating', 'Colour', 'Compatibility', 'Pack size', 'Warranty', 'Origin']
const TREE = ['Department', 'Category', 'Sub-category', 'Product type']

const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Page({ host, ghost = false }) {
  return (
    <div className={`es-page${ghost ? ' ghost' : ''}`}>
      <div className="es-pbar"><i /><i /><i /><span>{host}</span></div>
      <div className="es-pbody">
        <div className="es-pimg" />
        <div className="es-plines"><b /><b /><b className="s" /></div>
      </div>
      {!ghost && <span className="es-scan"><span className="es-beam" /></span>}
      {!ghost && (
        <ul className="es-cells">
          {TILES.map((t, i) => <li key={t} style={{ '--i': i }}><em>{t}</em><u /></li>)}
        </ul>
      )}
      {ghost && <span className="es-tag">Before</span>}
    </div>
  )
}

export default function EnrichStory({ stage, url, waited }) {
  const worldRef = useRef(null)
  const scene = sceneOf(stage)
  let host = ''
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { host = 'your page' }

  /* the camera glides to the scene's angle; a small idle drift keeps the world alive between stages */
  useEffect(() => {
    const w = worldRef.current
    if (!w) return undefined
    if (calm()) { gsap.set(w, CAMERA[scene]); return undefined }
    const tw = gsap.to(w, { ...CAMERA[scene], duration: 1.4, ease: 'power3.inOut' })
    return () => tw.kill()
  }, [scene])

  const step = STORY[scene]
  return (
    <div className="es" data-scene={scene}>
      <div className="es-copy">
        <span className="es-kick"><Sparkles size={13} />Step {scene + 1} of {STORY.length}</span>
        <h3 key={scene} className="es-say">{step.say(host)}</h3>
        <p className="es-url" title={url}>{url}</p>
        <ol className="es-rail">
          {STORY.map((s, i) => (
            <li key={s.stage} className={i < scene ? 'done' : i === scene ? 'now' : ''}>
              <i>{i < scene ? <Check size={12} strokeWidth={3.2} /> : i + 1}</i><span>{s.short}</span>
            </li>
          ))}
        </ol>
        <p className="es-note">Usually about two minutes. Every value is checked against your page and the manufacturer’s data before it is shown{waited > 150 ? ', so richer pages take a little longer' : ''}.</p>
      </div>

      <div className="es-view" aria-hidden="true">
        <div className="es-floor" />
        <div className="es-world" ref={worldRef}>
          <div className="es-float">
            <Page host={host} ghost />
            <Page host={host} />
            <div className="es-chips">{CHIPS.map((c, i) => <span key={c} style={{ '--i': i }}><BadgeCheck size={12} />{c}</span>)}</div>
            <div className="es-docs">
              {DOCS.map(([d, Ico], i) => (
                <div key={d} className="es-doc" style={{ '--i': i }}>
                  <Ico size={14} /><b>{d}</b><i /><i /><i className="s" />
                  <span className="es-ok"><Check size={11} strokeWidth={3.4} />Verified</span>
                </div>
              ))}
            </div>
            <ol className="es-tree">{TREE.map((t, i) => <li key={t} style={{ '--i': i }}><span>L{i + 1}</span>{t}</li>)}</ol>
            <span className="es-after-tag">After</span>
          </div>
        </div>
      </div>
    </div>
  )
}
