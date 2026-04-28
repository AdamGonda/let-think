export type TransactionalEmailContent = {
  subject: string;
  text: string;
  html: string;
};

type AllowlistApprovedTemplateInput = {
  appUrl: string;
  firstName: string;
};

function normalizeAppUrl(appUrl: string): string {
  const trimmed = appUrl.trim();
  if (!trimmed) {
    throw new Error("Missing app URL for transactional emails");
  }
  return trimmed.replace(/\/+$/, "");
}

export function buildAllowlistApprovedTemplate(
  input: AllowlistApprovedTemplateInput
): TransactionalEmailContent {
  const appUrl = normalizeAppUrl(input.appUrl);
  const logoUrl = `${appUrl}/lt-logo.png`;
  const signInUrl = "https://letthink.co/app";
  const firstName = input.firstName.trim() || "there";
  const plainTextBody = [
    `Hi ${firstName},`,
    "",
    "You've been selected for LET THINK beta access.",
    "",
    "Out of everyone who applied, you're one of the 20 people we're inviting into the beta. We chose carefully — and we chose you.",
    "",
    "This is early, intentional access to a tool designed for one thing: pure ideas, no sycophantic flattery. No noise. Just thinking.",
    "",
    `Open LET THINK: ${signInUrl}`,
    "",
    "We'd love your honest feedback. Tell us what breaks, what surprises you, and what makes you think differently.",
    "",
    "Only 20 beta spots. Early access closes as they are filled.",
  ].join("\n");

  return {
    subject: "You're in — LET THINK Beta",
    text: plainTextBody,
    html: `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
  <div style="margin: 0 0 16px 0;">
    <img src="${logoUrl}" alt="LET THINK" width="140" style="display: block; height: auto; border: 0;" />
  </div>
  <div style="white-space: pre-line;">${plainTextBody}</div>
</div>`,
  };
}
