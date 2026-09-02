/**
 * Which page numbers to render, with "ellipsis" markers standing in for the
 * gaps. Kept out of the component file so Pagination.jsx only exports a
 * component (that is what React Fast Refresh needs) and so the logic can be
 * unit tested on its own.
 *
 * The whole function exists to keep the control at a CONSTANT WIDTH of 7 slots.
 * A pagination bar that grows and shrinks as you page through it makes the
 * buttons move under the user's cursor, so every branch below returns exactly
 * seven entries once there are more than seven pages.
 */

// First page + last page + current + one neighbour either side + two ellipses.
// Seven is the smallest width that fits all of those without the windows
// colliding, which is why it appears as the threshold and as every array length.
const WINDOW_SIZE = 7;

export function getPageNumbers({ currentPage, totalPages }) {
  // Few enough pages that they all fit — no ellipsis needed.
  if (totalPages <= WINDOW_SIZE) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // A left ellipsis only earns its place once it would hide more than one page.
  // At page 4 the run would be [1, …, 3, 4, 5] — the "…" would stand for page 2
  // alone, which is wider than just printing "2". Hence > 4, not >= 4.
  const showLeftEllipsis = currentPage > 4;
  // Mirror image at the end: with totalPages - 3, the right "…" always covers
  // at least two pages.
  const showRightEllipsis = currentPage < totalPages - 3;

  // Near the start: show a solid run from page 1, then jump to the last page.
  if (!showLeftEllipsis && showRightEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  // Near the end: jump from page 1 to a solid run finishing on the last page.
  if (showLeftEllipsis && !showRightEllipsis) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // Somewhere in the middle: anchor both ends and window around the current
  // page. Both ellipses are guaranteed to cover 2+ pages here, so this can
  // never emit a duplicate page number — the bug this shape was chosen to
  // avoid was "1 … 2 3 4 … 1" from naive slicing near the boundaries.
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}
