export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="mb-6 text-4xl font-bold">Terms of Service</h1>

      <div className="space-y-6 text-muted-foreground">
        <p className="leading-relaxed">
          By using GigVorx, you agree to use the platform responsibly and in
          accordance with applicable laws.
        </p>

        <p className="leading-relaxed">
          GigVorx is provided to help freelancers, agencies, and digital service
          providers manage client briefs, leads, invoices, follow-ups, and related
          workspace records.
        </p>

        <p className="leading-relaxed">
          New users may receive a 7-day free trial. After the trial ends, continued
          access to paid features may require upgrading to an active paid plan.
        </p>

        <p className="leading-relaxed">
          You are responsible for the accuracy of your client information, brief
          content, invoice details, payment requests, and any messages sent through
          or created using GigVorx.
        </p>

        <p className="leading-relaxed">
          GigVorx is provided as-is. We may update, improve, limit, or discontinue
          parts of the service as the product evolves.
        </p>

        <p className="leading-relaxed">
          We may update these terms from time to time. For questions, contact{" "}
          <a href="mailto:support@gigvorx.com" className="text-foreground underline">
            support@gigvorx.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}