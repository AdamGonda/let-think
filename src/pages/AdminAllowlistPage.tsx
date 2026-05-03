import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { Navigate } from "@tanstack/react-router";
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
  const [emailInput, setEmailInput] = useState("");
  const [allowlistError, setAllowlistError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [emailSendInput, setEmailSendInput] = useState("");
  const [firstNameInput, setFirstNameInput] = useState("");
  const [emailSendError, setEmailSendError] = useState<string | null>(null);
  const [emailSendSuccess, setEmailSendSuccess] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

    </div>
  );
}
