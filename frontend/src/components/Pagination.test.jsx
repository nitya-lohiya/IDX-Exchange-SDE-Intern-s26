import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";
import { getPageNumbers } from "../utils/pagination";

describe("getPageNumbers (page number generation logic)", () => {
  it("returns every page when there are 7 or fewer", () => {
    expect(getPageNumbers({ currentPage: 1, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers({ currentPage: 3, totalPages: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("adds a right ellipsis when current page is near the start", () => {
    expect(getPageNumbers({ currentPage: 2, totalPages: 24 })).toEqual([
      1, 2, 3, 4, 5, "ellipsis", 24,
    ]);
  });

  it("adds a left ellipsis when current page is near the end", () => {
    expect(getPageNumbers({ currentPage: 23, totalPages: 24 })).toEqual([
      1, "ellipsis", 20, 21, 22, 23, 24,
    ]);
  });

  it("adds two ellipses when current page is in the middle", () => {
    expect(getPageNumbers({ currentPage: 12, totalPages: 24 })).toEqual([
      1, "ellipsis", 11, 12, 13, "ellipsis", 24,
    ]);
  });

  it("never produces duplicate page numbers (regression: '1 ... 2 3 4 ... 1' bug)", () => {
    for (let cp = 1; cp <= 24; cp += 1) {
      const pages = getPageNumbers({ currentPage: cp, totalPages: 24 });
      const numbers = pages.filter((p) => p !== "ellipsis");
      const unique = new Set(numbers);
      expect(unique.size).toBe(numbers.length);
    }
  });
});

describe("Pagination component", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on the first page and enables Next", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("disables Next on the last page and enables Previous", () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("both nav buttons enabled on a middle page", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("marks the current page button as aria-current='page'", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "2" })).not.toHaveAttribute("aria-current");
  });

  it("calls onPageChange with the clicked page number", () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("Previous decrements the page and Next increments it", () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
  });

  it("renders ellipsis characters when needed", () => {
    render(<Pagination currentPage={12} totalPages={24} onPageChange={vi.fn()} />);
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBe(2);
  });
});
