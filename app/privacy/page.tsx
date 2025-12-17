export default function PrivacyPolicyPage() {
  return (
    <main className="bg-[#2B2B2B] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Title */}
        <h1 className="mb-6 text-center text-4xl font-extrabold tracking-wide">
          Privacy Policy
        </h1>

        {/* Intro */}
        <div className="space-y-4 text-sm leading-relaxed text-gray-300">
          <p>
            Dream Trip Club operates the DreamTripClub.com website, which provides the Service.
          </p>
          <p>
            This page informs visitors of our policies regarding the collection, use, and disclosure of personal
            information for anyone using our Service.
          </p>
          <p>
            By using the Service, you agree to the collection and use of information in accordance with this policy. We
            only use your information to provide and improve the Service and will not share your information with
            anyone, except as described in this Privacy Policy.
          </p>
        </div>

        <Section title="Information Collection and Use">
          <p>
            For a better experience, we may ask you to provide certain personally identifiable information, such as your
            name, phone number, and postal address. The information we request will be used to contact or identify you.
          </p>
        </Section>

        <Section title="Log Data">
          <p>
            When you visit our Service, we collect information that your browser sends to us (&quot;Log Data&quot;). This
            may include your IP address, browser version, pages visited, time and date of your visit, time spent on
            pages, and other statistics.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Cookies are files with small amounts of data that are commonly used as anonymous unique identifiers. They
            are sent to your browser from the websites you visit and stored on your device.
          </p>
          <p className="mt-3">
            We use cookies to improve your experience. You can choose to accept or refuse cookies. If you refuse
            cookies, some portions of the Service may not function properly.
          </p>
        </Section>

        <Section title="Service Providers">
          <p>We may employ third-party companies and individuals to:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-300">
            <li>Facilitate our Service</li>
            <li>Provide the Service on our behalf</li>
            <li>Perform Service-related services</li>
            <li>Analyze how our Service is used</li>
          </ul>
          <p className="mt-4">
            These third parties may have access to your personal information only to perform tasks on our behalf and are
            obligated not to disclose or use it for any other purpose.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We value your trust in providing your personal information and strive to use commercially acceptable means
            of protecting it. However, remember that no method of transmission over the internet or method of electronic
            storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="Links to Other Sites">
          <p>
            Our Service may contain links to other sites that are not operated by us. If you click a third-party link,
            you will be directed to that third party’s site. We strongly advise you to review the Privacy Policy of any
            website you visit.
          </p>
          <p className="mt-3">
            We have no control over and assume no responsibility for the content, privacy policies, or practices of any
            third-party sites or services.
          </p>
        </Section>

        <Section title="Children’s Privacy">
          <p>
            Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable
            information from children under 13. If we discover that a child under 13 has provided us with personal
            information, we will delete it. If you are a parent or guardian and you believe your child has provided us
            information, please contact us immediately.
          </p>
        </Section>

        <Section title="Changes to This Privacy Policy">
          <p>
            We may update our Privacy Policy from time to time. We will post any changes on this page. Changes are
            effective immediately after they are posted here.
          </p>
        </Section>

        <Section title="Contact Us">
          <p className="mb-4">Have questions or suggestions?</p>
          <ul className="space-y-2 text-gray-300">
            <li>Email: privacy@dreamtripclub.com</li>
            <li>Address: 701 Rossland Rd E, Whitby, ON L1N 9K3</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-2xl font-extrabold">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}
