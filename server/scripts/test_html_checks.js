import { fetchPageHtml, checkProductStructuredDataFields, checkTitleTagDuplication, checkBreadcrumbDuplication } from '../src/services/scrapeDo.js'

const url = 'https://www.epco-sales.com/power-transmission-supplies/bearings/ball-bearings/ball-bearings/b1603-2rs'
const { html } = await fetchPageHtml(url)

console.log('--- Title check ---')
console.log(checkTitleTagDuplication(html))

console.log('\n--- Breadcrumb check ---')
console.log(checkBreadcrumbDuplication(html))

console.log('\n--- Structured data fields ---')
console.log(checkProductStructuredDataFields(html, { manufacturerBrand: 'PEER', companyName: 'EPCO Sales' }))
