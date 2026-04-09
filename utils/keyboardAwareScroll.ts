const DEFAULT_EXTRA_OFFSET = 24;

export function getKeyboardAwareScrollTarget({
  currentScrollY,
  fieldTop,
  fieldHeight,
  containerTop,
  containerHeight,
  keyboardTop,
  extraOffset = DEFAULT_EXTRA_OFFSET
}: {
  currentScrollY: number;
  fieldTop: number;
  fieldHeight: number;
  containerTop: number;
  containerHeight: number;
  keyboardTop: number | null;
  extraOffset?: number;
}) {
  if (keyboardTop === null) {
    return null;
  }

  const containerBottom = containerTop + containerHeight;
  const visibleBottom = Math.min(containerBottom, keyboardTop) - extraOffset;
  const fieldBottom = fieldTop + fieldHeight;
  const overlap = fieldBottom - visibleBottom;

  if (overlap <= 0) {
    return null;
  }

  return Math.max(0, currentScrollY + overlap);
}
