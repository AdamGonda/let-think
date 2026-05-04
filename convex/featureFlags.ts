function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

/**
 * Server-side feature flag for concept node embedding + vector upsert sync.
 *
 * Defaults to enabled to preserve current behavior.
 * Set `CONCEPT_EMBEDDINGS_SYNC_ENABLED=false` to disable.
 */
export function isConceptEmbeddingsSyncEnabled(): boolean {
  const raw = process.env.CONCEPT_EMBEDDINGS_SYNC_ENABLED;
  if (raw == null) return true;
  return isTruthyFlag(raw);
}
