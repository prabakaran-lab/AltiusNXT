import { benchmarkCompetitors } from '../src/services/competitorBenchmark.js'

const result = await benchmarkCompetitors({
  manufacturerBrand: 'Cross',
  manufacturerCode: 'Bp F Black (PK10)',
  productName: 'Pen Refill Stat (Cross) Bp F Black (PK10)',
  category: 'ballpoint pen refill',
  excludeDomain: 'betteroffice.store',
  excludeCompany: 'Better Office Supplies',
})
console.log(JSON.stringify(result, null, 2))
