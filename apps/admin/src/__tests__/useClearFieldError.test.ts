import { useClearFieldError } from "@/forms/useClearFieldError";
import { renderHook } from "@testing-library/react";

type Props = { value: string; error?: string };

const setup = (initial: Props) => {
  const setFieldError = jest.fn();
  const hook = renderHook(
    ({ value, error }: Props) =>
      useClearFieldError("password", value, error, setFieldError),
    { initialProps: initial },
  );
  return { setFieldError, ...hook };
};

describe("useClearFieldError", () => {
  it("clears the error once the user edits the field", () => {
    const { setFieldError, rerender } = setup({ value: "a", error: "Wrong" });
    expect(setFieldError).not.toHaveBeenCalled();
    rerender({ value: "ab", error: "Wrong" });
    expect(setFieldError).toHaveBeenCalledWith("password", undefined);
  });

  it("keeps a server error visible when it appears without an edit", () => {
    const { setFieldError, rerender } = setup({ value: "secret" });
    rerender({ value: "secret", error: "Incorrect password" });
    expect(setFieldError).not.toHaveBeenCalled();
  });

  it("does nothing when the field is edited and there is no error", () => {
    const { setFieldError, rerender } = setup({ value: "a" });
    rerender({ value: "ab" });
    expect(setFieldError).not.toHaveBeenCalled();
  });
});
