import { marked } from "marked";

export type TransactionalEmailContent = {
  subject: string;
  text: string;
  html: string;
};

type AllowlistApprovedTemplateInput = {
  firstName: string;
};

type CustomEmailTemplateInput = {
  subject: string;
  bodyMarkdown: string;
};

const LOGO_URL = "https://letthink.co/lt-logo.png";

function wrapHtmlBody(innerHtml: string): string {
  return `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827; max-width: 600px;">
  <div style="margin: 0 0 16px 0;">
    <img src="${LOGO_URL}" alt="LET THINK" width="140" style="display: block; height: auto; border: 0;" />
  </div>
  ${innerHtml}
</div>`;
}

export function buildAllowlistApprovedTemplate(
  input: AllowlistApprovedTemplateInput
): TransactionalEmailContent {
  const signInUrl = "https://letthink.co/app";
  const firstName = input.firstName.trim() || "there";
  const plainTextBody = [
    `Hi ${firstName},`,
    "",
    "You've been selected for LET THINK beta access.",
    "",
    "Out of everyone who applied, you're one of the 20 people we're inviting into the beta. We chose carefully — and we chose you.",
    "",
    "This is early, intentional access to a tool designed for one thing: pure ideas, no sycophantic flattery.",
    "",
    `Open LET THINK: ${signInUrl}`,
    "Join our Discord: https://discord.gg/FkKQDdRf",
    "",
    "We'd love your honest feedback. Tell us what breaks, what surprises you, and what makes you think differently.",
  ].join("\n");

  return {
    subject: "You're in — LET THINK Beta",
    text: plainTextBody,
    html: wrapHtmlBody(`<div style="white-space: pre-line;">${plainTextBody}</div>`),
  };
}

/**
 * Build a custom email from admin-authored markdown. The body is rendered as
 * HTML and wrapped in the branded shell; the plain-text version is the raw
 * markdown source so links and structure survive in text-only clients.
 */
export function buildCustomEmailTemplate(
  input: CustomEmailTemplateInput
): TransactionalEmailContent {
  const subject = input.subject.trim();
  if (!subject) {
    throw new Error("Subject is required");
  }
  const bodyMarkdown = input.bodyMarkdown.trim();
  if (!bodyMarkdown) {
    throw new Error("Email body is required");
  }

  const rendered = marked.parse(bodyMarkdown, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;

  return {
    subject,
    text: bodyMarkdown,
    html: wrapHtmlBody(rendered),
  };
}
