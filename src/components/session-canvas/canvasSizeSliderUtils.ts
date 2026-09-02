export function sizeTaperPolygon(
  height: number,
  width: number,
  topWidth: number,
  bottomWidth: number,
): string {
  const cx = width / 2;
  return [
    `${cx - bottomWidth / 2},${height}`,
    `${cx - topWidth / 2},0`,
    `${cx + topWidth / 2},0`,
    `${cx + bottomWidth / 2},${height}`,
  ].join(" ");
}

/** Vertical-lr + rtl: max is at the top. */
export function sizeSliderThumbTop(
  value: number,
  min: number,
  max: number,
): string {
  const span = max - min;
  const t = span === 0 ? 0 : (max - value) / span;
  return `${t * 100}%`;
}
