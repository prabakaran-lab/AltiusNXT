/* One real catalog product used across the home page demos: Schneider Electric TeSys Deca motor circuit breaker.
   Facts and images come from the product page supplied by AltiusNxt. */
import front from '../assets/home/tesys/front.webp'
import side from '../assets/home/tesys/side.webp'
import back from '../assets/home/tesys/back.webp'
import drawing from '../assets/home/tesys/drawing.webp'
import features from '../assets/home/tesys/info-features.webp'
import benefits from '../assets/home/tesys/info-benefits.webp'
import accessories from '../assets/home/tesys/info-accessories.webp'

export const TESYS = {
  sku: 'TELGV3P73',
  brand: 'Schneider Electric',
  series: 'TeSys Deca',
  title: 'Schneider Electric Motor Circuit Breaker, 3P, 690 V ac, 65 kA, Screw Clamp Terminal, DIN Rail Mount',
  short: 'Motor Circuit Breaker, 3P, 690 V ac, 65 kA',
  description: 'TeSys GV motor circuit breaker, 3 poles (3P), 73A/690V, for 3-phase motor applications 37kW@400V. It provides a thermal-magnetic protection with a thermal setting range 62-73A, magnetic tripping at 15xIn, and breaking capacity Icu 50kA@400V.',
  taxonomy: ['Fuses & Circuit Breakers', 'Circuit Breakers', 'Motor Protection Circuit Breakers'],
  images: { front, side, back, drawing, features, benefits, accessories },
  /* images the enrichment step adds beyond the supplier's single photo */
  enrichedImages: [side, drawing, back, features, benefits, accessories],
}
