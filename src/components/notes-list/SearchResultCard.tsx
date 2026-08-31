import { clsx } from "clsx";
import { CornerRippleBackdrop } from "@/components/ui/corner-ripple-backdrop";
import {
  searchHitKindLabel,
  searchHitReasonLabel,
  splitHighlightParts,
  type WorkspaceSearchHit,
} from "@/lib/searchHits";

type SearchResultCardProps = {
  hit: WorkspaceSearchHit;
  onOpen: (hit: WorkspaceSearchHit) => void;
};

function HighlightedText({
  text,
  terms,
  className,
}: {
  text: string;
  terms: string[];
  className?: string;
}) {
  const parts = splitHighlightParts(text, terms);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="bg-transparent p-0 font-medium text-foreground underline decoration-foreground/35 underline-offset-2"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export function SearchResultCard({ hit, onOpen }: SearchResultCardProps) {
  const terms = hit.reason === "contains" ? hit.matchedTerms : [];
  return (
    <div className="group relative overflow-hidden rounded-xl border-2 border-border/90 transition-[border-color,background-color] duration-150">
      <CornerRippleBackdrop />
      <button
        type="button"
        onClick={() => onOpen(hit)}
        className="relative z-10 flex min-h-30 w-full cursor-pointer flex-col gap-2 rounded-[inherit] bg-transparent p-5 text-left shadow-none transition-colors hover:bg-muted/10 active:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
          {searchHitKindLabel(hit.kind)}
          <span className="normal-case tracking-normal font-normal">
            {" · "}
            {searchHitReasonLabel(hit.reason, hit.matchedTerms)}
          </span>
        </span>
        <HighlightedText
          text={hit.title}
          terms={terms}
          className="min-w-0 font-semibold text-foreground leading-snug line-clamp-2"
        />
        {hit.snippet ? (
          <HighlightedText
            text={hit.snippet}
            terms={terms}
            className="m-0 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
          />
        ) : null}
        <span
          className={clsx(
            "mt-auto inline-flex h-7 w-fit items-center px-2 text-sm font-normal text-muted-foreground/90",
            "opacity-0 transition-opacity duration-200 ease-out",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "[@media(hover:none)]:opacity-100",
          )}
        >
          Open
        </span>
      </button>
    </div>
  );
}
