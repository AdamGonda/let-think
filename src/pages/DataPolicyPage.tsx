import { Link } from "@tanstack/react-router";
import { LegalDocLayout } from "@/components/LegalDocLayout";

export function DataPolicyPage() {
  return (
    <LegalDocLayout title="Data policy" lastUpdated="April 19, 2026">
      <p>
        This page describes how LET THINK (“we”, “us”) handles information when you
        use the service. Replace this placeholder with language reviewed by your
        counsel before production use.
      </p>
      <h2>What we collect</h2>
      <p>
        When you sign in with Google, we receive identifiers and profile details
        your identity provider shares with us (for example name, email, and
        profile image) as needed to create and secure your account.
      </p>
      <p>
        Content you create in LET THINK—such as projects, sessions, notes, and
        messages—may be stored to provide the product and to sync it across your
        devices.
      </p>
      <h2>How we use data</h2>
      <p>
        We use account and usage information to operate LET THINK, improve
        reliability and security, and communicate with you about the service.
      </p>
      <h2>Retention & deletion</h2>
      <p>
        Describe how long you retain data and how users can request deletion or
        export. Hook this up to your actual backend and support process.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy questions, add a contact email or form here. You may also
        want to reference your{" "}
        <Link to="/terms" className="font-medium">
          Terms of use
        </Link>
        .
      </p>
    </LegalDocLayout>
  );
}
