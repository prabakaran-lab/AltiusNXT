/**
 * Builds a real, schema.org-valid Product JSON-LD block from the enriched "after" mockup —
 * no LLM involved, so it can't hallucinate a field that isn't actually in the data.
 */
export function buildProductJsonLd({ url, after, brandName }) {
  const priceMatch = String(after?.price || '').match(/[\d.]+/)

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: after?.title || undefined,
    description: after?.description || undefined,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    sku: after?.sku || undefined,
    additionalProperty: (after?.sampleSpecs || []).map((spec) => ({
      '@type': 'PropertyValue',
      name: 'Specification',
      value: spec,
    })),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: priceMatch ? priceMatch[0] : undefined,
      availability: /in stock/i.test(after?.stock || '') ? 'https://schema.org/InStock' : undefined,
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  // Strip undefined values so the printed JSON only shows fields we actually have.
  return JSON.parse(JSON.stringify(jsonLd))
}
