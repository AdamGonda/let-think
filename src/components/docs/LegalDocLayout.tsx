import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/marketing/SiteFooter";

type LegalDocLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalDocLayout({
  title,
  lastUpdated,
  children,
}: LegalDocLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background sign-in-bg text-foreground">
      <header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            LET THINK
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs text-muted-foreground">Last updated {lastUpdated}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
