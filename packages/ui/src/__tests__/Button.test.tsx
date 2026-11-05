import { Button } from "@nearcommerce/ui/src/index";
import { render, screen } from "@testing-library/react";

describe("Button", () => {
  it("grows when its label has to wrap, instead of spilling out of a fixed height", () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
      </>,
    );
    const sm = screen.getByRole("button", { name: "Small" });
    const md = screen.getByRole("button", { name: "Medium" });

    // A minimum height: one-line labels look the same as before, longer ones make it taller.
    expect(sm).toHaveClass("min-h-8");
    expect(md).toHaveClass("min-h-10");
    expect(sm.className).not.toMatch(/(^|\s)h-\d/);
    expect(md.className).not.toMatch(/(^|\s)h-\d/);
    // With padding and centred text, so a two-line label is not jammed against the edges.
    expect(sm).toHaveClass("py-1.5", "text-center");
    expect(md).toHaveClass("py-2", "text-center");
  });

  it("is disabled and marked busy while loading", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: /Save/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
