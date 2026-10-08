import VerifyEmailPrompt from "@/components/VerifyEmailPrompt";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: { get: jest.fn(), post: jest.fn() },
}));
const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;

const me = (email_verified: boolean) => ({
  data: {
    id: "u1",
    email: "shopper@test.com",
    full_name: "Sam",
    email_verified,
  },
});

describe("VerifyEmailPrompt", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing for a verified user", async () => {
    get.mockResolvedValue(me(true));
    const { queryByText } = render(<VerifyEmailPrompt />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/users/me"));
    expect(queryByText("Verify your email")).toBeNull();
  });

  it("stays quiet when the profile can't be loaded", async () => {
    get.mockRejectedValue(new Error("offline"));
    const { queryByText } = render(<VerifyEmailPrompt />);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(queryByText("Verify your email")).toBeNull();
  });

  it("lets an unverified user request a new link", async () => {
    get.mockResolvedValue(me(false));
    post.mockResolvedValue({ data: { message: "A new link has been sent." } });
    const { findByText, getByText } = render(<VerifyEmailPrompt />);

    expect(await findByText(/shopper@test.com/)).toBeTruthy();
    fireEvent.press(getByText("Resend verification email"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/resend-verification", {
        email: "shopper@test.com",
      }),
    );
    expect(await findByText("A new link has been sent.")).toBeTruthy();
  });

  it("shows the server's message when resending fails", async () => {
    get.mockResolvedValue(me(false));
    post.mockRejectedValue({
      response: { data: { error: "Too many requests" } },
    });
    const { findByText, getByText } = render(<VerifyEmailPrompt />);
    await findByText(/shopper@test.com/);
    fireEvent.press(getByText("Resend verification email"));
    expect(await findByText("Too many requests")).toBeTruthy();
  });
});
