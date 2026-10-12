// All product values in this demonstration are illustrative sample data.
export const sourceCards = [
  {
    id: 'excel', icon: 'sheet', title: 'Supplier Excel', status: 'Incomplete',
    preview: 'excel',
    rows: [
      ['SKU', 'TELGV3P73', 'ok'], ['Current rating', '73', 'warning'],
      ['Pole type', '3P / 3 pole', 'warning'], ['Voltage', 'Missing', 'warning'],
      ['Breaking capacity', 'Missing', 'warning'], ['Mounting type', 'Unknown', 'warning'],
    ],
  },
  {
    id: 'page', icon: 'globe', title: 'Existing product page', status: 'Inconsistent',
    preview: 'page',
    rows: [
      ['Title', 'GV3P73 MOTOR CB 3P', 'ok'], ['Description', 'Short text', 'warning'],
      ['Category', 'Electrical', 'ok'], ['Specifications', 'Unstructured', 'warning'],
      ['SEO metadata', 'Missing', 'warning'],
    ],
  },
  {
    id: 'pdf', icon: 'file', title: 'Technical PDF', status: 'Unstructured',
    preview: 'pdf',
    rows: [
      ['Rated current', '73 A', 'ok'], ['Voltage', '690 V ac', 'ok'],
      ['Breaking capacity', '65 kA', 'ok'], ['Mounting', 'DIN rail', 'ok'],
      ['Terminals', 'Screw clamp', 'ok'], ['Series', 'TeSys Deca', 'ok'],
    ],
  },
]

export const processingStages = [
  ['database', 'Extract'], ['sliders', 'Normalize'], ['check-circle', 'Validate'],
  ['grid', 'Classify'], ['sparkles', 'Enrich'],
]

export const enrichedAttributes = [
  ['Current rating', '73 A'], ['Voltage', '690 V ac'], ['Poles', '3'],
  ['Breaking capacity', '65 kA'], ['Mounting', 'DIN Rail'],
  ['Terminals', 'Screw clamp'], ['Series', 'TeSys Deca'],
]

export const commerceOutputs = [
  ['doc', 'Optimized title'], ['text', 'Enriched description'],
  ['list', 'Key attributes'], ['network', 'Taxonomy mapping'],
  ['search', 'SEO metadata'], ['sparkles', 'AI-ready content'],
]
