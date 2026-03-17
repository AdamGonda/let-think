type SegmentItem =
  | { type: "segment"; subject: string; userInputs: string[] }
  | { type: "end" };

interface SegmentListProps {
  segments: SegmentItem[];
}

export function SegmentList({ segments }: SegmentListProps) {
  if (segments.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 py-2 px-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shrink-0"
      role="list"
      aria-label="Topic segments"
    >
      {segments.map((item, i) =>
        item.type === "end" ? (
          <span
            key={`end-${i}`}
            className="text-zinc-400 dark:text-zinc-500 text-sm"
            aria-hidden
          >
            |
          </span>
        ) : (
          <span
            key={`seg-${i}-${item.subject}`}
            className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600"
            role="listitem"
          >
            {item.subject}
          </span>
        )
      )}
    </div>
  );
}
