import { Link } from "@tanstack/react-router";
import { LegalDocLayout } from "@/components/docs/LegalDocLayout";

export function TermsOfUsePage() {
  return (
    <LegalDocLayout title="Terms of use" lastUpdated="April 19, 2026">
      <p>
        These terms govern your use of let-think. Replace this placeholder with
        terms reviewed by your counsel before production use.
      </p>
      <h2>Using the service</h2>
      <p>
        You agree to use let-think only in compliance with applicable law and not to
        misuse the product (for example by attempting to disrupt, scrape, or gain
        unauthorized access).
      </p>
      <h2>Your account</h2>
      <p>
        You are responsible for activity under your account. Sign-in via Google is
        subject to Google’s terms and your relationship with them.
      </p>
      <h2>Changes & termination</h2>
      <p>
        We may update the service or these terms; describe notice and effective
        dates here. Either party may terminate as you define (e.g. closing an
        account).
      </p>
      <h2>Disclaimer & liability</h2>
      <p>
        Add your warranty disclaimer, limitation of liability, and governing law
        as appropriate for your jurisdiction.
      </p>
      <h2>Related</h2>
      <p>
        See also our{" "}
        <Link to="/privacy" className="font-medium">
          Data policy
        </Link>{" "}
        for how we handle information.
      </p>
    </LegalDocLayout>
  );
}
