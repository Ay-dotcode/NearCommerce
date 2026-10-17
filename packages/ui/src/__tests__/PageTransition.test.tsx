import { render, screen } from "@testing-library/react";
import { PageTransition, BackButton } from "@nearcommerce/ui/src/index";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { fireEvent } from "@testing-library/react";

describe("PageTransition", () => {
  it("re-mounts (so the entrance animation replays) when the key changes", () => {
    const { rerender } = render(
      <PageTransition transitionKey="/a">
        <input aria-label="field" />
      </PageTransition>,
    );
    const first = screen.getByTestId("page-transition");
    expect(first.className).toMatch(/animate-page-in/);
    expect(first.className).toMatch(/motion-reduce:animate-none/);
    rerender(
      <PageTransition transitionKey="/b">
        <input aria-label="field" />
      </PageTransition>,
    );
    expect(screen.getByTestId("page-transition")).not.toBe(first);
  });
});

function Home() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/detail")}>open</button>;
}

describe("BackButton", () => {
  const app = (initial: string[]) => (
    <MemoryRouter initialEntries={initial}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detail" element={<BackButton fallback="/" />} />
      </Routes>
    </MemoryRouter>
  );

  it("goes back to the page the visitor came from", () => {
    render(app(["/"]));
    fireEvent.click(screen.getByText("open"));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("falls back to the given page when the visitor landed here directly", () => {
    render(app(["/detail"]));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("open")).toBeInTheDocument();
  });
});
