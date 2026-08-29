/** Overlay thumb size/offset. null when the note doesn’t overflow. */
export function editorScrollThumbLayout(
  clientHeight: number,
  scrollHeight: number,
  scrollTop: number,
): { height: number; top: number } | null {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 1) return null;
  const height = Math.max(48, (clientHeight / scrollHeight) * clientHeight);
  const top = (scrollTop / maxScroll) * (clientHeight - height);
  return { height, top };
}
