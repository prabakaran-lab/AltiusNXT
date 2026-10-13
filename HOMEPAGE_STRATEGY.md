# AltiusNxt / CatalogWiz — Competitive Analysis & Homepage Strategy

Prepared from a review of trustana.com (agents overview), datax.ai (home) and kaavio.ai (home), plus a read of the current AltiusNxt home page code.

## Evidence note — read this first

What I could and could not inspect:

- **Observed (high confidence):** page text and heading structure of all three pages, nav labels, CTA wording and destinations, meta descriptions, customer-story headlines and metrics, stated statistics, certification mentions, pricing, and what scripts/media each page loads (for example GSAP + ScrollTrigger on Trustana, an MP4 on dataX).
- **Inferred (medium confidence):** the motion patterns. I read the code and libraries, not a screen recording. Where I say "scroll-driven" or "carousel" it is because the page ships GSAP/ScrollTrigger or Swiper, not because I watched it.
- **Not observed:** pixel-level visuals, product UI screenshots, mobile behaviour, page speed. Do a 20-minute screen-recording pass on each competitor before you brief a designer. Everything in the visual notes below should be treated as a hypothesis until then.
- Trustana's URL is a **product sub-page** (`/products/agents/overview`), not its home page, so its page is more product-led than a true home page would be.

---

## 1. Executive competitor summary

The three competitors sell three different things, and none of them sells what AltiusNxt sells.

| | What they actually sell | Who they court | Lead promise |
|---|---|---|---|
| **Trustana** | An "agentic commerce" platform: AI agents running on a unified catalog + business-rules context | Retailers, marketplaces, distributors (large, multi-language) | "Agents that understand commerce" |
| **dataX** | A catalog of ~20 AI tools priced per SKU, backed by human verification | Suppliers and distributors (MPN/GTIN/UPC, taxonomy, price files, tariff codes) | "Precision, Speed & Savings" / "AI speed meets human-verified accuracy" |
| **Kaavio** | Document-sourced AI workflows that turn part numbers into market-ready content | Industrial distributors and manufacturers | "It's time to rethink product content" |

Four findings that matter most:

1. **Everyone leads with AI/automation as the noun.** Agents, AI-powered data, AI workflows. A first-time visitor learns the technology before the problem. AltiusNxt can lead with the *buyer shift* (buyers research with AI) and the *outcome* (a record AI and buyers can trust), which none of them does.
2. **Proof is where they differ, and it is the biggest gap between them.** Trustana shows named customers with hard before/after numbers. dataX shows volume statistics, testimonials, SOC 2 and ISO. Kaavio shows four anonymised testimonials and one statistic. AltiusNxt has 18+ years of history and real case studies but currently shows none of it above the fold.
3. **None of them has a free, low-friction diagnostic.** Trustana: "Try our Agents" / "Book a Demo". dataX: "Contact Sales" plus one tariff-code demo. Kaavio: one "Get a demo" link to a calendar. AltiusNxt's AI Readiness Report is a genuine conversion advantage: a free, self-serve, single-URL test with a concrete deliverable.
4. **"AI plus humans" is already claimed.** dataX's page title is "Enrich & Classify Product Data with AI + Human Accuracy." So "human-in-the-loop" alone will not differentiate AltiusNxt. The defensible ground is *engineering the product record* with industry taxonomy and attribute expertise, then proving it with the diagnostic and re-test.

---

## 2. Trustana deep analysis (agents overview page)

**Positioning.**
- Promise: "Agents that understand commerce. Grounded in your catalog, supplier data, assets, and business rules."
- They sell *agents on top of a context layer* (they call it a context graph), not data enrichment as a service. The category language is "agentic commerce."
- Hero eyebrow announces a corporate event: "Trustana is joining Graas to accelerate agentic commerce!" That is news, not value, in the most valuable line on the page.
- Targets retailers, marketplaces, distributors. Industrial/technical depth is not the angle.
- First-time comprehension: a product-literate reader gets it in ~10 seconds; a catalog manager may not, because "agents" and "context" are abstractions.

**Hero.** Eyebrow (news) → H1 → one-line subcopy → two CTAs ("Try our Agents", "Book a Demo") → large product UI screenshot. It works because the product UI is shown immediately and there are two entry points (self-serve and sales). It is weakened by the news eyebrow and by an H1 that does not say what the product does to my catalog.

**Storytelling flow (page order).**
1. From scattered data to agent-ready context (Unify → Structure → Make agent-ready → Power every agent)
2. Context architecture: five or six pillars (attributes & rules, digital assets, relationships & taxonomy, channel requirements, customer signals, quality & governance)
3. Workflow design (schedule, quality bar, resolution paths)
4. Implementation: "Start from templates. Launch with our team." (four steps)
5. Final CTA: "Put an agent to work on your catalog" (Book a Demo / Explore the Agent Library)
6. Customer stories (nine named, each headlined with a metric)

Problem → mechanism → control → onboarding → CTA. They answer "will this be safe and controllable?" (governance, quality bar, resolution paths) before "how do I start?", which fits an AI product that buyers distrust.

**Product demonstration.** Product UI screenshots and workflow visuals. The page ships GSAP + ScrollTrigger and Swiper (carousels), which suggests scroll-linked reveals and slider components. No FAQ, no integration logos, no certifications on this page.

**Motion (inferred from code).**
- Useful: scroll-linked reveals that step through the four-stage data journey.
- Decorative risk: carousels for case studies hide proof behind arrows.

**Trust.**
- Strongest asset: nine named case studies with specific numbers: Toys"R"Us (2X weekly content output in two languages), a consumer goods retailer (+16% online revenue), Mitre 10 (faster SKU onboarding), Blackstone (40,000 SKUs ready in 8 weeks), Spinneys (2.5 months to 1 day, 96% faster), Primea (200 days to 2 hours), Vallen, David Jones, Yue Hwa.
- Weakness: those sit at the bottom of the page, not near the hero. No certifications or security signals appear on this page.

**Conversion.** Demo-led. "Try our Agents" is a real product trial entry (agent template listing), the strongest self-serve signal of the three. CTAs repeat at top and bottom.

**UX.** Long, abstract-heavy product page with a mega-nav (7 top-level groups, ~35 links). High navigation load for a first-time visitor.

**SEO / content.** Strong IA: solutions by use case (SEO & AEO, time to market, search & discovery) and by role, glossary, books & guides. Weakness in the markup: **47 of 48 images have empty alt text**; no canonical tag found in the fetched HTML; one JSON-LD block; no FAQ markup.

**Weaknesses.**
- Abstract vocabulary ("context graph", "agent-ready context") with little industrial specificity.
- The corporate-news eyebrow wastes the hero.
- Proof is far from the claim.
- Nothing shows one real product being transformed end to end.

**What AltiusNxt should do differently.** Show one concrete product (a multimeter) going through the process instead of describing a platform. Put proof near the top. Replace abstract nouns with the language of an industrial catalog manager.

---

## 3. dataX deep analysis (home)

**Positioning.**
- Eyebrow/H1: "AI-powered Product Data." H2 headline: "Precision, Speed & Savings for the Modern Supplier & Distributor."
- Tagline in meta: "AI speed meets human-verified accuracy. Enrich, classify, and connect 900M+ SKUs at scale. Trusted by 1,000+ distributors and manufacturers."
- They sell a *tool shelf*: Data Management (Bridge, price-file mapping, product matching, cleanup, SKU build, auto classification, tariff codes, SKU validation, invoice extraction, SDS/MTR PDF extraction), Find & Compare (competitor price monitoring, functional equivalents, assortment gaps, product grouping), and Digital Catalog & Supplier Connector (taxonomy audit and management, onboarding, monitoring).
- Targets suppliers and distributors specifically, with the strongest industrial vocabulary of the three (MPN, GTIN, UPC, SDS, MTR, blueprints, HTS codes).

**Hero.** Promo banner for a live tariff-code demo → eyebrow → H2 headline → one "Contact Sales" CTA → subcopy about SKU enrichment/mapping/normalisation/classification. The single CTA is "Contact Sales," the highest-friction option. The H1 is a four-word label while the real headline is an H2, which weakens the heading hierarchy for SEO.

**Storytelling flow.**
Hero → Products (three families, ~20 cards) → four feature blocks (Digital Transformation "across ANY specification: PDFs, flat files, SDS, blueprints, images", Content Enrichment, Auto-Classification, Taxonomy Management) → Use cases (six: validate MPN/GTIN/UPC, merge taxonomies, optimise with attributes, PDF extraction, data silos, annotation) → Statistics (900M+ SKUs, 1,000+ clients, 500+ subscriptions) → Testimonials (named and anonymised) → Pricing → Contact form.

The order is a *catalog browse*: here is everything we do, here is proof, here is the price, here is the form. It suits buyers who already know the category and are comparing vendors.

**Product demonstration.** Little UI storytelling in the text; one MP4 loop on the page and one live demo (tariff-code classification). The live demo is the only competitor feature that lets a visitor *try* something without talking to anyone.

**Motion.** Webflow-native interactions; no GSAP/ScrollTrigger. Mostly reveal and hover. Little that explains the product.

**Trust.** Strongest *breadth* of trust of the three:
- Volume statistics, six testimonials (Blevins, Porter Pipe & Supply, Aquifer, and anonymised "Top 3 US Retailer", "Leading US B2B Retailer", "Japanese Retailer"), including quantified claims ("onboarding went from months to days", "scale our catalog over 100X in 18 months", "97% of stock items listed", "revenue increase of more than 3%").
- ISO and SOC 2 Type 2 badges (linked), repeated in the footer.
- Weakness: statistics are claims without method, and several testimonials are anonymised.

**Conversion.** "Contact Sales" everywhere, plus transparent pricing ($0.98 per SKU for full enrichment, $0.04 per SKU monitoring, $6,000/year subscription with five users). Publishing prices is a bold trust move that no one else makes. A contact form at the bottom with a "How can we help?" dropdown.

**UX.** Card-heavy and dense. The product list is long enough to cause choice overload; there is no clear "start here" path for a first-time visitor.

**SEO / content.** Best-structured use-case and product URL set (`/products/...`, `/use-case/...`), many specific long-tail pages (tariff codes, MPN validation, taxonomy audit). Weaknesses: H1 is a label, only three empty alts, no FAQ markup, no canonical in the fetched HTML.

**Weaknesses.**
- Sprawl: ~20 products with no hero product or story. Visitors learn what is on the shelf, not what the *process* is.
- The "AI + human" claim is stated, not shown (no visible review workflow).
- Sales-only CTA; the demo is limited to one niche task.
- Price-per-SKU framing positions the work as a commodity.

**What AltiusNxt should do differently.** Lead with one process rather than twenty tools. Show *how* human review works. Offer the free report instead of "Contact Sales." Do not compete on price transparency until you have a pricing model you want to publish.

---

## 4. Kaavio deep analysis (home)

**Positioning.**
- H1: "It's time to rethink product content." Subcopy: "Kaavio builds AI-powered workflows to source and validate product data, so you can create and deploy market-ready content at scale."
- Clearly aimed at B2B distributors and manufacturers; founders' background (Octopart, Volition, Quartzy) is used as the credibility claim.
- Distinct idea: *"Start with content, not structure"*. Source from documents (datasheets, catalogs), validate, then generate structured attributes to PIM, SEO descriptions, comparisons, educational content.
- First-time comprehension: fast and calm, but the H1 is a manifesto, not a description. The subcopy does the real work.

**Hero.** H1 → subcopy → one CTA ("Get a demo", a direct HubSpot calendar link). No eyebrow. Minimal. Works because it is uncluttered and honest; weak because there is no visible product in the text content and only one, high-commitment action.

**Storytelling flow.**
1. The status quo isn't working (three pain points: supplier data, content gaps, backlogs)
2. Start with content, not structure (five outputs)
3. Product content becomes an asset, not a bottleneck (catalog, onboarding speed, team)
4. Kaavio powers your workflow: Source → Validate → Create → Deploy → Measure
5. Trusted by leading distributors and manufacturers (90% reduction in time and effort to get market-ready SKU content online; four anonymised testimonials)
6. Built by people who've done this before
7. See it in action (Book a demo)

This is the cleanest problem → reframe → outcome → process → proof → founders → CTA arc of the three. It reads like a pitch deck rendered as a page.

**Product demonstration.** The code references MP4 and a Lottie file, so there is some motion/video, but the textual content describes a workflow diagram rather than a UI. I could not verify how concrete the product visuals are.

**Motion (inferred).** Lottie/MP4, custom build. Probably workflow-diagram animation. Unknown quality.

**Trust.** One statistic (90%), four *anonymised* testimonials ("Fortune 500 Distributor Sr. Manager", "Top 50 Industrial Distributor VP"), founder pedigree. No logos, no certifications, no security statement on the page. That is thin for an enterprise buyer, especially one handing over supplier data.

**Conversion.** One CTA, repeated three times, all pointing at a calendar. Lowest friction to *book*, highest friction to *evaluate*: you must talk to someone before you see anything.

**UX.** Very short, very scannable, very low density. Good rhythm. Heading markup is duplicated in the DOM (the H1 text appears four times, probably responsive variants), which can confuse crawlers and screen readers.

**SEO / content.** Thin: a single page, no use-case pages, no FAQ, no structured data (no JSON-LD found), canonical present. The meta description is good ("turn part numbers into market-ready catalogs").

**Weaknesses.**
- Anonymised proof and a single stat feel unsubstantiated.
- No certifications, integrations, or process transparency.
- "Rethink" language is generic startup voice.
- A demo-only path loses visitors who are not ready to talk.

**What AltiusNxt should do differently.** Borrow the clarity of the arc (problem → reframe → process → proof) but make it concrete with a real product record, named or specific evidence, certifications, and a self-serve entry.

---

## 5. Competitor comparison table

Ratings are my judgement from the evidence above (Strong / Medium / Weak). "AltiusNxt today" reflects the live code, not intent.

| Dimension | Trustana | dataX | Kaavio | AltiusNxt today | AltiusNxt opportunity |
|---|---|---|---|---|---|
| Messaging clarity | Medium (abstract "agents/context") | Medium (clear audience, sprawling offer) | Strong (clean arc) | Medium (strong market-shift hero, but "what is it" arrives late) | Strong: lead with buyer shift + the product record |
| Product visibility | Strong (UI screenshot in hero) | Weak–Medium (tool cards, one video) | Unknown | Strong in sections 3–7, weak in hero | Show the real CatalogWiz record in the hero |
| AI positioning | Agents (heavy) | AI + human | AI workflows | "AI-ready content" (good) | AI as accelerator, expertise as trust |
| Enterprise credibility | Strong (named customers) | Strong (SOC 2, ISO, stats) | Weak (anonymised) | Medium (history and ISO exist but are not on the home page above the fold) | Strong with a trust strip and named proof |
| Industrial relevance | Weak | Strong | Strong | Strong (multimeter, valves, fasteners) | Own the "industrial product data" vocabulary |
| Trust placement | Late | Mid–late | Mid–late | Footer-only certifications | Early + distributed |
| Product storytelling | Medium | Weak | Medium | Strong pieces, fragmented | One continuous product story |
| Animation | Scroll reveals (GSAP) | Light | Lottie/MP4 | Strong, but sections are independent | One orange-pulse language across the page |
| Integrations | Not on this page | "Bridge", supplier connector | PIM output mentioned | 10 channels with animated publishing | Own "enrich once, publish everywhere" |
| Use cases | Strong (solutions pages) | Strongest (long-tail pages) | Weak | Weak on the home page | Industry/persona section + use-case pages |
| Conversion | Demo + trial | Contact Sales + one live demo | Calendar link | Free AI Readiness Report (best) | Make the report the single primary goal |
| SEO | Good IA, poor alt text | Good URLs, weak H1 | Thin | Moderate; no FAQ; no use-case depth | Natural keyword headings, FAQ with schema, use-case pages |
| Visual quality | Polished product-led | Template-like (Webflow cards) | Minimal | Strong, but dense | Calm, industrial, evidence-led |
| Differentiation | Agent context layer | Price-per-SKU tools + human check | Document-first sourcing | "Engineer the product record" (not yet visible) | Owned: record engineering + readiness diagnostic |

**What they all do well**
- Say plainly who it is for.
- Reduce the work into a short sequence (unify/structure/activate; source/validate/create/deploy).
- Use quantified outcomes in customer proof (Trustana and dataX especially).
- Make at least one CTA obvious.

**What they all miss**
- A concrete, end-to-end demonstration using *one real product*.
- A free self-serve diagnostic.
- Evidence of how human review actually works.
- Any explanation of the *buyer's* side of the change (how AI assistants and search now consume product data).
- Compact, early certification and security trust (only dataX has it, and it is low on the page).

**What AltiusNxt can own**
- The *record itself* as the product: attribute development, taxonomy, specification standards, validation.
- The *diagnostic-first* funnel (scan, diagnose, enrich, re-test).
- Industrial domain fluency (units, CAT ratings, MPN/GTIN, taxonomies for electrical, valves, fasteners, HVAC).
- "Enrich once, publish everywhere" shown as a visible, verifiable flow rather than a claim.

---

## 6. What AltiusNxt should copy as a principle (not as design)

1. **Show one concrete artifact early** (Trustana's UI-in-hero) but use a real product record rather than an abstract dashboard.
2. **Make the process a short named sequence** (Kaavio's Source → Validate → Create → Deploy → Measure) so visitors can repeat it to a colleague.
3. **Put a number next to every customer story** (Trustana's headlines, dataX's quantified quotes). Only use numbers you can defend.
4. **Offer something to try** (dataX's live demo, Trustana's agent trial). Yours is stronger: the free report.
5. **Show governance** (Trustana's quality bar and resolution paths): who approves what. This answers the AI-trust objection directly.
6. **Publish certifications where buyers look** (dataX): near the top, not only in the footer.
7. **Build a long-tail page set** (dataX's use-case URLs) so the home page can stay focused.

## 7. What AltiusNxt should avoid

- A news or corporate-event eyebrow in the hero (Trustana).
- A 20-card product shelf with no hero product (dataX).
- A sales-only or calendar-only CTA (dataX, Kaavio).
- Anonymised testimonials as the main proof (Kaavio, parts of dataX). If a customer must stay anonymous, describe them by industry and size and quantify the outcome.
- Abstract vocabulary ("context graph", "agent-ready", "rethink") without an example.
- Empty image alt text (Trustana) and duplicated heading markup (Kaavio).
- A label as the H1 (dataX).
- Stating "AI + human" without showing the review step.
- Unsupported vanity statistics. dataX's "900M+ SKUs" works only because it is backed by volume; do not invent an equivalent.
- Carousels that hide proof.

## 8. Our strongest differentiation

**"We don't give you another place to store product data. We engineer the product record itself."**

Three pillars to prove, not just claim:

1. **Engineered, not just filled.** Taxonomy, attribute and specification development done by people who know the category (18+ years, since 2007), applied through CatalogWiz.
2. **Verifiable.** Every record is validated and human-approved, and the AI Readiness Report re-tests the same buyer-style questions before and after enrichment.
3. **Deliverable.** Approved once, published everywhere (10 channels), with the diagnostic as the front door.

Suggested positioning line (for use under the hero or in the Why section):

> AI accelerates the work. Product-data expertise makes it trustworthy.

Why it holds against each competitor:
- vs Trustana: they sell an agent platform; you deliver a finished, verified record and the expertise behind it.
- vs dataX: they sell a menu of tools priced per SKU; you sell one engineered outcome with a process you can see.
- vs Kaavio: they start from documents and a demo; you start from a free diagnostic and prove the before/after.

Caveat: this only works if the proof exists. Collect (a) two or three named case studies with a defensible metric, (b) a volume number you can stand behind (SKUs or products enriched, years, customers), and (c) permission for logos.

---

## 9. Final homepage story / section order

Current home page (from code): Hero → five "outcomes" cards → Workbench showcase → Core capabilities → Seven layers → Supplier-data flow → Publishing flow → Impact metrics → Customer proof / Resources tabs → AI Readiness (three sections) → Footer with CTA.

Recommended order (13 sections, with the final CTA living in the footer):

| # | Section | Purpose | Replaces / uses |
|---|---|---|---|
| 01 | Hero | Say what it is in 5 seconds | Existing hero, rewritten |
| 02 | Trust strip | Credibility before scrolling | New (compact) |
| 03 | The product data problem | Make the pain tangible | New; borrows the supplier-flow visuals |
| 04 | One product story (multimeter) | The signature explanation | Merges Supplier flow + Seven layers |
| 05 | CatalogWiz Workbench tour | Show the real product | Existing Workbench showcase, as tabs |
| 06 | Why AltiusNxt | Software alone doesn't fix product data | New; content from the Why page |
| 07 | What we engineer (services) | Enrichment, taxonomy, attributes | Existing Capabilities section |
| 08 | Who we help | Industry and persona fit | New |
| 09 | Enrich once. Publish everywhere. | Outcome across channels | Existing publish flow |
| 10 | Customer proof + business impact | Evidence | Merges Impact metrics + Customer stories/Resources tabs |
| 11 | AI Readiness teaser | The lead-gen diagnostic | Compress the current three sections into one |
| 12 | FAQ | Answer objections, win long-tail SEO | New |
| 13 | Footer with final CTA | Single conversion goal | Existing compact footer |

Judgement calls on your proposed list:
- **Your 13 (Security/Quality) should not be a standalone section.** Certifications would then appear in three places (trust strip, security section, footer). Show them compactly in 02 and the footer, and put the *explanation* (what ISO/IEC 27001 means for supplier files) inside 06 Why AltiusNxt.
- **Your 15 (Final CTA) is already the footer's CTA card.** A separate final CTA band before it would repeat the same ask twice in a row.
- **Your 10 (Business impact) and 11 (Customer proof) belong together.** Metrics next to the stories that produced them is far more credible than a separate statistics band.
- **Hero → Trust → Problem → Product story is the right spine.** It follows Kaavio's arc but replaces its abstraction with a concrete record.

---

## 10. Detailed design brief for every section

### 01 · Hero
- **Purpose:** Answer in 5 seconds: what is it, what does CatalogWiz do, who is it for, what do I get.
- **User question:** "What is this and is it for me?"
- **Eyebrow:** AI-READY PRODUCT DATA FOR MANUFACTURERS & DISTRIBUTORS
- **Headline (options):**
  - A: "Buyers research with AI now. Is your product data ready?"
  - B: "Your product data decides whether AI can find, compare and trust you."
  - Keep one clear H1; use A if you want to keep the market-shift hook of the current hero.
- **Supporting copy:** "AltiusNxt engineers complete, structured, validated product records. We enrich them in CatalogWiz, review them with product-data experts, and publish to every sales channel."
- **CTA:** Primary "Get your free AI Readiness Report". Secondary "See CatalogWiz in action" (scrolls to 04).
- **Content:** One support line under the CTAs: "One product page. Clear findings. No obligation."
- **Visual concept:** One real CatalogWiz product record (the multimeter, completeness 62%) on the right, with a small stack of raw inputs (PDF, XLSX, ERP row) feeding it. No stock image, no AI graphic.
- **Animation:** Raw file chips pulse into the record; completeness counts up; status chips tick. Runs once, about 4 seconds. Reduced motion shows the final state.
- **Interaction:** Hovering an attribute highlights where it appears downstream (reused from the publish flow).
- **Trust element:** Single line under the CTA: "Serving industrial businesses since 2007."
- **SEO value:** H1 carries "AI-ready product data"; the supporting line carries "product data enrichment" and "manufacturers and distributors."
- **Mobile:** Copy first, CTA, then the record as a static card with a short pulse; inputs collapse to three chips.

### 02 · Trust strip
- **Purpose:** Establish credibility before the first scroll decision.
- **Question:** "Are these people real and established?"
- **Eyebrow:** none. **Headline:** none (a strip, not a section).
- **Content (one row):** Since 2007 · ISO 9001:2015 · ISO/IEC 27001:2022 · B2BEA member · United States + India · and customer logos if permission exists.
- **CTA:** None.
- **Visual concept:** 56–72px tall, hairline borders, the real badge artwork at about 40px in warm-white mini frames (as in the footer).
- **Animation:** Single fade-in. Certification logos get no motion at all.
- **Interaction:** Each item links to the relevant explanation in 06.
- **Trust element:** Company trust (see trust map).
- **SEO value:** Real text beside the logos ("ISO/IEC 27001:2022 certified by TÜV Austria") plus descriptive alt text.
- **Mobile:** Horizontally scrollable single row or a two-by-two grid; never taller than about 120px.

### 03 · The product data problem
- **Purpose:** Name the pain in the visitor's own words.
- **Question:** "Is this my problem?"
- **Eyebrow:** WHERE PRODUCT DATA BREAKS
- **Headline:** "Your product data arrives broken. Buyers and AI notice."
- **Copy:** "Supplier spreadsheets, PDF catalogs, ERP exports, inconsistent units and missing specifications become the product pages your buyers (and AI assistants) are left to interpret."
- **CTA:** Text link "See what a clean record looks like →" (scrolls to 04).
- **Content:** A labelled mess: XLSX with mixed units, PDF datasheet, ERP row with a wrong MPN, two image files, duplicate SKUs, empty attributes. Each flaw gets a small amber tag ("Unit mismatch", "Missing MPN", "Duplicate").
- **Visual concept:** SVG/UI collage of the real file types converging toward one slot labelled CatalogWiz. No photography.
- **Animation:** Fragments drift in (once), flaws tag in sequence, then everything converges as one orange pulse into the next section.
- **Interaction:** Hover a flaw to read a one-line explanation of why it hurts discovery.
- **Trust element:** Product trust (real-world flaws, not generic icons).
- **SEO value:** Targets "product data quality", "incomplete product data", "supplier data".
- **Mobile:** Vertical stack of six flaw cards, no drifting; a single vertical pulse leads to the next section.

### 04 · One product story (signature section, sticky)
- **Purpose:** Explain the whole offer with one product, better than ten feature cards.
- **Question:** "What exactly happens to my data?"
- **Eyebrow:** ONE PRODUCT, START TO FINISH
- **Headline:** "Watch one multimeter become an AI-ready product record."
- **Copy:** "From supplier PDF to approved, channel-ready record: extracted, classified, specified, validated and approved."
- **CTA:** "Test your own product — free →"
- **Content:** Stages: Extract → Classify → Build attributes → Standardize specs → Validate → Approve → Publish. Real attributes: AC/DC voltage, AC/DC current, resistance, frequency, capacitance, CAT rating, accuracy, display count.
- **Visual concept:** Left pinned: a single product record. Right (scrolling): stage text. The record visibly changes at each stage.
- **Animation (sticky):** See the scrollytelling spec in section 11.
- **Interaction:** Clicking a stage name jumps to it; keyboard accessible.
- **Trust element:** Product trust: "Human review" shown at the Approve stage with a named reviewer role, not an avatar.
- **SEO value:** "product data enrichment", "product attribute development", "technical specification", "product taxonomy".
- **Mobile:** No pinning. Vertical stepper; each stage shows a before/after row and a short pulse.

### 05 · CatalogWiz Workbench tour
- **Purpose:** Prove the product exists and is usable.
- **Question:** "Can I actually see the software?"
- **Eyebrow:** THE CATALOGWIZ WORKBENCH
- **Headline:** "The workspace where product data gets engineered."
- **Copy:** "Enrichment, taxonomy, attributes, quality, assets, approval and publishing in one workbench."
- **CTA:** "Explore the Workbench →"
- **Content:** Seven tabs: Enrichment, Taxonomy, Attributes, Quality, Digital Assets, Approval, Publishing.
- **Visual concept:** One large dashboard frame; the tab changes the active panel (not the whole frame).
- **Animation:** Moving orange tab indicator; panel content swaps with a short opacity/translate transition; the same multimeter record stays visible.
- **Interaction:** Tabs with arrow-key support (WAI-ARIA); no autoplay.
- **Trust element:** Product trust (real UI, not a mock-up).
- **SEO value:** "product data workbench", "product data validation".
- **Mobile:** Tap-controlled tabs above a single full-width panel.

### 06 · Why AltiusNxt
- **Purpose:** Separate you from software-only competitors.
- **Question:** "Why you rather than a tool, or a PIM, or an AI startup?"
- **Eyebrow:** WHY ALTIUSNXT
- **Headline:** "AI accelerates the work. Product-data expertise makes it trustworthy."
- **Copy:** "Software alone doesn't fix product data. Taxonomy, attribute and specification decisions need people who know the category."
- **CTA:** "How we work →" (links to the Why page).
- **Content:** Four elements equation: Product-data expertise + Industry knowledge + CatalogWiz technology + Human review = a record you can trust. Under each, one proof fact (years, categories, review step, ISO/IEC 27001 handling of supplier files).
- **Visual concept:** A single horizontal "layers" diagram: AI-extracted draft at the bottom, rules and expertise in the middle, human-approved record at the top. Not an equation of logos.
- **Animation:** Layers stack one after another; a pulse passes up through them.
- **Interaction:** Hover a layer to see "who does this" and "what it catches" (an example error).
- **Trust element:** Company trust and process trust.
- **SEO value:** "product data experts", "human-in-the-loop product data".
- **Mobile:** Vertical layer stack, same order.

### 07 · What we engineer (services)
- **Purpose:** Name and differentiate the three services.
- **Question:** "What do you actually deliver?"
- **Eyebrow:** WHAT WE ENGINEER
- **Headline:** "Enrichment, taxonomy and attributes, built for technical products."
- **CTA:** "Talk to a product-data expert →" (secondary; the report stays primary elsewhere).
- **Content:** Product Data Enrichment, Product Taxonomy Services, Product Attribute Development, each with a before/after example row.
- **Visual concept:** Three-way tabs with a large before/after panel (not three cards).
- **Animation:** Moving tab indicator; the "after" column fills row by row.
- **Interaction:** Toggle Before/After; the keyboard works.
- **Trust element:** Business-proof (link each service to one case study).
- **SEO value:** "product taxonomy services", "product attribute development", "product content enrichment".
- **Mobile:** Segmented tabs and a stacked before/after.

### 08 · Who we help
- **Purpose:** Let the visitor self-identify.
- **Question:** "Do you understand my kind of catalog?"
- **Eyebrow:** WHO WE HELP
- **Headline:** "Built for complex B2B product data."
- **Content:** Four audiences (Manufacturers, Distributors, Industrial ecommerce teams, Product data teams) and eight categories (Electrical, Tools, Valves & Flow Control, Fasteners, HVAC, Medical, Commercial equipment, Industrial supplies). Each category shows two typical attributes ("CAT rating, voltage range", "pressure rating, end connection").
- **Visual concept:** Category tiles with a transparent product cut-out and the two example attributes. No people.
- **Animation:** Attribute chips appear on hover only.
- **Trust element:** Industry trust.
- **SEO value:** "industrial product data", "manufacturer product data", "distributor ecommerce".
- **Mobile:** Two-column tile grid, tap to reveal attributes.

### 09 · Enrich once. Publish everywhere.
- **Purpose:** Prove the downstream outcome.
- **Question:** "Where does it end up, and is it consistent?"
- **Eyebrow / Headline:** Keep the current section (it works). Add the Connecting → Synced → Published states.
- **CTA:** "See supported channels →".
- **Visual / animation / mobile:** Existing publish flow; make sure green appears only at the final Published state.

### 10 · Customer proof + business impact
- **Purpose:** Evidence.
- **Question:** "Has this worked for someone like me?"
- **Eyebrow:** CUSTOMER PROOF
- **Headline:** "Real catalogs. Real outcomes."
- **Content:** Each story shows Industry → Problem → Work completed → Outcome. Metrics appear only where the case study supports them; otherwise write outcomes in plain words.
- **Visual concept:** The existing tabbed Success Stories / Resources hub, with the four-line story format and a metric chip.
- **Animation:** Existing tab indicator and card reveal. Optional: count up on a metric chip once.
- **Trust element:** Business-proof trust.
- **SEO value:** Case-study headlines carrying industry plus problem ("How product data enrichment improved discoverability for Kempston Controls").
- **Mobile:** Stacked cards, no carousel.

### 11 · AI Readiness teaser
- **Purpose:** Convert.
- **Question:** "Can I test this on my own product, for free?"
- **Eyebrow:** AI READINESS ASSESSMENT
- **Headline:** "See how AI-ready your product content really is."
- **Content:** Scan → Diagnose → Enrich → Re-test, plus the report preview (Product identity, Specifications, Structured data, Data consistency, AI discoverability).
- **CTA:** "Get your free AI Readiness Report"; no guarantee language.
- **Visual:** A compact version of the scan visual plus one report thumbnail.
- **Animation:** Reuse the scan sequence once; keep it under about 6 seconds.
- **Trust element:** Product trust: "Illustrative example, not a live audit" until real sample output exists.
- **SEO value:** "AI readiness for product data", "AI product discovery".
- **Mobile:** Four vertical steps and a report card.

### 12 · FAQ
- **Purpose:** Remove objections; capture long-tail search.
- **Eyebrow:** QUESTIONS WE HEAR
- **Headline:** "Product data, answered."
- **Content:** Seven questions (see SEO section).
- **Interaction:** Accessible accordion; the first one is open.
- **SEO value:** FAQPage schema, only for questions visibly on the page.
- **Mobile:** Same accordion, full width.

### 13 · Footer with the final CTA
Already built. The footer CTA is the single closing conversion; no extra band above it.

---

## 11. Animation for every section

**The one motif: the orange data pulse.** A 6–8px orange dot (with a faint ring) travelling along a thin line, always meaning "data moving from one state to the next." Same easing everywhere: `cubic-bezier(0.22, 1, 0.36, 1)`. Green appears only when something is confirmed. Amber appears only for a flaw.

| # | Section | Motion that explains | Motion to avoid |
|---|---|---|---|
| 01 | Hero | Raw file chips pulse into the record; completeness 62 → 100%; status chips tick | Floating particles, looping background |
| 02 | Trust strip | One fade | Anything on the logos |
| 03 | Problem | Flaw tags appear in sequence; fragments converge as one pulse | Continuous drifting |
| 04 | One product story | Sticky sequence (below) | Parallax |
| 05 | Workbench | Moving tab indicator; panel swaps | Auto-rotating tabs |
| 06 | Why | Layers stack; pulse travels up | Orbiting icons |
| 07 | Services | Before/after rows fill; moving tab line | Card tilt |
| 08 | Who we help | Chips on hover | Marquees |
| 09 | Publish | Pulse to each channel with a 120–180ms stagger: Connecting → Synced → Published | Everything at once |
| 10 | Proof | Image scale ≤ 1.02; one-time metric count-up | Carousel auto-advance |
| 11 | AI Readiness | Scan line, extraction, query chips, result states | Fake percentage scores |
| 12 | FAQ | Height transition | None |
| 13 | Footer | One pulse along the CTA edge | Looping |

**Scrollytelling: use it in two places only.**

1. **Section 04 (strong, pinned).**
   - *Pinned:* the product record (left, about 45% of the width) with the stage progress rail.
   - *Scrolls:* the stage text (right), one short block per stage.
   - *What changes at each stage:*
     1. Extract: PDF/XLSX/ERP chips pulse into the record; blank fields appear.
     2. Classify: the taxonomy path builds (Test & Measurement → Electrical Test Equipment → Digital Multimeters).
     3. Attributes: the multimeter attributes fill one by one; completeness counts up.
     4. Standardize: units and formats normalise (the "mV / V" row snaps to one unit).
     5. Validate: checks turn green.
     6. Approve: the reviewer step ticks.
     7. Publish: one pulse exits right toward the next section.
   - *Pin duration:* about 250–300vh of scroll in total (roughly 35–40vh per stage). Never pin beyond that. Release the pin as soon as the last stage lands.
   - *Mobile:* no pin; a vertical stepper where each stage animates once on entering view.
2. **Section 07 (light sticky).** The service tabs list stays pinned while the before/after panel swaps; limit it to about 150vh, or skip pinning and use tabs only.

Do **not** pin sections 05, 09 or 11. Triggering on entry is enough, and it avoids the blank "spacer" problem that badly built pinned sections create.

**Implementation note:** this project does not use GSAP. Use IntersectionObserver for entry and a `position: sticky` layout with scroll-position math (as the audit section already does) rather than adding a library. Only add GSAP + ScrollTrigger if you want finer scrubbing in section 04.

**Micro-interaction rules (site-wide):**
- Buttons: arrow travels 3px.
- Cards: translateY(-3px) and a border darkening; no scale.
- Integration cards: highlight only that card's connector path.
- Tabs: moving orange underline.
- Attribute rows: row highlight, with the matching downstream element lighting up.
- Case-study images: scale ≤ 1.02.
- Certification logos: no animation; border colour change on hover at most.
- Everything: `prefers-reduced-motion` shows the final state.

---

## 12. Trust strategy

| Location | Signal | Type |
|---|---|---|
| Hero | "Serving industrial businesses since 2007"; a customer name if permitted | Company |
| Trust strip (02) | ISO 9001:2015, ISO/IEC 27001:2022, B2BEA, US + India, customer logos | Company |
| Problem (03) | Real-world flaws (units, MPN, duplicates), not generic icons | Product |
| Product story (04) | Real multimeter attributes; reviewer step shown | Product |
| Workbench (05) | Real UI; validation and approval panels visible | Product |
| Why AltiusNxt (06) | Years, categories handled, the human review step, what ISO/IEC 27001 means for the supplier files they send | Company + process |
| Services (07) | One linked case study per service | Business proof |
| Who we help (08) | Category-specific attributes show domain fluency | Industry |
| Publish (09) | Named channels and an explicit Synced/Published status | Product |
| Customer proof (10) | Named stories with Industry → Problem → Work → Outcome and a defensible metric | Business proof |
| AI Readiness (11) | A clear "what you receive" list; no guarantees; labelled as illustrative until real sample output exists | Product |
| FAQ (12) | Honest answers (including "do we need a PIM?") | Company |
| Footer | Compact certification row, both offices, direct phone and email | Company |

**Rule:** a trust signal belongs next to the claim it supports. Certifications near "we handle your supplier files". Metrics next to the story that produced them. Channel names next to the publishing flow.

**Collect before you ship (these decide whether the page is credible):**
1. Permission to name two to four customers or show their logos.
2. One defensible quantified outcome per case study.
3. One volume number (products or SKUs enriched, categories covered, years).
4. A sample report (redacted) so the "What you receive" preview is real.

---

## 13. SEO strategy

**H1 (one per page).** Pick one: "Buyers research with AI now. Is your product data ready?" or "AI-ready product data for manufacturers and distributors." Support it with a sentence containing *product data enrichment*.

**H2 architecture (one per section, natural wording):**
1. Hero: H1
2. (strip, no heading)
3. "Your product data arrives broken. Buyers and AI notice."
4. "Watch one multimeter become an AI-ready product record."
5. "The workspace where product data gets engineered."
6. "AI accelerates the work. Product-data expertise makes it trustworthy."
7. "Enrichment, taxonomy and attributes, built for technical products."
8. "Built for complex B2B product data."
9. "Enrich once. Publish everywhere."
10. "Real catalogs. Real outcomes."
11. "See how AI-ready your product content really is."
12. "Product data, answered."

**Term map:**
- Hero/problem: AI-ready product content, B2B ecommerce product data, product data quality
- Product story/workbench: product data enrichment, product attribute development, product taxonomy, PIM data enrichment
- Services: product taxonomy services, product content enrichment
- Who we help: industrial product data, manufacturer product data, distributor ecommerce
- AI readiness: AI product discovery, AI readiness for product data

**FAQ (7, each answered in 40–90 words, with FAQPage JSON-LD for the visible questions):**
1. Do we need a PIM to use CatalogWiz?
2. Can CatalogWiz work with our ERP or ecommerce platform?
3. Can you enrich technical industrial products?
4. How is AI-generated content reviewed?
5. Can we start with a small product catalog?
6. Can CatalogWiz publish directly to our sales channels?
7. What is an AI Readiness Report, and what do I receive?

**Internal linking:**
- Hero → report page; product story → Workbench page; Why → /why-altiusnxt; services → case studies; AI readiness → report page; FAQ answers link to the relevant section or page.
- Use descriptive anchors ("read the Kempston Controls case study"), never "click here".

**Resource and page set to build around the home page (the long tail competitors already win with):**
- Use-case pages: MPN/GTIN validation, attribute normalisation, taxonomy development, spec extraction from PDF datasheets, publishing to Shopify/BigCommerce/Magento.
- Industry pages: electrical, tools, valves, fasteners, HVAC.
- Guides: "product data cleansing checklist", "what AI search needs from a product page", "attribute standards for [category]".

**Case-study positioning:** headline = industry + problem + result in plain words; each one gets its own URL, Article schema, descriptive alt text, and a "what we did" section.

**Technical hygiene (competitors fail here):** descriptive alt text on every informative image (Trustana has 47 of 48 empty), one H1, canonical tags, no duplicated heading markup (Kaavio), JSON-LD only for facts on the page, and lazy-load below-the-fold imagery with reserved dimensions.

---

## 14. Mobile strategy

Rules: 22–24px side padding, no horizontal overflow, nothing pinned, nothing autoplaying, touch targets ≥ 44px.

| Desktop pattern | Mobile equivalent |
|---|---|
| Hero record with inputs feeding in | Copy, CTA, then a static record with a short pulse; inputs collapse to three chips |
| Trust strip in one row | Two-by-two grid or horizontal scroll |
| Messy-data collage converging | Vertical stack of flaw cards, one pulse line down |
| Pinned product story (04) | Vertical stepper; each stage animates once when it enters the viewport |
| Workbench tabs with a large dashboard | Tap-controlled tabs above one full-width panel |
| Why layers diagram | Vertical layers, same order |
| Services before/after | Segmented tabs and a stacked before/after |
| Industry tiles with hover chips | Two-column grid; tap to reveal attributes |
| Ten connected channels with SVG paths | Compact two-column grid and a single vertical animated line; each card flips Connecting → Synced → Published in sequence |
| Tabbed case-study hub | Segmented tabs and stacked cards |
| AI readiness scan | Four vertical steps and one report card |
| Footer navigation | Accordion (Product open by default) |

**Performance:**
- Animate only `transform`, `opacity` and `stroke-dashoffset`. No filters, no canvas, no blur animation.
- One IntersectionObserver per section, disconnected after first trigger.
- Lazy-load images below the fold with width and height set; prefer SVG/CSS for diagrams.
- Serve the multimeter and category cut-outs as WebP/AVIF at 1–2 sizes.
- Reduced-motion users get the final state immediately.

---

## 15. Required image assets and generation prompts

Prefer real UI and SVG/CSS wherever possible. Only these assets genuinely need imagery:

| Section | Need an image? | What / why | Priority |
|---|---|---|---|
| 01 Hero | **No new photo.** Use the real CatalogWiz record + the existing transparent multimeter | Real product beats any generated art | — |
| 02 Trust strip | No | Real badge files already in the project | — |
| 03 Problem | **No image**: build in SVG/UI | File-type chips and flawed rows communicate better | — |
| 04 Product story | No | Real UI states + multimeter | — |
| 05 Workbench | **Real screenshots** of each tab (not generated) | Authenticity is the point | High |
| 06 Why | No | Diagram | — |
| 07 Services | Real before/after crops from your own work | Evidence beats stock | High |
| 08 Who we help | **Yes**: 8 transparent category product cut-outs | Domain fluency at a glance | High |
| 10 Customer proof | **Yes**: clean case-study covers *without the red polygon overlays* | The current covers bake a red shape and text into the image, so the layout cannot control them | High |
| 11 AI readiness | No | The scan/report UI | — |

**Prompt: category product cut-outs (one prompt, repeat per category)**
> Studio product photograph of a [digital multimeter / ball valve / hex bolt assortment / thermostat / pulse oximeter / commercial mixer / safety gloves / circuit breaker], realistic industrial product, three-quarter view, neutral soft light from upper left, subtle contact shadow, isolated on a pure transparent background, 2400px on the long edge, photorealistic, sharp label-free surfaces, no brand names or logos, no text, no hands, no props.

**Prompt: case-study covers without overlays**
> Editorial photograph for a B2B case study: a laptop and tablet displaying a clean industrial ecommerce product page for [fasteners / electrical components / scientific instruments], on a workshop bench, warm natural light, shallow depth of field, shot from a three-quarter angle, 16:10 composition with empty space on the right third, no text, no logos, no overlays, no people.

**Prompt: "Who we help" band (optional editorial photo)**
> Editorial photograph of an industrial distributor's parts counter with labelled bins of electrical and mechanical components, warm tungsten and daylight mix, documentary style, no recognisable faces, no brand names, no text, 21:9 composition.

**Prompt: supplier file props for the problem section (if you prefer images over SVG)**
> Flat-lay top view of an XLSX spreadsheet with inconsistent columns, a PDF datasheet page, and an ERP export printout on a desk, neutral light, realistic, no readable personal data, no brand names, 3:2.

Always: add descriptive alt text, set width and height to prevent layout shift, and reuse the real badge files unchanged.

---

## 16. Sections to remove or merge from the current homepage

| Current section | Action | Why |
|---|---|---|
| "Better product data. Better business outcomes." (five outcome cards) | **Remove** | Overlaps the Impact metrics; it states outcomes without evidence and delays the product |
| Workbench showcase | **Keep**, convert to the tabbed tour (05) | It is your actual product |
| Core capabilities | **Keep**, rework as 07 (services with before/after) | Currently reads like a feature card list |
| "Seven layers" (Product intelligence) | **Merge** into 04 | Same story told twice |
| Supplier-data flow | **Merge** into 03 + 04 | Same input → CatalogWiz → output idea |
| Publishing flow | **Keep** (09) | Strong and distinctive |
| Impact metrics | **Merge** into 10 | Numbers belong beside the stories; use only supportable values |
| Customer proof / Resources tabs | **Keep**, add the Problem → Work → Outcome format | Good structure |
| AI Readiness (three sections) | **Compress to one** (11); move the five-module audit detail and the full before/after to the report page | Too large for a homepage teaser and it dwarfs everything after it |
| Footer CTA | **Keep** as the only final CTA | Already built |

Net effect: 13 purposeful sections instead of roughly 14 overlapping ones, with proof arriving earlier and the AI Readiness block much smaller.

---

## 17. Top 10 high-impact changes to implement first

1. **Rewrite the hero** so it names what AltiusNxt is and does (with the real CatalogWiz record), keeping the buyer-shift hook as the hook rather than the whole message.
2. **Add the trust strip** immediately under the hero (since 2007, ISO 9001, ISO/IEC 27001, B2BEA, US + India, customer logos).
3. **Build the "One product story"** (multimeter) as the page's centrepiece and fold the Supplier-flow and Seven-layers sections into it.
4. **Add the Problem section** (messy-data visual) in front of it so the story has a start.
5. **Add "Why AltiusNxt"** with the line "AI accelerates the work. Product-data expertise makes it trustworthy." This is your differentiation and it is currently invisible on the home page.
6. **Compress AI Readiness** from three sections to one teaser and keep it as the single primary CTA.
7. **Add the FAQ** with seven questions and FAQPage markup.
8. **Upgrade customer proof**: Industry → Problem → Work → Outcome, with replaced covers (no baked-in overlays) and real metrics only.
9. **Remove the five-card outcomes section** and merge Impact metrics into customer proof.
10. **Fix SEO hygiene**: descriptive alt text on all images, one H1, canonical tags, and a use-case page set behind the home page.

---

## 18. Final Claude Code implementation plan

Existing components to reuse: `WorkbenchShowcase`, `CapabilitiesShowcase`, `PublishFlow`, `ImpactMetrics`, `ContentHub`, `AIReadiness`, `Footer`. Page file: `src/pages/Home.jsx`.

**Phase 0 — content (no code, do first)**
- Collect permissions, metrics and a sample report (see the trust section). Without them, ship sections 03–09 and leave the number-led parts out.

**Phase 1 — structure and cleanup (small, low risk)**
1. Remove the five-card "outcomes" block from `Home.jsx`; delete its data and CSS.
2. Add `TrustStrip.jsx` (+ css) under the hero, using the badge assets already in `src/assets/awards/`.
3. Add `FAQ.jsx` with the seven questions and a `FAQPage` JSON-LD block generated from the same data array.
4. Reorder `Home.jsx` to the 13-section order.

**Phase 2 — the story**
5. `ProblemData.jsx` (03): SVG/CSS file chips with flaw tags; IntersectionObserver-triggered; vertical stack under 760px.
6. `ProductStory.jsx` (04): `position: sticky` left pane + scrolling right stages; scroll-position-driven stage index (reuse the pattern from `AuditSection`); total height about 250–300vh; disable the pin under 900px and show a vertical stepper. Fold `SupplierFlow` and `ProductIntelligence` content into it and then remove those two components from the page.
7. Convert `WorkbenchShowcase` to tabs (05) with the moving indicator and ARIA tab semantics (copy the pattern from `ContentHub`).
8. `WhyAltiusNxt.jsx` (06): layers diagram, with copy from the existing Why page.
9. Rework `CapabilitiesShowcase` as 07 with before/after tabs.
10. `WhoWeHelp.jsx` (08): data-driven tiles (audience × category), each with two attribute chips.

**Phase 3 — proof and conversion**
11. Merge `ImpactMetrics` into the customer-proof hub; give `ContentHub` a four-line story format (Industry / Problem / Work / Outcome) and a metric chip that is shown only if the field is present.
12. Compress `AIReadiness` into a single section (scan → diagnose → enrich → re-test + report thumbnail). Move the five-module audit and the full before/after to `/ai-readiness-report` (the existing page).
13. Keep the footer as is; verify that its CTA is the only closing CTA.

**Phase 4 — polish and verification**
14. Add a shared `useInView` hook (IntersectionObserver, once) and a shared CSS token set (`--pulse`, easing) to unify motion.
15. Alt text, one H1, canonical, JSON-LD (FAQ + Organization), image dimensions, lazy loading.
16. Check at 390, 820 and 1440px widths; check `prefers-reduced-motion`; run Lighthouse on mobile; confirm no section adds pinned blank space.

**Acceptance checks**
- A first-time visitor can say what AltiusNxt does after reading only the hero and the trust strip.
- Certifications and customer evidence appear above the fold or immediately below it.
- Exactly one primary CTA (the free report) repeats; every other action is secondary.
- Only two sections use sticky scroll.
- No stat appears that you cannot back with a source.
