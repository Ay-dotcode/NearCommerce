import { ErrorScreen } from "@/components/ErrorScreen";
import { fireEvent, render, screen } from "@testing-library/react-native";

describe("ErrorScreen", () => {
  it("tells the shopper something went wrong and lets them retry", () => {
    const retry = jest.fn();
    render(<ErrorScreen error={new Error("boom")} retry={retry} />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Try again"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
