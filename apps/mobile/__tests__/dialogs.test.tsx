import { DialogProvider, useDialogs } from "@/components/ui";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

const results: unknown[] = [];

function Harness() {
  const { confirm, choose } = useDialogs();
  return (
    <>
      <Pressable
        onPress={async () =>
          results.push(
            await confirm({
              title: "Delete it?",
              message: "No undo.",
              confirmLabel: "Delete",
              destructive: true,
            }),
          )
        }
      >
        <Text>ask</Text>
      </Pressable>
      <Pressable
        onPress={async () =>
          results.push(
            await choose({
              title: "Which list?",
              options: [
                { label: "Home", value: "l1" },
                { label: "Work", value: "l2" },
              ],
            }),
          )
        }
      >
        <Text>pick</Text>
      </Pressable>
    </>
  );
}

const setup = () =>
  render(
    <DialogProvider>
      <Harness />
    </DialogProvider>,
  );

beforeEach(() => (results.length = 0));

describe("dialogs (replace the phone's native alert boxes)", () => {
  it("confirm resolves true when confirmed, false when cancelled", async () => {
    const { getByText, findByTestId, findByText } = setup();
    fireEvent.press(getByText("ask"));
    expect(await findByText("Delete it?")).toBeTruthy();
    expect(getByText("No undo.")).toBeTruthy();
    fireEvent.press(await findByTestId("dialog-confirm"));
    await waitFor(() => expect(results).toEqual([true]));

    fireEvent.press(getByText("ask"));
    fireEvent.press(await findByTestId("dialog-cancel"));
    await waitFor(() => expect(results).toEqual([true, false]));
  });

  it("tapping the blurred backdrop counts as cancelling", async () => {
    const { getByText, findByTestId } = setup();
    fireEvent.press(getByText("ask"));
    fireEvent.press(await findByTestId("dialog-sheet-backdrop"));
    await waitFor(() => expect(results).toEqual([false]));
  });

  it("choose resolves with the picked value, or null when cancelled", async () => {
    const { getByText, findByText, findByTestId } = setup();
    fireEvent.press(getByText("pick"));
    fireEvent.press(await findByText("Work"));
    await waitFor(() => expect(results).toEqual(["l2"]));

    fireEvent.press(getByText("pick"));
    fireEvent.press(await findByTestId("dialog-cancel"));
    await waitFor(() => expect(results).toEqual(["l2", null]));
  });

  it("is a blurred bottom sheet", async () => {
    const { getByText, findByTestId } = setup();
    fireEvent.press(getByText("ask"));
    expect(await findByTestId("dialog-sheet-backdrop-blur")).toBeTruthy();
  });

  it("must be used inside the provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Harness />)).toThrow(/DialogProvider/);
  });
});
