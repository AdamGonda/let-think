export function MessageImageThumbs({
  urls,
  onRemove,
}: {
  urls: string[];
  onRemove?: (index: number) => void;
}) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="relative"
          data-testid="composer-image-chip"
        >
          <img
            src={url}
            alt=""
            className="h-16 w-16 rounded-md object-cover border border-border"
          />
          {onRemove ? (
            <button
              type="button"
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background border border-border text-xs leading-none"
              aria-label="Remove image"
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
