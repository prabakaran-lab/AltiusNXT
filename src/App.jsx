import { Navigate, Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import BackToTop from './components/BackToTop.jsx'
import Motion from './components/Motion.jsx'
import Home from './pages/Home.jsx'
import CatalogWiz from './pages/CatalogWiz.jsx'
import AIReadinessReport from './pages/AIReadinessReport.jsx'
import AboutUs from './pages/AboutUs.jsx'
import Resources from './pages/Resources.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'
import Contact from './pages/Contact.jsx'
import Sitemap from './pages/Sitemap.jsx'
import SchemaStudio from './pages/SchemaStudio.jsx'
import AttributeLibrary from './pages/AttributeLibrary.jsx'
import ResourcesOverviewPage from './pages/resources/ResourcesOverviewPage.jsx'
import ResourceListingPage from './pages/resources/ResourceListingPage.jsx'
import ResourceDetailPage from './pages/resources/ResourceDetailPage.jsx'
import './components/resources/Resources.css'
import './components/resources/ResourceDetail.css'
import './components/resources/ContactBand.css'
import './buttons.css'
import './typography.css'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<Home />} />
          <Route path="/catalogwiz" element={<CatalogWiz />} />
          <Route path="/ai-readiness-report" element={<AIReadinessReport />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/why-altiusnxt" element={<Navigate to="/" replace />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/browse" element={<ResourcesOverviewPage />} />
          <Route path="/resources/events" element={<ResourceListingPage sectionKey="events" />} />
          <Route path="/resources/events/:slug" element={<ResourceDetailPage sectionKey="events" />} />
          <Route path="/resources/case-studies" element={<ResourceListingPage sectionKey="case-studies" />} />
          <Route path="/resources/case-studies/:slug" element={<ResourceDetailPage sectionKey="case-studies" />} />
          <Route path="/resources/blog" element={<ResourceListingPage sectionKey="blog" />} />
          <Route path="/resources/blog/:slug" element={<ResourceDetailPage sectionKey="blog" />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/ai-page-check" element={<Navigate to="/catalogwiz#try" replace />} />
          <Route path="/ai-readability" element={<Navigate to="/catalogwiz#try" replace />} />
          <Route path="/product-schema-markup" element={<SchemaStudio />} />
          <Route path="/product-schema-builder" element={<Navigate to="/product-schema-markup" replace />} />
          <Route path="/schema-studio" element={<Navigate to="/product-schema-markup" replace />} />
          <Route path="/category-attributes" element={<AttributeLibrary />} />
          <Route path="/attribute-library" element={<Navigate to="/category-attributes" replace />} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
      <Motion />
    </>
  )
}
