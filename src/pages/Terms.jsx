import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'

export default function Terms() {
  return (
    <>
      <PageSeo
        title="Terms of Use | AltiusNxt"
        description="The terms for using the AltiusNxt website, CatalogWiz and the free AI Readiness Report."
        keywords={['AltiusNxt terms of use', 'website terms', 'terms and conditions']}
        structuredData={[breadcrumb('/terms', 'Terms of Use')]}
      />
      <section className="hero3" style={{ paddingBottom: 48 }}>
        <div className="wrap">
          <h1 style={{ maxWidth: 720 }}>Terms of Use</h1>
          <p className="lede" style={{ maxWidth: 640 }}>
            These terms govern your use of the AltiusNxt website, the CatalogWiz Workbench and the
            free AI Readiness Report.
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="wrap measure legal-copy">
          <p>
            By accessing this website or requesting a report, you agree to these Terms of Use and to our{' '}
            <a href="/privacy-policy">Privacy Policy</a>. If you are using the site on behalf of a company,
            you confirm that you are authorised to accept these terms for that company.
          </p>

          <h2>1. Who we are</h2>
          <p>
            The website is operated by AltiusNxt Technologies Pvt. Ltd. ("AltiusNxt", "we", "us"), with
            offices in Farmington Hills, Michigan, USA and Coimbatore, Tamil Nadu, India.
          </p>

          <h2>2. The free AI Readiness Report</h2>
          <ul>
            <li>
              The report is generated from a product page URL you submit. We retrieve the publicly
              accessible content of that page, query AI assistants and search engines about the product,
              and compile the results into a scored report.
            </li>
            <li>
              The report is provided for information only. Scores, AI responses and competitor
              comparisons reflect what third-party AI and search services returned at the time of the
              scan; they can change and we do not guarantee their accuracy or completeness.
            </li>
            <li>
              You may only submit URLs for products that you sell or are authorised to assess. We may
              decline or limit requests that are abusive, automated or unrelated to a genuine product page.
            </li>
          </ul>

          <h2>3. Your information</h2>
          <p>
            Contact details you provide with a report request are used to deliver the report and to follow
            up about AltiusNxt services, as described in our Privacy Policy. We do not sell your information.
          </p>

          <h2>4. Intellectual property</h2>
          <p>
            The website design, text, graphics, the CatalogWiz Workbench and the report format are owned by
            AltiusNxt. Product content you submit remains yours. The report we generate for you is yours to
            use within your business; please do not resell or republish it as your own methodology.
          </p>

          <h2>5. Acceptable use</h2>
          <p>
            You agree not to interfere with the operation of the website, attempt unauthorised access to
            our systems, scrape the site at volume, or use the report service to assess competitors'
            products in a way that breaches their terms.
          </p>

          <h2>6. Third-party links and services</h2>
          <p>
            The site links to articles, events and partner platforms we do not control. We are not
            responsible for their content or terms. The report relies on third-party AI and search
            providers whose availability we do not control.
          </p>

          <h2>7. Disclaimer and limitation of liability</h2>
          <p>
            The website and the free report are provided "as is". To the fullest extent permitted by law,
            AltiusNxt is not liable for any loss arising from reliance on the website or a free report.
            Paid engagements are governed by the written agreement for that engagement, not by these terms.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update these terms from time to time. The current version is always published on this
            page; continued use of the site after a change constitutes acceptance.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these terms: <a href="mailto:sales@altiusnxt.com">sales@altiusnxt.com</a>
            {' '}· +1 313 486 9697 (US) · +91 9952317740 (India)
          </p>
        </div>
      </section>
    </>
  )
}
