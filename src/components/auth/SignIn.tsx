import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { LogIn, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function SignIn() {
  const { signIn } = useAuthActions();
  const posthog = usePostHog();

  return (
    <div className="flex min-h-screen flex-col bg-background sign-in-bg text-foreground">
      <header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            LET THINK
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="relative w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-40 blur-xl dark:from-white/5"
            aria-hidden
          />
          <Card
            cornerRipple
            className="relative border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm"
          >
            <CardHeader className="space-y-3 px-6 pb-0 pt-6 text-center sm:px-8 sm:pt-8">
              <p className="inline-flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden />
                Secure sign-in
              </p>
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/80 ring-1 ring-border/60">
                <LogIn className="size-6 text-foreground" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Beta access sign-in
                </h1>
                <CardDescription className="mt-3 text-base leading-relaxed">
                  Only Google accounts approved for the beta can continue. If your
                  account is not approved yet,{" "}
                  <a
                    href="https://tally.so/r/D4v9jE"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                  >
                    apply for beta access
                  </a>{" "}
                  and come back after confirmation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 px-6 pb-8 pt-2 sm:px-8">
              <Button
                className="h-11 w-full gap-3 text-[0.95rem] shadow-sm"
                onClick={() => {
                  posthog.capture("sign_in_clicked", { provider: "google" });
                  void signIn("google", { redirectTo: "/app" });
                }}
              >
                <GoogleGlyph className="size-5" />
                Sign in with Google
              </Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                We use Google for sign-in only—no extra password to remember. By
                continuing you agree to our{" "}
                <Link
                  to="/terms"
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Terms of use
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                >
                  Data policy
                </Link>
                , and to access your Let Think data tied to that account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
