import badgeIso9001 from '../assets/awards/tuv-iso-9001.png'
import badgeIso27001 from '../assets/awards/tuv-iso-27001.png'
import badgeB2bea from '../assets/awards/b2bea-member-badge.svg'
import './TrustStrip.css'

/* Compact trust strip. Official badge artwork is used exactly as supplied. */
const ITEMS = [
  { text: 'Serving industrial businesses since 2007' },
  { img: badgeIso9001, w: 912, h: 928, alt: 'TÜV Austria ISO 9001:2015 certification', text: 'ISO 9001:2015' },
  { img: badgeIso27001, w: 940, h: 936, alt: 'TÜV Austria ISO/IEC 27001:2022 certification', text: 'ISO/IEC 27001:2022' },
  { img: badgeB2bea, w: 1825, h: 2001, alt: 'B2BEA Member badge', text: 'B2BEA Member' },
  { text: 'United States + India' },
  { text: 'Manufacturers + distributors' },
]

export default function TrustStrip() {
  return (
    <section className="ts" aria-label="Credentials">
      <ul className="ts-wrap">
        {ITEMS.map((i) => (
          <li key={i.text}>
            {i.img && <span className="ts-badge"><img src={i.img} alt={i.alt} width={i.w} height={i.h} loading="lazy" /></span>}
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
