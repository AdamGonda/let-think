import { Link } from "@tanstack/react-router";
import {
  FolderKanban,
  MessageSquare,
  Network,
  FileText,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Projects & sessions",
    description:
      "Group work into projects and spin up focused sessions so context stays where you need it—not scattered across tabs.",
    icon: FolderKanban,
  },
  {
    title: "AI that follows the thread",
    description:
      "Chat alongside your notes with history you can revisit. Pick up exactly where you left off on hard problems.",
    icon: MessageSquare,
  },
  {
    title: "Notes that stay readable",
    description:
      "Capture ideas in markdown with an editor built for long-form thinking, not disposable snippets.",
    icon: FileText,
  },
  {
    title: "Concept graph",
    description:
      "See how ideas connect instead of losing them in a flat list—built for synthesis, not just storage.",
    icon: Network,
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background sign-in-bg text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            LET THINK
          </span>
          <Link
            to="/login"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl md:text-7xl">
            we let you think
            <br />
            with ideas efortlessly
          </h1>
          <h2 className="mt-8 text-pretty text-2xl leading-tight font-medium text-foreground sm:text-3xl">
            The clutter free AI helper
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-2xl">
            For those who want pure ideas rather than scan for them in sycophantic flattery
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full min-w-[200px] justify-center sm:w-auto"
              )}
            >
              Get started
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full min-w-[200px] justify-center border-border/80 sm:w-auto"
              )}
            >
              Sign in with Google
            </Link>
          </div>
        </div>

        <ul className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-2">
          {features.map(({ title, description, icon: Icon }) => (
            <li
              key={title}
              className="rounded-xl border border-border/60 bg-card/60 p-6 shadow-sm"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted/80">
                <Icon className="size-5 text-foreground" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
