export default function TermsAndConditionsPage() {
  return (
    <main className="bg-[#2B2B2B] text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Title */}
        <h1 className="mb-6 text-center text-3xl font-extrabold tracking-wide">
          TERMS AND CONDITIONS
        </h1>

        {/* Intro */}
        <p className="mb-8 text-sm leading-relaxed text-gray-300">
          These Terms and Conditions ("Terms") govern the use of DreamTripClub.com
          (the "Site"), owned and operated by Dream Trip Club. By accessing or
          using this Site, you acknowledge that you have read, understood, and
          agree to be bound by these Terms at all times.
        </p>

        {/* Sections */}
        <Section title="Intellectual Property">
          <p>
            All content published and made available on this Site is the
            property of Dream Trip Club and its creators. This includes, but is
            not limited to, images, text, logos, documents, downloadable files,
            and anything that contributes to the composition of the Site.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree to use this Site lawfully and not to:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-300">
            <li>Harass or mistreat other users</li>
            <li>Violate the rights of other users</li>
            <li>Infringe intellectual property rights</li>
            <li>Hack or attempt to access other user accounts</li>
            <li>Engage in fraudulent or deceptive behavior</li>
            <li>Post inappropriate or offensive content</li>
          </ul>
          <p className="mt-4">
            We reserve the right to restrict or terminate access if misuse is
            detected.
          </p>
        </Section>

        <Section title="Accounts">
          <ol className="list-decimal space-y-3 pl-6 text-gray-300">
            <li>
              You are responsible for maintaining the security of your account
              and credentials.
            </li>
            <li>
              Information provided must be accurate and kept up to date.
            </li>
          </ol>
          <p className="mt-4">
            We reserve the right to suspend or terminate accounts that violate
            these Terms.
          </p>
        </Section>

        <Section title="Sale of Services">
          <p>
            These Terms govern all services offered on the Site, including but
            not limited to:
          </p>
          <ul className="mt-3 list-disc pl-6 text-gray-300">
            <li>Investor’s Growth Syndicate</li>
            <li>Dream Cottage Business Course</li>
            <li>Earn Profits Flipping Course</li>
          </ul>
          <p className="mt-4">
            Services are paid in full upon order. While we strive for accuracy,
            we do not guarantee that all descriptions or images are error-free.
          </p>
        </Section>

        <Section title="Subscriptions">
          <p>
            Subscriptions do not automatically renew. You will be notified
            before payment is due and must authorize continuation.
          </p>
          <p className="mt-3">Accepted payment methods include:</p>
          <ul className="mt-2 list-disc pl-6 text-gray-300">
            <li>Credit Card</li>
            <li>PayPal</li>
            <li>Debit</li>
          </ul>
        </Section>

        <Section title="Consumer Protection Law">
          <p>
            These Terms do not limit your rights under applicable consumer
            protection laws.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            Dream Trip Club, including its directors, officers, employees, and
            affiliates, is not liable for any damages arising from your use of
            the Site.
          </p>
        </Section>

        <Section title="Indemnity">
          <p>
            By using this Site, you agree to indemnify and hold harmless Dream
            Trip Club from any claims arising from your use or violation of
            these Terms.
          </p>
        </Section>

        <Section title="Applicable Law">
          <p>
            These Terms are governed by the laws of the Province of Ontario,
            Canada.
          </p>
        </Section>

        <Section title="Dispute Resolution">
          <p>
            Disputes will first attempt mediation, followed by arbitration if
            necessary. Small claims court remains available where applicable.
          </p>
        </Section>

        <Section title="Severability">
          <p>
            If any provision is deemed invalid, the remaining provisions will
            remain enforceable.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these Terms at any time. Changes will be communicated
            via email or posted on the Site.
          </p>
        </Section>

        <Section title="Contact Details">
          <ul className="space-y-2 text-gray-300">
            <li>Email: privacy@dreamtripclub.com</li>
            <li>Address: 701 Rossland Rd E, Whitby, ON L1N 9K3</li>
            <li>Or use the feedback form on the Site</li>
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
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}
