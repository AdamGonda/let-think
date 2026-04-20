import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const demoVideoSrc = import.meta.env.VITE_PRODUCT_DEMO_VIDEO_URL?.trim() ?? "";
const demoPosterSrc =
  import.meta.env.VITE_PRODUCT_DEMO_VIDEO_POSTER_URL?.trim() ?? "";

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

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h1 className="text-balance text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
              where you let yourself
              <br />
              think effortlessly
            </h1>
            <h2 className="mx-auto mt-3 max-w-md text-pretty text-lg font-medium leading-snug text-foreground sm:mt-4 sm:text-xl">
              zen mode by default
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:mt-3 sm:text-lg">
              For those who want pure ideas, not sycophantic flattery.
            </p>
          </div>

          <section className="mt-6 sm:mt-7" aria-label="Product demo video">
            {/*
              Self-hosted file: set VITE_PRODUCT_DEMO_VIDEO_URL (e.g. /demo.mp4 in public/)
              and optionally VITE_PRODUCT_DEMO_VIDEO_POSTER_URL for a still frame.

              Why these attributes: preload="none" avoids fetching until play (LCP).
              poster shows a static image without decoding video. playsInline keeps
              playback inline on iOS. Fixed aspect-video prevents CLS.

              For YouTube/Vimeo: do not embed the iframe in initial HTML; use a
              thumbnail + play button and inject the iframe on first click so third-party
              scripts and streams do not run until the user asks.
            */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-sm">
              {demoVideoSrc ? (
                <video
                  className="absolute inset-0 size-full object-cover"
                  controls
                  playsInline
                  preload="none"
                  poster={demoPosterSrc || undefined}
                >
                  <source src={demoVideoSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground/70">
                    Product demo video
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
