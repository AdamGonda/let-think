/**
 * When batch count changes, pick the appropriate selected batch index.
 * Mirrors previous App.tsx effect behavior.
 */
export function nextBatchIndexAfterLengthChange(params: {
  prevLength: number;
  newLength: number;
  currentIndex: number;
}): number {
  const { prevLength, newLength, currentIndex } = params;
  if (newLength === 0) return currentIndex;
  if (newLength > prevLength) return newLength - 1;
  return Math.min(currentIndex, newLength - 1);
}
