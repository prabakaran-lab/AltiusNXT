/* Category Attribute Guide: the complete attribute schema of one real catalog product per category.
   `attrs` are the full specification table of that product's page ([label, value]), as published.
   `miss` (attributes most catalogs leave out) and `spell` (one attribute suppliers write several ways) are illustrative. */
const C = (id, name, ref, attrs, miss, spell) => ({
  id, name, v: name, ref,
  attrs: attrs.map(([l, v]) => [l.replace(/\s*\(Yes\/No\)/, ''), String(v).replace(/;/g, ' · ')]),
  miss, spell,
})

export const VERTICALS = []

export const CATEGORIES = [
  C('electronic', 'Electronic Supplies & Components', 'Schneider Electric TeSys Deca motor circuit breaker · TELGV3P73', [
    ['Brand', 'Schneider Electric'], ['Product Type', 'Motor Circuit Breaker'], ['Current Rating', '73 A'], ['Number of Poles', '3'], ['Trip Type', 'Type F'],
    ['AC Voltage Rating', '690 V'], ['Voltage Type', 'AC'], ['Interrupting Rating', '65 kA @ 230/240 V ac'], ['Number of Phase', '3'], ['Terminal Connection', 'Screw Clamp'],
    ['Trip Mechanism', 'Thermal Magnetic'], ['Mounting Type', 'DIN Rail'], ['Length', '136 mm'], ['Width', '55 mm'], ['Height', '132 mm'],
    ['Dimension', '136 x 55 x 132 mm'], ['Actuator Type', 'Rotary Knob'], ['Maximum Operating Temperature', '60 °C'], ['Minimum Operating Temperature', '-20 °C'], ['IP Rating', 'IP20'],
    ['Application', 'Motor Protection'], ['Special Features', 'Sturdy and Longlasting Connection;Front Face Padlocking;Three Position Handle'],
    ['Standards Met', 'CSA C22.2 No 60947-4-1;EN/IEC 60947-2;EN/IEC 60947-4-1;IEC/EN 60335-1;IEC/EN 60335-2-40;UL 60947-4-1'],
    ['Electrical Life', '20000 cycles'], ['Mechanical Life', '50000 cycles'], ['Insulation Voltage', '690 V ac'], ['Impulse Voltage', '6 kV'],
    ['Frequency Rating', '50/60 Hz'], ['Power Loss', '8 W'], ['Utilisation Category', 'A'], ['Weight', '0.96 kg'], ['Package Quantity', 'Each'], ['Series', 'TeSys Deca'],
  ], ['Interrupting Rating', 'Electrical Life', 'Mechanical Life', 'Utilisation Category', 'Impulse Voltage'],
  { attr: 'AC Voltage Rating', vars: ['690V', '690 VAC', '690 V ac', '0.69 kV'], to: '690 V' }),

  C('industrial', 'Industrial Supply', 'SKF R series ball bearing · R10ZZ', [
    ['ABEC Rating', '1'], ['Ball Material', 'Alloy Steel'], ['Bearing Industry Number', 'R10'], ['Bore Diameter', '0.625 in'], ['Bore Diameter Tolerance', '+/- 0.005 mm'],
    ['Cage Material', 'Steel'], ['Closure', 'Double Sealed'], ['Dynamic Radial Load Capacity', '1360 lbf'], ['Includes Retaining Ring', 'No'], ['Lubricant Material', 'Grease'],
    ['Maximum Axial Load', '180 lbf'], ['Maximum Speed', '13000 RPM'], ['Maximum Temperature', '230 °F'], ['Number of Rows', '1'], ['Outer Ring Width', '0.343 in'],
    ['Outside Diameter', '1.375 in'], ['Outside Diameter Tolerance', '-0.008/-0.020 mm'], ['Retaining Ring Groove', 'Yes'], ['Ring Material', 'Alloy Steel'], ['Ring Material Grade', '100Cr6'],
    ['Seal Material', 'Rubber'], ['Static Radial Load Capacity', '731 lbf'], ['System of Measurement', 'Inch'], ['UNSPSC', '31171501'],
  ], ['Dynamic Radial Load Capacity', 'Static Radial Load Capacity', 'Maximum Axial Load', 'Bore Diameter Tolerance'],
  { attr: 'Bore Diameter', vars: ['0.625 in', '5/8"', '15.875 mm', '.625'], to: '0.625 in' }),

  C('tools', 'Hand, Power & Machine Tools', 'Dewalt XR hammer drill driver · DCD796D2-GB', [
    ['Brand', 'Dewalt'], ['Series', 'XR'], ['Product Type', 'Hammer Drill Driver'], ['Chuck Size', '1.5 to 13 mm'], ['Chuck Material', 'Metal'], ['Chuck Style', 'Keyless'],
    ['Clutch Style', 'Ratchet'], ['Power Source', 'Cordless'], ['Voltage', '18 V'], ['Maximum Speed', '2000 RPM'], ['Blows per Minute', '0 to 9350 BPM;0 to 34000 BPM'],
    ['Maximum Power', '460 W'], ['Drilling Capacity in Concrete', '12.7 mm'], ['Drilling Capacity in Masonry', '13 mm'], ['Drilling Capacity in Wood', '40 mm'],
    ['Maximum Blows per Minute', '34000 BPM'], ['Minimum Blows per Minute', '0 BPM'], ['Maximum Working Torque', '70 Nm'], ['Modes of Operation', 'Drill;Screwdriving'],
    ['Number of Clutch Settings', '13'], ['Number of Speed Settings', '2'], ['Number of Batteries Included', '2'], ['Battery Capacity', '2 Ah'], ['Battery Model Number', 'DCB203'],
    ['Battery Series', 'XR'], ['Battery Chemistry', 'Li-Ion'], ['Brushless Motor (Yes/No)', 'Yes'], ['Charger Included (Yes/No)', 'Yes'], ['Cordless Drill Class', 'Compact'],
    ['Handle Type', 'T-Handle'], ['Reversible (Yes/No)', 'Yes'], ['Vibration Control (Yes/No)', 'No'], ['Overall Length', '190 mm'], ['Overall Height', '246 mm'], ['Overall Width', '114.3 mm'],
    ['Tool Weight', '1.2 kg'], ['Includes', 'Belt Hook;Multi-Voltage XR Charger;Magnetic Bit Holder;TSTAK Heavy Duty Kitbox;(2) 2Ah XR Battery Pack With State of Charge Indicator;Hammer Drill Driver'],
    ['Application', 'Drilling;Fastening'], ['Standards', 'UL Listed'], ['Warranty', '1 Year (Limited Warranty);3 Years (Limited Warranty Upon Registration)'], ['UNSPSC', '27112703'],
  ], ['Maximum Working Torque', 'Blows per Minute', 'Number of Clutch Settings', 'Vibration Control'],
  { attr: 'Voltage', vars: ['18V', '18 Volt', '18 VDC', '20V MAX'], to: '18 V' }),

  C('medical', 'Medical Supplies', 'Baxter Interlink IV giving set · FNC2110N', [
    ['Brand', 'Baxter'], ['Product Type', 'Interlink IV Giving Set'], ['Drip Rate', '20 Drops/mL'], ['Drip Chamber Configuration', 'Non Vented'], ['Flow Control', 'Roller Clamp'],
    ['Prime Volume', '16 mL'], ['Connector Type', 'Luer Lock Adapter'], ['DEHP Content', '<0.1 % w/w'], ['For Use With', 'Colleague Volumetric Infusion Pumps / Surflo Winged Infusion Sets'],
    ['Latex-Free (Yes/No)', 'Yes'], ['Single Use (Yes/No)', 'Yes'], ['Sterile/Non-Sterile', 'Sterile'], ['Sterilisation Method', 'Ethylene Oxide (EO)'], ['Primary Use', 'Intravenous'],
    ['Includes', 'Solution Set;Non-Vented Drip Chamber;Roller Clamp;Interlink Injection Site 15 cm from Luer Lock Adapter (Capped) with a Retractable Collar'],
    ['Overall Length', '264 cm'], ['Application', 'Hospital Wards;Intensive Care Environments;Surgical Recovery Units;Emergency Medical Stations'], ['Standards Met', 'CE'],
    ['EAN/UPC Number', '085412618401'], ['Country of Origin', 'Tunisia'], ['UNSPSC', '42221615'],
  ], ['DEHP Content', 'Prime Volume', 'Sterilisation Method', 'For Use With'],
  { attr: 'Drip Rate', vars: ['20 gtt/mL', '20 drops/ml', '20 Drops per mL', '20 drop'], to: '20 Drops/mL' }),

  C('janitorial', 'Janitorial Supplies', 'Hydro Tek Hot2Go SH hot water pressure washer · SH27003VH', [
    ['Brand', 'Hydro Tek'], ['Series', 'Hot2Go SH'], ['Product Type', 'Hot Water Pressure Washer'], ['Color', 'Red'], ['Pump Brand', 'AR'], ['Pressure Rating', '2700 PSI'],
    ['Water Flow Rate', '2.5 gpm'], ['Power Source', 'Gas'], ['Heating Type', 'Diesel Heated'], ['Engine Type', 'Vanguard Engine'], ['Engine Displacement', '205 cc'],
    ['Starting System', 'Electric Start'], ['Charging Circuit', '20 A'], ['Maximum Water Temperature', '250°F'], ['Fuel Tank Capacity', '8 gal'], ['Pump Type', 'Triplex Pump'],
    ['Wet Steam Capability (Yes/No)', 'Yes'], ['Thermostat Adjustable (Yes/No)', 'Yes'], ['Burner Type', '12 VDC Beckett Diesel Burner'], ['Heating Coil Material', 'Stainless Steel Wrapped SCH 80 Steel Coil'],
    ['Battery Required (Yes/No)', 'Yes'], ['Required Battery', 'G24 550CCA Battery'], ['Battery Included (Yes/No)', 'No'], ['Frame Material', 'Powder Coated Steel'], ['Frame Type', 'Cart Frame'],
    ['Portable (Yes/No)', 'Yes'], ['Number of Wheels', '4'], ['Hose Length', '50 ft'], ['Hose Diameter', '3/8 in'], ['Hose Material', 'Rubber'],
    ['Includes', '50 ft Hose;Gun;Wand and Spray Tips;Wheel Kit'], ['Country of Origin', 'United States'], ['UNSPSC', '47121805'],
  ], ['Maximum Water Temperature', 'Charging Circuit', 'Required Battery', 'Wet Steam Capability'],
  { attr: 'Pressure Rating', vars: ['2700 psi', '2,700 PSI', '186 bar', '2700#'], to: '2700 PSI' }),

  C('ppe', 'Safety & PPE', 'ATG MaxiFlex Cut-resistant work glove · 34-8743', [
    ['Brand', 'ATG'], ['Product Type', 'Cut Resistant Glove'], ['Series', 'MaxiFlex® Cut™'], ['Glove Design', 'Palm Coated Knit Wrist'], ['Cuff Style', 'Knit Wrist'], ['Cuff Type', 'Continuous Knit'],
    ['Reinforcement', 'Thumb–Forefinger Reinforcement'], ['Grip Type', 'Micro-Cup Grip'], ['Palm Coating Material', 'Nitrile'], ['Coating Coverage', 'Palm'],
    ['Liner Material', 'Polyester;Spandex;UHMWPE-Glass-Nylon'], ['Liner Colour', 'Green'], ['Glove Coating Colour', 'Black'], ['Overlock Colour', 'Yellow'], ['Size - Alpha', 'XL'], ['Size - Numeric', '10'],
    ['Glove Length', '245 mm'], ['Palm Thickness', '0.80 mm'], ['Wrist Length', '70 mm'], ['Wrist Width', '72 mm'], ['Palm Width', '98 mm'], ['Glove Hand Style', 'Left and Right'],
    ['Cut Resistance Level', 'A2'], ['EN 388 Rating', '4331B'], ['ANSI/ISEA Abrasion Level', '3'], ['Resistance Properties', 'Abrasion Resistant;Cut Resistant;Tear Resistant;Puncture Resistant'],
    ['Breathability', '360° Breathable'], ['Touchscreen Compatible', 'Yes'], ['PPE Category', 'Category II - Medium Risk'], ['FDA Compliant', 'Yes'], ['REACH Compliant', 'Yes'],
    ['OEKO-TEX Certified', 'Yes'], ['Silicone Free', 'Yes'], ['DMF Free', 'Yes'], ['REACH SVHC Free', 'Yes'], ['Washable', 'Yes'], ['Wash Temperature', '40°C'], ['Glove Weight', '44 g'],
    ['Application', 'Drywall and Wiring Installation;Precision Handling'], ['Working Environment', 'Dry Environments'], ['Sanitised', 'Yes'], ['Standards Met', 'EN ISO 21420:2020+A1:2024'], ['UNSPSC', '46181504'],
  ], ['EN 388 Rating', 'ANSI/ISEA Abrasion Level', 'PPE Category', 'DMF Free'],
  { attr: 'Touchscreen Compatible', vars: ['Touch screen', 'touchscreen OK', 'Yes, touch', 'Touch-friendly'], to: 'Yes' }),

  C('office', 'Office Supplies', 'Erich Krause Classic desk calculator · DC310N (50310)', [
    ['Brand', 'Erich Krause'], ['Series', 'Classic'], ['Product Type', 'Desk Electronic Calculator'], ['Material', 'Plastic'], ['Colour', 'Black'], ['Display Digits', '10'], ['Display Type', 'LCD'],
    ['Display Cover Type', 'Acrylic Cover'], ['Power Source', 'Solar and Battery'], ['Battery Type', 'Alkaline Button Cell'], ['Memory Type', 'Memory Key'], ['Memory Function', 'M+'],
    ['Automatic Rounding-Off Selector Key (Yes/No)', 'No'], ['Decimal Point Selector Key (Yes/No)', 'No'], ['Square Root Function (Yes/No)', 'Yes'], ['Percent Function (Yes/No)', 'Yes'],
    ['Tax Function (Yes/No)', 'No'], ['Mark Up Function (Yes/No)', 'No'], ['Back Space Key (Yes/No)', 'No'], ['Double Memory Key (Yes/No)', 'No'], ['Sign Change Key (Yes/No)', 'Yes'],
    ['Grand Total Key (Yes/No)', 'No'], ['Auto Power Off (Yes/No)', 'Yes'], ['Tilt Stand (Yes/No)', 'No'], ['Basic Operations', '+/−/×/÷/±'],
    ['Applied Calculations', 'Basic Mathematical Operations;Percentage Calculation;Square Root;Memory Function'], ['Auto Power Off Time', '7 min'],
    ['Overall Depth', '25 mm'], ['Overall Width', '100 mm'], ['Overall Height', '131 mm'], ['Weight', '0.092 kg'], ['UNSPSC', '44101809'],
  ], ['Display Cover Type', 'Auto Power Off Time', 'Memory Function', 'Applied Calculations'],
  { attr: 'Power Source', vars: ['Solar+Battery', 'solar / battery', 'Dual power', 'Solar & Batt.'], to: 'Solar and Battery' }),

  C('welding', 'Gas & Welding', 'WIA Weldarc 200 DC stick/TIG welder · MC113-0', [
    ['Brand', 'WIA'], ['Product Type', 'Stick/TIG Welder'], ['Range/Series', 'Weldarc 200 DC'], ['Power Source', 'Electric'], ['Voltage Rating', '240 VAC'], ['Frequency', '50/60 Hz'],
    ['Number of Phases', 'Single Phase'], ['Generator Capacity', '6 kVA (Peak)'], ['Current Rating', '14 A (Rated);25 A (Maximum)'], ['Plug Current Rating', '15 A'], ['Welding Process', 'Stick;TIG'],
    ['Electrode Size Range', '2 mm;2.5 mm;3.2 mm;4 mm'], ['Output Current Range', '20 to 180 A (Stick);10 to 200 A (TIG)'], ['Output Voltage Range', '20.8 to 27.2 V (Stick);10.4 to 18 V (TIG)'],
    ['Rated Output', '180 A @ 27.2 V (30%), 127 A @ 25 V (60%), 99 A @ 24 V (100%) (Stick);200 A @ 18 V (30%), 141 A @ 15.6 V (60%), 110 A @ 14.4 V (100%) (TIG)'],
    ['Cooling Method', 'Fan-on-Demand™'], ['Arc Force Function (Yes/No)', 'Yes'], ['Hot Start Function (Yes/No)', 'Yes'], ['Voltage Reduction Device (Yes/No)', 'Yes'],
    ['Power Factor Correction (Yes/No)', 'Yes'], ['Generator Compatible (Yes/No)', 'Yes'], ['IP Rating', 'IP23S'], ['Special Features', 'Portable;Pulse TIG;Built-In Thermal Protection;HF Start'],
    ['Material Thickness', 'Up to 8 mm (Steel Plate)'], ['Weldable Materials', 'Copper;Steel;Stainless Steel'],
    ['Suitable Applications', 'Repair and Maintenance;Stainless Steel Fabrication;Motor Sports Fabrication;Food and Wine'],
    ['Includes', 'Work Clamp (3m);Industrial Twist Lock Electrode Holder (4m);TIG Torch (8m);TIG Starter Kit;Argon Gas Regulator;Gas Hose'],
    ['Open Circuit Voltage', '14 V (VRD Enabled);78 V (VRD Disabled)'], ['Current Up Slope Time', '0 to 10 s'], ['Current Down Slope Time', '0 to 10 s'], ['Pulse Frequency', '0.2 to 500 Hz'],
    ['Pulse Ratio Width Adjustment', '5 to 95%'], ['Arc Start MMA', '0 to 100%'], ['Efficiency', '≥ 85%'], ['Power Factor', '0.99'], ['Insulation Degree', 'H'],
    ['Overall Length', '500 mm'], ['Overall Width', '215 mm'], ['Overall Height', '345 mm'], ['Standards', 'AS60974.1;AS1674.2 (VRD)'], ['Warranty', '3 yrs'], ['Weight', '12 kg'], ['UNSPSC', '23271424'],
  ], ['Open Circuit Voltage', 'Rated Output', 'Pulse Frequency', 'Weldable Materials', 'Insulation Degree'],
  { attr: 'Voltage Rating', vars: ['240V', '240 VAC', '230-240 V', '240 volts'], to: '240 VAC' }),

  C('fire', 'Fire Protection & Safety Supplies', 'Abbott Rubber single-jacket fire hose · 2120-2500', [
    ['Brand', 'Abbott Rubber'], ['Product Type', 'Fire Hose'], ['Color', 'White'], ['Material', 'Polyester'], ['Jacket Material', 'Polyester'], ['Tube Material', 'Ozone Resistant Tube'],
    ['Coupling Material', 'Aluminum'], ['Hose Type', 'Assembly'], ['Inside Diameter', '2-1/2 in'], ['Hose Length', '50 ft'], ['Test Pressure', '300 psi'], ['Jacket Type', 'Single Jacket'],
    ['Fitting Type', 'Male, Female'], ['Connection 1 End', 'MNST'], ['Connection 2 End', 'FNST'], ['Connection End Type', 'MNST x FNST'], ['Coupling Style', 'Rocker Lug'], ['Pressure Class', '300#'],
    ['FM Approved (Yes/No)', 'Yes'], ['Application', 'Fire Protection;Industrial'], ['Weight', '27 lb'], ['UNSPSC', '46191601'],
  ], ['FM Approved', 'Test Pressure', 'Coupling Style', 'Pressure Class'],
  { attr: 'Inside Diameter', vars: ['2.5"', '2-1/2 inch', '2.5 in', '64 mm'], to: '2-1/2 in' }),
]

/* Every industry category we serve, in display order. `id` links the ones that already have a selected example product. */
export const ALL_CATEGORIES = [
  { name: 'Electronic Components', id: 'electronic' },
  { name: 'Electrical Supplies & Lighting' },
  { name: 'Fasteners & Hardware' },
  { name: 'Plumbing & PVF (Pipe, Valve, Fitting)' },
  { name: 'Medical Devices & Supplies', id: 'medical' },
  { name: 'Fluid Power & Mechanical Power Transmission' },
  { name: 'Industrial Supply', id: 'industrial' },
  { name: 'MRO' },
  { name: 'Gas & Welding', id: 'welding' },
  { name: 'Construction & Building Materials' },
  { name: 'Paints & Coatings (Chemicals)' },
  { name: 'Safety & PPE', id: 'ppe' },
  { name: 'Security & Surveillance' },
  { name: 'Food Service & Catering Supplies' },
  { name: 'Home Appliances' },
  { name: 'Industrial Automation' },
  { name: 'Hand, Power & Machine Tools', id: 'tools' },
  { name: 'HVACR' },
  { name: 'Janitorial & Sanitation Supplies', id: 'janitorial' },
  { name: 'Dental Supplies' },
  { name: 'Veterinary Supplies' },
  { name: 'Office Supplies', id: 'office' },
  { name: 'Fire Protection & Safety Supplies', id: 'fire' },
]
