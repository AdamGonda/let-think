import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
          aria-label="Legal and policies"
        >
          <Link
            to="/terms"
            className="rounded-sm px-1 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Terms of use
          </Link>
          <span className="text-muted-foreground/60" aria-hidden>
            ·
          </span>
          <Link
            to="/privacy"
            className="rounded-sm px-1 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Data policy
          </Link>
        </nav>
        <p className="mt-4 text-[0.75rem] text-muted-foreground/90">
          © {year} let-think. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
