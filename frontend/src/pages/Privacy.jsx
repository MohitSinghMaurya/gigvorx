export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="mb-6 text-4xl font-bold">Privacy Policy</h1>

      <div className="space-y-6 text-muted-foreground">
        <p className="leading-relaxed">
          GigVorx respects your privacy. We do not sell your personal data to third
          parties.
        </p>

        <p className="leading-relaxed">
          We use your information to provide the GigVorx service, including account
          access, client records, briefs, invoices, trial status, plan limits, and
          product communication.
        </p>

        <p className="leading-relaxed">
          Your workspace data may include client names, emails, project details,
          brief responses, invoice details, and activity information needed to run
          the app.
        </p>

        <p className="leading-relaxed">
          We use trusted service providers such as hosting, database, authentication,
          analytics, and payment tools to operate GigVorx securely.
        </p>

        <p className="leading-relaxed">
          If you have privacy questions or need help with your data, contact us at{" "}
          <a href="mailto:support@gigvorx.com" className="text-foreground underline">
            support@gigvorx.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}