import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonGroup } from "@nearcommerce/ui/src/index";

describe("Skeleton", () => {
  it("is hidden from assistive tech and carries the size classes it is given", () => {
    const { container } = render(<Skeleton className="h-10 w-10" />);
    const block = container.firstElementChild as HTMLElement;
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("h-10", "w-10");
  });

  it("groups blocks into one busy status region without any visible loading text", () => {
    render(
      <SkeletonGroup label="Inventory">
        <Skeleton className="h-4" />
      </SkeletonGroup>,
    );
    const region = screen.getByRole("status", { name: "Inventory" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region.textContent).toBe("");
  });
});
