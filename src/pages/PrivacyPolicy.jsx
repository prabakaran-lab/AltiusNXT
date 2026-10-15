import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'

export default function PrivacyPolicy() {
  return (
    <>
      <PageSeo
        title="Privacy Policy | AltiusNxt"
        description="How AltiusNxt collects, uses and protects your personal information when you use our website, CatalogWiz and the AI Readiness Report."
        keywords={['AltiusNxt privacy policy', 'data protection', 'personal information']}
        structuredData={[breadcrumb('/privacy-policy', 'Privacy Policy')]}
      />
      <section className="hero3" style={{ paddingBottom: 48 }}>
        <div className="wrap">
          <h1 style={{ maxWidth: 720 }}>Privacy Policy</h1>
          <p className="lede" style={{ maxWidth: 640 }}>
            Effective Date: September 19, 2024 · Last Updated: March 16, 2025
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="wrap measure legal-copy">
          <p>
            This Privacy Policy describes how AltiusNxt Technologies Pvt. Ltd. ("AltiusNxt", "we", "us" or
            "our") collects, uses and protects information in connection with our eCommerce data enrichment
            and PIM (Product Information Management) solutions. We operate under India's Digital Personal
            Data Protection Act, 2023, in alignment with the Information Technology Act, 2000, and with
            reference to GDPR principles for our international clients.
          </p>

          <h2>1. Purpose and Governance</h2>
          <p>
            AltiusNxt operates as an eCommerce data enrichment and PIM solutions provider. This policy
            governs how we handle personal data collected through our website, our products (including the
            CatalogWiz Workbench and the AI Readiness Report), and in the course of delivering our services.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul>
            <li><strong>Professional data</strong> — names, job titles, work email addresses and project details you share with us.</li>
            <li><strong>Technical data</strong> — IP addresses, device identifiers and cookies.</li>
            <li><strong>Usage data</strong> — website navigation patterns and session duration.</li>
          </ul>
          <p>
            We do not knowingly collect financial credentials, health records, biometric information, or
            data from minors without parental authorization.
          </p>

          <h2>3. Legal Grounds for Processing</h2>
          <p>We process personal data under the following legal grounds:</p>
          <ul>
            <li><strong>Consent</strong> — for newsletters and analytics.</li>
            <li><strong>Contractual obligations</strong> — to deliver the services you've engaged us for.</li>
            <li><strong>Legal compliance</strong> — for tax and audit requirements.</li>
            <li><strong>Legitimate interests</strong> — including fraud prevention.</li>
          </ul>

          <h2>4. Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We share data only with authorized service providers
            who support our operations, regulatory bodies when legally required, and business affiliates
            involved in delivering our services.
          </p>

          <h2>5. Data Security</h2>
          <p>
            AltiusNxt maintains ISO 9001:2015 and ISO/IEC 27001:2022 certifications issued by TÜV Austria. We
            implement AES-256 encryption, multi-factor authentication and regular vulnerability assessments
            to protect the data we hold.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You may access, correct or delete your personal data, withdraw consent, object to processing,
            and lodge a complaint with the relevant data protection authority. To exercise any of these
            rights, contact us at the details below.
          </p>

          <h2>7. International Data Transfers</h2>
          <p>
            We currently process all data within India. Any future cross-border transfers will implement
            the contractual safeguards prescribed under the DPDP Act.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            Our services are not designed for users under 18. If we inadvertently collect data from a minor,
            it is deleted within 48 hours of verification.
          </p>

          <h2>9. Policy Updates</h2>
          <p>
            We will provide 30 days' advance notice of material changes to this policy via email or on our
            website. Continued use of our services after that notice period constitutes acceptance.
          </p>

          <h2>10. Cookies and Tracking</h2>
          <p>
            We use cookies to enhance your experience on our website. You can manage cookie preferences
            through your browser settings.
          </p>

          <h2>Contact Us</h2>
          <p>
            <strong>US Headquarters</strong><br />
            31700 West Thirteen Mile Road, Suite 205, Farmington Hills, MI 48334<br />
            +1 313 486 9697
          </p>
          <p>
            <strong>India Office</strong><br />
            56-C, Bharathi Park, 2nd Cross, Saibaba Colony, Coimbatore, Tamil Nadu 641011<br />
            +91 9952317740 (sales) · +91 7708182828 (careers)
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:sales@altiusnxt.com">sales@altiusnxt.com</a>
          </p>
        </div>
      </section>
    </>
  )
}
