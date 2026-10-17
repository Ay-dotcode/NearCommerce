// How far (in pixels) a finger must travel sideways before it counts as a deliberate swipe.
export const SWIPE_OPEN_DISTANCE = 60;

// A swipe is "horizontal" when it moves clearly more sideways than up or down, so scrolling a
// list is never mistaken for it.
export const isHorizontalDrag = (dx: number, dy: number) =>
  Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 2;

// A finished drag that was long enough, in either direction, opens the settings drawer.
// (Dragging toward the left is the natural way to pull out a right-hand drawer.)
export const shouldOpenOnRelease = (dx: number, dy: number) =>
  isHorizontalDrag(dx, dy) && Math.abs(dx) >= SWIPE_OPEN_DISTANCE;
