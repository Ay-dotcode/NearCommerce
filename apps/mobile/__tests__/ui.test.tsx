import {
  BottomSheet,
  Button,
  Drawer,
  FormTextField,
  Skeleton,
  SkeletonGroup,
  Slider,
  TextField,
} from "@/components/ui";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { FormikProvider, useFormik } from "formik";
import { Text } from "react-native";

describe("Skeleton", () => {
  it("is a silent placeholder: hidden from screen readers and without any text", () => {
    const { getByTestId, toJSON } = render(
      <SkeletonGroup label="Stores">
        <Skeleton width={120} height={20} />
      </SkeletonGroup>,
    );
    const group = getByTestId("skeleton");
    expect(group.props.accessibilityLabel).toBe("Stores");
    expect(group.props.accessibilityState).toEqual({ busy: true });
    expect(JSON.stringify(toJSON())).not.toMatch(/[Ll]oading/);
  });

  it("takes the size and radius of the element it stands in for", () => {
    const { toJSON } = render(<Skeleton width={120} height={20} radius={12} />);
    const style = JSON.stringify(toJSON());
    expect(style).toContain('"width":120');
    expect(style).toContain('"height":20');
    expect(style).toContain('"borderRadius":12');
  });
});

describe("BottomSheet", () => {
  it("renders nothing while closed, and its content with a blurred backdrop when open", () => {
    const { queryByText, rerender, getByText, getByTestId } = render(
      <BottomSheet visible={false} onClose={() => {}} title="Support">
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(queryByText("Support")).toBeNull();
    rerender(
      <BottomSheet
        visible
        onClose={() => {}}
        title="Support"
        description="Help"
      >
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(getByText("Support")).toBeTruthy();
    expect(getByText("Help")).toBeTruthy();
    expect(getByText("Body")).toBeTruthy();
    // The backdrop includes a BlurView over the page.
    expect(getByTestId("bottom-sheet-backdrop-blur")).toBeTruthy();
  });

  it("closes from the backdrop, unless it is not dismissible", () => {
    const onClose = jest.fn();
    const { getByTestId, rerender } = render(
      <BottomSheet visible onClose={onClose} title="T">
        <Text>x</Text>
      </BottomSheet>,
    );
    fireEvent.press(getByTestId("bottom-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <BottomSheet visible onClose={onClose} title="T" dismissible={false}>
        <Text>x</Text>
      </BottomSheet>,
    );
    fireEvent.press(getByTestId("bottom-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("goes away after closing", async () => {
    const { queryByText, rerender } = render(
      <BottomSheet visible onClose={() => {}} title="Bye">
        <Text>x</Text>
      </BottomSheet>,
    );
    rerender(
      <BottomSheet visible={false} onClose={() => {}} title="Bye">
        <Text>x</Text>
      </BottomSheet>,
    );
    await waitFor(() => expect(queryByText("Bye")).toBeNull());
  });
});

describe("Drawer", () => {
  it("opens from the left with a blurred backdrop and closes from the button or backdrop", () => {
    const onClose = jest.fn();
    const { getByText, getByLabelText, getByTestId } = render(
      <Drawer visible onClose={onClose} title="Settings">
        <Text>Inside</Text>
      </Drawer>,
    );
    expect(getByText("Inside")).toBeTruthy();
    // The panel is a modal view, so the backdrop is hidden from screen readers (but still tappable).
    expect(
      getByTestId("drawer-backdrop-blur", { includeHiddenElements: true }),
    ).toBeTruthy();
    fireEvent.press(getByLabelText("Close settings"));
    fireEvent.press(
      getByTestId("drawer-backdrop", { includeHiddenElements: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("Button", () => {
  it("fires onPress, and blocks taps while loading or disabled", () => {
    const onPress = jest.fn();
    const { getByText, getByRole, rerender } = render(
      <Button title="Save" onPress={onPress} />,
    );
    fireEvent.press(getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<Button title="Save" onPress={onPress} loading />);
    expect(getByRole("button").props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("TextField error mode", () => {
  it("shows the message under the field and marks it invalid", () => {
    const { getByTestId, getByText, rerender } = render(
      <TextField label="Email" testID="email" />,
    );
    expect(getByTestId("email").props["aria-invalid"]).toBe(false);
    rerender(
      <TextField label="Email" testID="email" error="Enter your email." />,
    );
    expect(getByText("Enter your email.")).toBeTruthy();
    expect(getByTestId("email").props["aria-invalid"]).toBe(true);
    expect(getByTestId("email-error").props.accessibilityLiveRegion).toBe(
      "polite",
    );
  });

  it("can show error mode without its own message", () => {
    const { getByTestId } = render(<TextField testID="f" invalid />);
    expect(getByTestId("f").props["aria-invalid"]).toBe(true);
  });
});

describe("FormTextField", () => {
  function Demo({ onSubmit }: { onSubmit: (v: string) => void }) {
    const formik = useFormik({
      initialValues: { name: "" },
      validate: (v) => (v.name ? {} : { name: "Name is required." }),
      onSubmit: (v) => onSubmit(v.name),
    });
    return (
      <FormikProvider value={formik}>
        <FormTextField name="name" testID="name" label="Name" />
        <Button title="Go" onPress={() => formik.handleSubmit()} />
      </FormikProvider>
    );
  }

  it("shows the validation error only after submit/blur, then submits the typed value", async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText, queryByText, findByText } = render(
      <Demo onSubmit={onSubmit} />,
    );
    expect(queryByText("Name is required.")).toBeNull();
    fireEvent.press(getByText("Go"));
    expect(await findByText("Name is required.")).toBeTruthy();
    fireEvent.changeText(getByTestId("name"), "Ada");
    fireEvent.press(getByText("Go"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Ada"));
  });
});

describe("Slider", () => {
  const setup = (value = 5) => {
    const onChangeComplete = jest.fn();
    const utils = render(
      <Slider
        value={value}
        min={1}
        max={10}
        label="Distance"
        valueText={(v) => `${v} km`}
        onChangeComplete={onChangeComplete}
      />,
    );
    return { ...utils, onChangeComplete };
  };

  it("announces its range and spoken value to screen readers", () => {
    const { getByRole } = setup(5);
    const slider = getByRole("adjustable");
    expect(slider.props.accessibilityLabel).toBe("Distance");
    expect(slider.props.accessibilityValue).toEqual({
      min: 1,
      max: 10,
      now: 5,
      text: "5 km",
    });
  });

  it("moves one step at a time with the accessibility increment and decrement actions", () => {
    const { getByRole, onChangeComplete } = setup(5);
    const slider = getByRole("adjustable");
    fireEvent(slider, "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    expect(onChangeComplete).toHaveBeenLastCalledWith(6);
    fireEvent(slider, "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    expect(onChangeComplete).toHaveBeenLastCalledWith(4);
  });

  it("stops at the ends of its range", () => {
    const top = setup(10);
    fireEvent(top.getByRole("adjustable"), "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    expect(top.onChangeComplete).not.toHaveBeenCalled();
    const bottom = setup(1);
    fireEvent(bottom.getByRole("adjustable"), "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    expect(bottom.onChangeComplete).not.toHaveBeenCalled();
  });
});
