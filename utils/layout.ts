export type LayoutEventLike =
  | {
      nativeEvent?: {
        layout?: {
          y?: number | null;
        } | null;
      } | null;
    }
  | null
  | undefined;

export function getLayoutYOffset(event: LayoutEventLike): number | null {
  const y = event?.nativeEvent?.layout?.y;

  return typeof y === 'number' && Number.isFinite(y) ? y : null;
}
