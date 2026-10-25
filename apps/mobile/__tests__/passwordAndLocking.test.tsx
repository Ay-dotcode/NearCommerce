import LoginScreen from "@/app/(auth)/login";
import RegisterScreen from "@/app/(auth)/register";
import { StarPicker } from "@/components/StarRating";
import { PasswordField } from "@/components/ui";
import { AuthProvider } from "@/src/context/AuthContext";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useState } from "react";

jest.mock("@nearcommerce/api", () => {
  const actual = jest.requireActual("@nearcommerce/api");
  return {
    ...actual,
    apiClient: { post: jest.fn(), defaults: { headers: { common: {} } } },
    configureTokenRefresh: jest.fn(),
  };
});
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
}));
jest.mock("@/src/context/SettingsContext", () => ({
  useOptionalSettings: () => ({ openSupport: jest.fn() }),
}));

const post = () => require("@nearcommerce/api").apiClient.post as jest.Mock;

// A request that stays pending until the test settles it.
function pending() {
  let settle!: (ok: boolean) => void;
  post().mockReturnValue(
    new Promise((resolve, reject) => {
      settle = (ok) =>
        ok ? resolve({ data: {} }) : reject(Object.assign(new Error("x"), {}));
    }),
  );
  return settle;
}

beforeEach(() => jest.clearAllMocks());

describe("PasswordField", () => {
  const Harness = () => {
    const [value, setValue] = useState("hunter22");
    return (
      <PasswordField
        testID="pw"
        label="Password"
        value={value}
        onChangeText={setValue}
      />
    );
  };

  it("hides the password, and the eye reveals and hides it again", () => {
    const { getByTestId, getByLabelText } = render(<Harness />);
    expect(getByTestId("pw").props.secureTextEntry).toBe(true);

    fireEvent.press(getByLabelText("Show password"));
    expect(getByTestId("pw").props.secureTextEntry).toBe(false);
    expect(getByTestId("pw").props.value).toBe("hunter22");

    fireEvent.press(getByLabelText("Hide password"));
    expect(getByTestId("pw").props.secureTextEntry).toBe(true);
  });

  it("is a real, labelled button that has to be visible on screen", () => {
    const { getByTestId } = render(<Harness />);
    const eye = getByTestId("pw-toggle");
    expect(eye.props.accessibilityRole).toBe("button");
    expect(eye.props.accessibilityLabel).toBe("Show password");
  });

  it("does not auto-capitalise or auto-correct what is typed", () => {
    const { getByTestId } = render(<Harness />);
    expect(getByTestId("pw").props.autoCapitalize).toBe("none");
    expect(getByTestId("pw").props.autoCorrect).toBe(false);
  });

  it("locks the eye together with the input", () => {
    const { getByTestId } = render(
      <PasswordField testID="pw" label="Password" editable={false} />,
    );
    expect(getByTestId("pw").props.editable).toBe(false);
    expect(getByTestId("pw-toggle").props.accessibilityState.disabled).toBe(
      true,
    );
  });
});

describe("sign-in and sign-up show a working eye", () => {
  it("login", () => {
    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );
    expect(getByTestId("password-input").props.secureTextEntry).toBe(true);
    fireEvent.press(getByTestId("password-input-toggle"));
    expect(getByTestId("password-input").props.secureTextEntry).toBe(false);
  });

  it("register", () => {
    const { getByTestId } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>,
    );
    fireEvent.press(getByTestId("password-input-toggle"));
    expect(getByTestId("password-input").props.secureTextEntry).toBe(false);
  });
});

describe("inputs are locked while a form is being sent", () => {
  it("login", async () => {
    const settle = pending();
    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );
    fireEvent.changeText(getByTestId("email-input"), "jane@example.com");
    fireEvent.changeText(getByTestId("password-input"), "secret123");
    expect(getByTestId("email-input").props.editable).not.toBe(false);

    fireEvent.press(getByTestId("login-button"));

    await waitFor(() =>
      expect(getByTestId("email-input").props.editable).toBe(false),
    );
    expect(getByTestId("password-input").props.editable).toBe(false);
    expect(
      getByTestId("password-input-toggle").props.accessibilityState.disabled,
    ).toBe(true);

    settle(false);
    await waitFor(() =>
      expect(getByTestId("email-input").props.editable).toBe(true),
    );
    // What was typed is still there for another try.
    expect(getByTestId("email-input").props.value).toBe("jane@example.com");
  });

  it("register", async () => {
    const settle = pending();
    const { getByTestId } = render(
      <AuthProvider>
        <RegisterScreen />
      </AuthProvider>,
    );
    fireEvent.changeText(getByTestId("fullname-input"), "Jane Doe");
    fireEvent.changeText(getByTestId("email-input"), "jane@example.com");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.press(getByTestId("register-button"));

    await waitFor(() =>
      expect(getByTestId("fullname-input").props.editable).toBe(false),
    );
    expect(getByTestId("email-input").props.editable).toBe(false);
    expect(getByTestId("password-input").props.editable).toBe(false);

    settle(false);
    await waitFor(() =>
      expect(getByTestId("fullname-input").props.editable).toBe(true),
    );
  });

  it("the star rating stops responding while locked", () => {
    const onChange = jest.fn();
    const { getByLabelText, rerender } = render(
      <StarPicker value={0} onChange={onChange} />,
    );
    fireEvent.press(getByLabelText("4 stars"));
    expect(onChange).toHaveBeenCalledWith(4);

    onChange.mockClear();
    rerender(<StarPicker value={4} onChange={onChange} disabled />);
    fireEvent.press(getByLabelText("2 stars"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
