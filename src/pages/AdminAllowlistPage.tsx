import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { Navigate } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminAllowlistPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const data = useQuery(api.admin.getWhitelist);
  const addAllowedEmail = useMutation(api.admin.addAllowedEmail);
  const removeAllowedEmail = useMutation(api.admin.removeAllowedEmail);
  const sendAllowlistApprovedEmail = useAction(
    api.transactionalEmails.sendAllowlistApprovedEmailFromAdmin
  );
  const sendCustomEmail = useAction(
    api.transactionalEmails.sendCustomEmailFromAdmin
  );
  const [emailInput, setEmailInput] = useState("");
  const [allowlistError, setAllowlistError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [emailSendInput, setEmailSendInput] = useState("");
  const [firstNameInput, setFirstNameInput] = useState("");
  const [emailSendError, setEmailSendError] = useState<string | null>(null);
  const [emailSendSuccess, setEmailSendSuccess] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [customTo, setCustomTo] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [customSuccess, setCustomSuccess] = useState<string | null>(null);
  const [isSendingCustom, setIsSendingCustom] = useState(false);

  const sortedEntries = useMemo(() => data?.entries ?? [], [data?.entries]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setAllowlistError("Enter an email to add.");
      return;
    }
    setIsAdding(true);
    setAllowlistError(null);
    try {
      await addAllowedEmail({ email });
      setEmailInput("");
    } catch (submissionError) {
      setAllowlistError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to add email."
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function onRemove(entryId: Id<"betaAllowlist">) {
    setAllowlistError(null);
    try {
      await removeAllowedEmail({ entryId });
    } catch (removeError) {
      setAllowlistError(
        removeError instanceof Error ? removeError.message : "Failed to remove email."
      );
    }
  }

  async function onSendCustomEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const to = customTo.trim();
    const subject = customSubject.trim();
    const body = customBody.trim();
    if (!to) {
      setCustomError("Enter at least one recipient email.");
      return;
    }
    if (!subject) {
      setCustomError("Enter a subject.");
      return;
    }
    if (!body) {
      setCustomError("Email body is empty.");
      return;
    }

    setIsSendingCustom(true);
    setCustomError(null);
    setCustomSuccess(null);
    try {
      const result = await sendCustomEmail({
        to,
        subject,
        bodyMarkdown: body,
      });
      setCustomSuccess(
        `Sent to ${result.sentCount} recipient${result.sentCount === 1 ? "" : "s"}.`
      );
    } catch (sendError) {
      setCustomError(
        sendError instanceof Error ? sendError.message : "Failed to send email."
      );
    } finally {
      setIsSendingCustom(false);
    }
  }

  function fillRecipientsFromAllowlist() {
    setCustomTo(sortedEntries.map((entry) => entry.email).join(", "));
  }

  async function onSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailSendInput.trim().toLowerCase();
    const firstName = firstNameInput.trim();
    if (!email) {
      setEmailSendError("Enter the recipient email.");
      return;
    }
    if (!firstName) {
      setEmailSendError("Enter the recipient first name.");
      return;
    }

    setIsSendingEmail(true);
    setEmailSendError(null);
    setEmailSendSuccess(null);
    try {
      await sendAllowlistApprovedEmail({ email, firstName });
      setEmailSendSuccess(`Sent allowlist email to ${email}.`);
    } catch (sendError) {
      setEmailSendError(
        sendError instanceof Error ? sendError.message : "Failed to send email."
      );
    } finally {
      setIsSendingEmail(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading admin…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/app" />;
  }

  if (data === undefined) {
    return <div className="p-8 text-center text-muted-foreground">Loading allowlist…</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Beta Allowlist Admin</h1>
          <CardDescription>
            Signed in as {data.adminEmail}. Only allowlisted users can register and log in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" onSubmit={onSubmit}>
            <Input
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="name@example.com"
              type="email"
            />
            <Button type="submit" disabled={isAdding}>
              Add
            </Button>
          </form>
          {allowlistError ? <p className="text-sm text-destructive">{allowlistError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Allowed Emails</h2>
          <CardDescription>{sortedEntries.length} accounts approved for beta access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails are allowlisted yet.</p>
          ) : (
            sortedEntries.map((entry: { _id: Id<"betaAllowlist">; email: string }) => (
              <div
                key={entry._id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm">{entry.email}</span>
                <Button variant="outline" size="sm" onClick={() => void onRemove(entry._id)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Send Beta Email</h2>
          <CardDescription>
            Send the allowlist approval email manually with a recipient name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-2" onSubmit={onSendEmail}>
            <Input
              value={firstNameInput}
              onChange={(event) => setFirstNameInput(event.target.value)}
              placeholder="First name"
            />
            <div className="flex gap-2">
              <Input
                value={emailSendInput}
                onChange={(event) => setEmailSendInput(event.target.value)}
                placeholder="name@example.com"
                type="email"
              />
              <Button type="submit" disabled={isSendingEmail}>
                Send Email
              </Button>
            </div>
          </form>
          {emailSendError ? <p className="text-sm text-destructive">{emailSendError}</p> : null}
          {emailSendSuccess ? (
            <p className="text-sm text-emerald-500">{emailSendSuccess}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Send Custom Email</h2>
          <CardDescription>
            Compose a one-off email in markdown and send it to any users. Use
            commas, semicolons or newlines to separate multiple recipients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onSendCustomEmail}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="custom-to">
                  Recipients
                </label>
                {sortedEntries.length > 0 ? (
                  <button
                    type="button"
                    onClick={fillRecipientsFromAllowlist}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Fill from allowlist ({sortedEntries.length})
                  </button>
                ) : null}
              </div>
              <Input
                id="custom-to"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                placeholder="alice@example.com, bob@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="custom-subject">
                Subject
              </label>
              <Input
                id="custom-subject"
                value={customSubject}
                onChange={(event) => setCustomSubject(event.target.value)}
                placeholder="Subject line"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Body (markdown)
              </label>
              <div data-color-mode="dark" className="rounded-lg overflow-hidden border border-input">
                <MDEditor
                  value={customBody}
                  onChange={(value) => setCustomBody(value ?? "")}
                  height={320}
                  preview="live"
                  visibleDragbar={false}
                  textareaProps={{
                    placeholder:
                      "Hi {name},\n\nWrite your message here. **Markdown** is supported — _italics_, [links](https://letthink.co), lists, and headings all render in the email.",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your message is wrapped with the LET THINK logo. Plain-text
                fallback uses the raw markdown.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              {customError ? (
                <p className="text-sm text-destructive">{customError}</p>
              ) : customSuccess ? (
                <p className="text-sm text-emerald-500">{customSuccess}</p>
              ) : null}
              <Button type="submit" disabled={isSendingCustom}>
                {isSendingCustom ? "Sending…" : "Send Email"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
