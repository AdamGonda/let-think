import { Resend } from "resend";
import type { TransactionalEmailContent } from "./templates";

type SendTransactionalEmailInput = {
  to: string;
  content: TransactionalEmailContent;
};

function getRequiredEnvVar(name: "RESEND_API_KEY" | "RESEND_FROM_EMAIL"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<void> {
  const resend = new Resend(getRequiredEnvVar("RESEND_API_KEY"));
  const from = getRequiredEnvVar("RESEND_FROM_EMAIL");
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined;

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: input.content.subject,
    text: input.content.text,
    html: input.content.html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (result.error) {
    throw new Error(result.error.message || "Resend failed to send email");
  }
}
