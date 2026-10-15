import HomeHero from '../components/HomeHero.jsx'
import Walkthrough from '../components/walkthrough/Walkthrough.jsx'
import DataContrast from '../components/contrast/DataContrast.jsx'
import HomeTrust from '../components/trust/HomeTrust.jsx'
import BeforeAfter from '../components/beforeafter/BeforeAfter.jsx'
import WhoItsFor from '../components/audience/WhoItsFor.jsx'
import Industries from '../components/industries/Industries.jsx'
import WhereFits from '../components/stack/WhereFits.jsx'
import HowWeWork from '../components/process/HowWeWork.jsx'
import AiLayers from '../components/layers/AiLayers.jsx'
import ReadinessDemo from '../components/readiness/ReadinessDemo.jsx'
import ReadinessChecklist from '../components/checklist/ReadinessChecklist.jsx'
import TrustBand from '../components/security/TrustBand.jsx'
import ContentHub from '../components/ContentHub.jsx'
import HomeFaq from '../components/HomeFaq.jsx'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'
import './HomeRefinement.css'
import './HomePolish.css'
import './HomeHeroCentered.css'
import './HomeSystem.css'

/* Home page story, top to bottom. Sections alternate white / light grey (see HomeSystem.css).
   01 Hero              promise
   02 Walkthrough       how CatalogWiz works (id="catalogwiz")
   03 Data contrast     the problem: same product, different data
   04 Logos             who trusts us
   05 Before / after    the result on a real product page
   06 Who it is for     manufacturers, distributors, ecommerce teams
   07 Industries        categories covered
   08 Where it fits     plugs into your PIM / ERP / channels
   09 How we work       three steps to start
   10 AI Readiness      the free report (id="ai-readiness")
   11 Self-check        interactive lead magnet
   12 Trust & security  ISO badges, human sign-off
   13 Content hub       case studies and insights
   14 FAQ               remaining doubts
   Footer carries the closing call to action. */
export default function Home() {
  return (
    <div className="home-page">
      <PageSeo
        title="Industrial Product Data Enrichment & AI Search | AltiusNxt"
        description="Product data engineers enrich and verify industrial catalogs value by value, then test them on ChatGPT, Gemini, Perplexity and Google. Free AI Readiness Report."
        keywords={['industrial product data enrichment', 'product data enrichment services', 'product data enrichment for distributors', 'catalog enrichment', 'AI search visibility', 'human-in-the-loop product data', 'MRO product data']}
        structuredData={[breadcrumb('/', 'AI-Powered Product Data Enrichment')]}
      />
      <HomeHero />
      <Walkthrough />
      <DataContrast />
      <HomeTrust />
      <BeforeAfter />
      <WhoItsFor />
      <Industries />
      <HowWeWork />
      <WhereFits />
      <AiLayers />
      <ReadinessDemo />
      <ReadinessChecklist />
      <TrustBand />
      <ContentHub />
      <HomeFaq />
    </div>
  )
}
