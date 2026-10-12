/* Eight more real catalog products (public product pages supplied by AltiusNxt) used by the "Same Product. Different Data." demo.
   Images are the main product photo of each page. Values are transcribed from those pages. */
import hose from '../assets/home/catalog/hose.webp'
import welder from '../assets/home/catalog/welder.webp'
import glove from '../assets/home/catalog/glove.webp'
import calculator from '../assets/home/catalog/calculator.webp'
import washer from '../assets/home/catalog/washer.webp'
import iv from '../assets/home/catalog/iv.webp'
import drill from '../assets/home/catalog/drill.webp'
import bearing from '../assets/home/catalog/bearing.webp'

export const SAMPLES = {
  fire: {
    label: 'Fire Protection', img: hose,
    query: 'Find a 2-1/2 in, 50 ft single-jacket fire hose, 300 psi, with male and female NST fittings.',
    answer: '2120-2500: Abbott Rubber 2-1/2 in x 50 ft polyester single-jacket fire hose, 300 psi, MNST x FNST rocker-lug couplings.',
    raw: { title: 'FIRE HOSE 2.5 50FT', missing: ['Inside Diameter', 'Hose Length', 'Jacket Type', 'Test Pressure', 'Coupling Material', 'Connection Type', 'FM Approved', 'Technical Description'] },
    rich: {
      title: 'Abbott Rubber Fire Hose, 2-1/2 in, 50 ft, 300 psi, Polyester', meta: 'SKU: 2120-2500 | Brand: Abbott Rubber | MPN: 2120-2500',
      rows: [['Inside Diameter', '2-1/2 in'], ['Hose Length', '50 ft'], ['Jacket Type', 'Single Jacket'], ['Jacket Material', 'Polyester'], ['Test Pressure', '300 psi'], ['Coupling Material', 'Aluminum'], ['Connection End Type', 'MNST x FNST'], ['Coupling Style', 'Rocker Lug'], ['FM Approved', 'Yes'], ['Weight', '27 lb']],
      taxonomy: ['Safety', 'Fire Protection', 'Single-Jacket Fire Hoses'], seo: 'Fire Hose 2-1/2 in x 50 ft, 300 psi | Polyester Single Jacket',
    },
    description: 'Fire hose designed for flushing and flow-testing applications, with a 2-1/2 in inside diameter, 50 ft length and polyester single-jacket construction. Male and female NST aluminum rocker-lug fittings and an ozone-resistant tube.',
    slug: 'store.example.com › safety › fire-hoses › 2120-2500', meta: '2-1/2 in x 50 ft polyester single-jacket fire hose, 300 psi, MNST x FNST aluminum rocker-lug couplings, FM approved.',
    keywords: ['fire hose', '2-1/2 in', '50 ft', '300 psi', 'single jacket', 'NST', 'FM approved'],
  },
  welding: {
    label: 'Welding', img: welder,
    query: 'Find a single-phase 240 V DC stick and TIG welder, 200 A, with pulse and VRD.',
    answer: 'MC113-0: WIA Weldarc 200 DC, single phase 240 V, stick up to 180 A and TIG up to 200 A, VRD, IP23S.',
    raw: { title: 'WIA Weldarc 200DC', missing: ['Welding Process', 'Voltage Rating', 'Phases', 'Output Current', 'Open Circuit Voltage', 'IP Rating', 'Warranty', 'Technical Description'] },
    rich: {
      title: 'WIA Weldarc MC113-0 200DC Stick/TIG Welder', meta: 'SKU: MC113-0 | Brand: WIA | MPN: MC113-0',
      rows: [['Welding Process', 'Stick; TIG'], ['Voltage Rating', '240 VAC'], ['Phases', 'Single Phase'], ['Stick Output', '20 to 180 A'], ['TIG Output', '10 to 200 A'], ['Open Circuit Voltage', '14 V (VRD on)'], ['Efficiency', '≥ 85%'], ['IP Rating', 'IP23S'], ['Weight', '12 kg'], ['Warranty', '3 yrs']],
      taxonomy: ['Welding', 'Welding Machines', 'DC Stick/TIG Welders'], seo: 'WIA Weldarc 200 DC Stick/TIG Welder | 240 V, 200 A, Pulse TIG',
    },
    description: 'The Weldarc 200 DC Stick/TIG welder for intermediate to professional welders. HF start and pulse TIG give easy non-contact arc starting and greater heat control of the weld pool. Single phase 240 V, stick to 180 A and TIG to 200 A.',
    slug: 'store.example.com › welding › stick-tig-welders › mc113-0', meta: 'WIA Weldarc 200 DC stick/TIG welder, 240 V single phase, 20-180 A stick, 10-200 A TIG, VRD, 3 year warranty.',
    keywords: ['stick welder', 'TIG welder', 'DC inverter', '240 V', '200 A', 'pulse TIG', 'VRD'],
  },
  gloves: {
    label: 'Hand Protection', img: glove,
    query: 'Find a green nitrile palm-coated cut-resistant work glove, level A2, EN 388 4331B, touchscreen compatible.',
    answer: '34-8743: ATG MaxiFlex Cut, green knit liner, black nitrile micro-foam palm, cut level A2, EN 388 4331B, touchscreen compatible.',
    raw: { title: 'MaxiFlex Cut Glove XL', missing: ['Palm Coating', 'Liner Material', 'Cut Resistance Level', 'EN 388 Rating', 'Grip Type', 'Touchscreen', 'Washable', 'Technical Description'] },
    rich: {
      title: 'ATG MaxiFlex Cut-Resistant Work Glove, Green, Palm Coated, Nitrile', meta: 'SKU: 34-8743 | Brand: ATG | MPN: 34-8743',
      rows: [['Palm Coating', 'Nitrile'], ['Liner Material', 'Polyester; Spandex; UHMWPE'], ['Cut Resistance', 'A2'], ['EN 388 Rating', '4331B'], ['Grip Type', 'Micro-Cup'], ['Cuff Style', 'Knit Wrist'], ['Touchscreen', 'Compatible'], ['Washable', 'Yes, 40 °C'], ['Glove Weight', '44 g'], ['Standard', 'EN ISO 21420']],
      taxonomy: ['Safety', 'Hand Protection', 'Cut Resistant Gloves'], seo: 'ATG MaxiFlex Cut Work Glove, Nitrile Palm | A2, EN 388 4331B',
    },
    description: 'A thin, flexible and dexterous cut-resistant glove. A green engineered-yarn knit shell with a black micro-foam nitrile palm coating and thumb-crotch reinforcement for extended glove life. Touchscreen compatible and machine washable.',
    slug: 'store.example.com › safety › hand-protection › 34-8743', meta: 'ATG MaxiFlex Cut glove, nitrile micro-foam palm, cut level A2, EN 388 4331B, touchscreen compatible, washable.',
    keywords: ['cut resistant glove', 'nitrile palm', 'A2', 'EN 388', 'touchscreen', 'MaxiFlex'],
  },
  office: {
    label: 'Office Supplies', img: calculator,
    query: 'Find a 10-digit desk calculator with solar and battery power, memory key and square root.',
    answer: 'DC310N: Erich Krause Classic 10-digit LCD desk calculator, solar and battery, memory key, square root and percent.',
    raw: { title: 'Desk Calculator 10D', missing: ['Display Digits', 'Display Type', 'Power Source', 'Battery Type', 'Memory Function', 'Square Root Key', 'Auto Power Off', 'Technical Description'] },
    rich: {
      title: 'Erich Krause Classic Desk Electronic Calculator, 10 Digit, LCD, Solar and Battery', meta: 'SKU: DC310N (50310) | Brand: Erich Krause | MPN: DC310N',
      rows: [['Display Digits', '10'], ['Display Type', 'LCD'], ['Power Source', 'Solar and Battery'], ['Battery Type', 'Alkaline Button Cell'], ['Memory Function', 'M+ Memory Key'], ['Square Root Key', 'Yes'], ['Percent Key', 'Yes'], ['Auto Power Off', 'Yes, 7 min'], ['Dimensions', '131 × 100 × 25 mm'], ['Weight', '0.092 kg']],
      taxonomy: ['Office Supplies', 'Calculators', 'Desk Electronic Calculators'], seo: 'Erich Krause Classic 10-Digit Desk Calculator | Solar and Battery',
    },
    description: 'Electronic calculator in a plastic case with a 10-digit LCD display and acrylic cover. A memory key and an optimal set of functions for basic operations, percentages, square roots and memorising intermediate results. Solar and battery powered.',
    slug: 'store.example.com › office › calculators › dc310n', meta: 'Erich Krause Classic desk calculator, 10 digit LCD, solar and battery, memory key, square root and percent keys.',
    keywords: ['desk calculator', '10 digit', 'solar calculator', 'LCD', 'memory key', 'Erich Krause'],
  },
  janitorial: {
    label: 'Janitorial', img: washer,
    query: 'Find a gas-powered hot water pressure washer, 2700 PSI, 2.5 gpm, diesel heated, with electric start.',
    answer: 'SH27003VH: Hydro Tek Hot2Go SH, 2700 PSI, 2.5 gpm, 205 cc Vanguard engine, electric start, diesel heated, 50 ft hose.',
    raw: { title: 'HotWasher Hot2Go', missing: ['Pressure Rating', 'Water Flow Rate', 'Power Source', 'Heating Type', 'Engine Displacement', 'Starting System', 'Hose Length', 'Technical Description'] },
    rich: {
      title: 'Hydro Tek Hot2Go SH Hot Water Pressure Washer, 2700 PSI, 2.5 gpm, 205 cc', meta: 'SKU: SH27003VH | Brand: Hydro Tek | MPN: SH27003VH',
      rows: [['Pressure Rating', '2700 PSI'], ['Water Flow Rate', '2.5 gpm'], ['Power Source', 'Gas'], ['Heating Type', 'Diesel Heated'], ['Engine Displacement', '205 cc'], ['Starting System', 'Electric Start'], ['Pump Type', 'Triplex Pump'], ['Max Water Temp.', '250 °F'], ['Hose Length', '50 ft'], ['Fuel Tank', '8 gal']],
      taxonomy: ['Janitorial & Sanitation', 'Pressure Washers', 'Hot Water Pressure Washers'], seo: 'Hydro Tek Hot2Go SH Hot Water Pressure Washer | 2700 PSI, 2.5 gpm',
    },
    description: 'A highly portable hot water pressure washer with a small footprint, ideal where electric power is not available. A 205 cc Vanguard engine with electric start drives a triplex pump and a thermostatically controlled 12 VDC Beckett diesel burner.',
    slug: 'store.example.com › janitorial › pressure-washers › sh27003vh', meta: 'Hydro Tek Hot2Go SH hot water pressure washer, 2700 PSI, 2.5 gpm, 205 cc Vanguard engine, diesel heated, electric start.',
    keywords: ['hot water pressure washer', '2700 PSI', '2.5 gpm', 'diesel heated', 'portable', 'Hydro Tek'],
  },
  medical: {
    label: 'Medical', img: iv,
    query: 'Find a non-vented IV giving set, 20 drops/mL, latex-free, with a Luer lock connector and roller clamp.',
    answer: 'FNC2110N: Baxter Interlink IV giving set, non-vented, 20 drops/mL, latex-free, roller clamp, Luer lock adapter, 264 cm.',
    raw: { title: 'IV Set Interlink 20', missing: ['Drip Rate', 'Drip Chamber', 'Flow Control', 'Connector Type', 'Latex-Free', 'Sterilisation Method', 'Length', 'Technical Description'] },
    rich: {
      title: 'Baxter Interlink IV Giving Set, Non Vented, 20 Drops/mL', meta: 'SKU: FNC2110N | Brand: Baxter | MPN: FNC2110N',
      rows: [['Drip Rate', '20 Drops/mL'], ['Drip Chamber', 'Non Vented'], ['Flow Control', 'Roller Clamp'], ['Connector Type', 'Luer Lock Adapter'], ['Prime Volume', '16 mL'], ['Latex-Free', 'Yes'], ['Sterilisation', 'Ethylene Oxide (EO)'], ['Single Use', 'Yes'], ['Overall Length', '264 cm'], ['Standard', 'CE']],
      taxonomy: ['Medical Consumables', 'IV Administration Sets', 'IV Giving Sets'], seo: 'Baxter Interlink IV Giving Set, Non Vented | 20 Drops/mL, Latex-Free',
    },
    description: 'A latex-free, single-use medical infusion line with a non-vented drip chamber calibrated to a standard 20 drops per mL flow matrix. An integrated roller clamp for precise flow control and an Interlink Luer lock adapter. Sterilised with ethylene oxide.',
    slug: 'store.example.com › medical › iv-giving-sets › fnc2110n', meta: 'Baxter Interlink IV giving set FNC2110N, non-vented, 20 drops/mL, latex-free, roller clamp, Luer lock, 264 cm, sterile.',
    keywords: ['IV giving set', 'non vented', '20 drops/mL', 'latex free', 'roller clamp', 'Luer lock', 'Baxter'],
  },
  tools: {
    label: 'Power Tools', img: drill,
    query: 'Find an 18 V cordless brushless hammer drill driver, 13 mm keyless metal chuck, with two 2 Ah batteries.',
    answer: 'DCD796D2-GB: Dewalt XR 18 V brushless hammer drill driver, 13 mm metal keyless chuck, 70 Nm, two 2 Ah Li-Ion batteries.',
    raw: { title: 'DeWalt XR Drill 18V', missing: ['Chuck Size', 'Chuck Style', 'Max Working Torque', 'Blows per Minute', 'Battery Capacity', 'Brushless Motor', 'Weight', 'Technical Description'] },
    rich: {
      title: 'Dewalt XR Hammer Drill Driver, 1.5 to 13 mm, Metal, Keyless, 18 V', meta: 'SKU: DCD796D2-GB | Brand: Dewalt | MPN: DCD796D2-GB',
      rows: [['Voltage', '18 V'], ['Chuck Size', '1.5 to 13 mm'], ['Chuck Style', 'Keyless, Metal'], ['Max Working Torque', '70 Nm'], ['Max Speed', '2000 RPM'], ['Blows per Minute', '0 to 34000 BPM'], ['Battery', '2 × 2 Ah Li-Ion'], ['Brushless Motor', 'Yes'], ['Overall Length', '190 mm'], ['Tool Weight', '1.2 kg']],
      taxonomy: ['Tools & Equipment', 'Power Drills', 'Cordless Hammer Drills'], seo: 'Dewalt XR 18 V Hammer Drill Driver | 13 mm Keyless Chuck, 70 Nm',
    },
    description: "The DCD796 is DeWalt's compact answer to drilling and driving in confined spaces without sacrificing performance. At 1.2 kg and just 190 mm in length, it fits partition walls, ceiling voids and cabinet interiors. Brushless motor, two 2 Ah batteries and charger.",
    slug: 'store.example.com › tools › cordless-hammer-drills › dcd796d2-gb', meta: 'Dewalt XR 18 V brushless hammer drill driver, 13 mm keyless metal chuck, 70 Nm, 2 × 2 Ah batteries, 1.2 kg.',
    keywords: ['hammer drill', 'cordless drill', '18 V', 'brushless', '13 mm chuck', 'Dewalt XR', '70 Nm'],
  },
  bearings: {
    label: 'Power Transmission', img: bearing,
    query: 'Find a double-sealed stainless steel ball bearing, 0.625 in bore, 1.375 in outside diameter.',
    answer: 'R10ZZ: SKF R series bearing, 0.625 in bore, 1.375 in OD, double sealed, stainless steel, 13,000 RPM max.',
    raw: { title: 'SKF R Bearing', missing: ['Bore Diameter', 'Outside Diameter', 'Closure', 'Ring Material', 'Cage Material', 'Max Speed', 'Load Capacity', 'Technical Description'] },
    rich: {
      title: 'SKF R Bearing 0.625 in Bore 1.375 in OD Stainless Steel', meta: 'SKU: R10ZZ | Brand: SKF Industries | MPN: R10ZZ',
      rows: [['Bore Diameter', '0.625 in'], ['Outside Diameter', '1.375 in'], ['Outer Ring Width', '0.343 in'], ['Closure', 'Double Sealed'], ['Ring Material', 'Alloy Steel'], ['Cage Material', 'Steel'], ['Dynamic Radial Load', '1360 lbf'], ['Max Speed', '13000 RPM'], ['Lubricant', 'Grease'], ['ABEC Rating', '1']],
      taxonomy: ['Power Transmission', 'Bearings', 'Ball Bearings'], seo: 'SKF R10ZZ Ball Bearing, 0.625 in Bore | 1.375 in OD, Double Sealed',
    },
    description: 'R series bearings are single-row radial conrad-type bearings for inch-size shafts. This R10 is double sealed with rubber seals, grease lubricated, with a steel cage and alloy steel balls and rings for up to 13,000 RPM.',
    slug: 'store.example.com › power-transmission › bearings › r10zz', meta: 'SKF R10ZZ radial ball bearing, 0.625 in bore, 1.375 in OD, double sealed, 1360 lbf dynamic load, 13,000 RPM.',
    keywords: ['ball bearing', 'R10ZZ', '0.625 in bore', 'double sealed', 'SKF', 'inch bearing'],
  },
}
