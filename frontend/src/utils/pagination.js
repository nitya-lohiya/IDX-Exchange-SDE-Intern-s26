/**
 * Which page numbers to render, with "ellipsis" markers standing in for the
 * gaps. Kept out of the component file so Pagination.jsx only exports a
 * component (that is what React Fast Refresh needs) and so the logic can be
 * unit tested on its own.
 */
export function getPageNumbers({ currentPage, totalPages }) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const showLeftEllipsis = currentPage > 4;
  const showRightEllipsis = currentPage < totalPages - 3;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

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
