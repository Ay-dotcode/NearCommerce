import { fireEvent, render, screen } from "@testing-library/react";
import { Drawer } from "@nearcommerce/ui/src/index";

describe("Drawer", () => {
  it("renders nothing while closed", () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Menu">
        x
      </Drawer>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a labelled dialog with a blurred backdrop", () => {
    render(
      <Drawer open onClose={() => {}} title="Menu">
        <a href="/x">Go</a>
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByTestId("drawer-backdrop").className).toMatch(
      /backdrop-blur/,
    );
  });

  it("closes from the backdrop, the close button and Escape", () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} title="Menu">
        x
      </Drawer>,
    );
    fireEvent.click(screen.getByTestId("drawer-backdrop"));
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
