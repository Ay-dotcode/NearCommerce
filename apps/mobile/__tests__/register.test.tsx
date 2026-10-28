import RegisterScreen from "@/app/(auth)/register";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";

const mockLogin = jest.fn();
jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("@nearcommerce/api", () => ({ apiClient: { post: jest.fn() } }));

const post = apiClient.post as jest.Mock;

const fill = (
  utils: ReturnType<typeof render>,
  v: { name?: string; email?: string; pw?: string },
) => {
  fireEvent.changeText(
    utils.getByTestId("fullname-input"),
    v.name ?? "Jane Doe",
  );
  fireEvent.changeText(
    utils.getByTestId("email-input"),
    v.email ?? "jane@example.com",
  );
  fireEvent.changeText(
    utils.getByTestId("password-input"),
    v.pw ?? "password123",
  );
  fireEvent.press(utils.getByTestId("register-button"));
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert");
});

describe("RegisterScreen", () => {
  it("marks every empty field with its own message and calls nothing", async () => {
    const utils = render(<RegisterScreen />);
    fireEvent.press(utils.getByTestId("register-button"));
    expect(await utils.findByText("Enter your full name.")).toBeTruthy();
    expect(utils.getByText("Enter your email.")).toBeTruthy();
    expect(utils.getByText("Choose a password.")).toBeTruthy();
    expect(utils.getByTestId("email-input").props["aria-invalid"]).toBe(true);
    expect(post).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("explains a malformed email and a short password inline", async () => {
    const utils = render(<RegisterScreen />);
    fill(utils, { email: "nope", pw: "short" });
    expect(await utils.findByText("Enter a valid email address.")).toBeTruthy();
    expect(
      utils.getByText("Password must be at least 8 characters."),
    ).toBeTruthy();
  });

  it("registers, signs in and welcomes the shopper", async () => {
    post.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({
      data: {
        access_token: "a",
        refresh_token: "r",
        user: { id: "1", role: "CUSTOMER" },
      },
    });
    const utils = render(<RegisterScreen />);
    fill(utils, { email: "  Jane@Example.com " });
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("a", "r"));
    expect(post).toHaveBeenNthCalledWith(1, "/auth/register", {
      full_name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    });
    // No email-verification step: nothing tells the shopper to check their inbox.
    expect(Toast.show).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("puts a taken email on the email field, not in a pop-up", async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: "That email is already registered." },
      },
    });
    const utils = render(<RegisterScreen />);
    fill(utils, {});
    expect(
      await utils.findByText("That email is already registered."),
    ).toBeTruthy();
    expect(utils.getByTestId("email-input").props["aria-invalid"]).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("maps server field errors onto the right fields", async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: "Validation failed",
          details: [{ path: "password", message: "Password is too common." }],
        },
      },
    });
    const utils = render(<RegisterScreen />);
    fill(utils, {});
    expect(await utils.findByText("Password is too common.")).toBeTruthy();
  });

  it("shows other failures in a banner inside the form", async () => {
    post.mockRejectedValueOnce(new Error("Network Error"));
    const utils = render(<RegisterScreen />);
    fill(utils, {});
    expect(await utils.findByTestId("form-error")).toHaveTextContent(
      /registration failed/i,
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
