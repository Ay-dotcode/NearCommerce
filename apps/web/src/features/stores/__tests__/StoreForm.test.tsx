import { StoreForm } from "@/features/stores/ui/StoreForm";
import type { Store } from "@/types/stores";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const fillValid = () => {
  fill(/Store name/, "Corner Market");
  fill(/Street address/, "12 Main Street, Nicosia");
  fill(/Latitude/, "35.1856");
  fill(/Longitude/, "33.3823");
  fill(/Timezone/, "Asia/Nicosia");
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: /create store|save changes/i }));

describe("StoreForm", () => {
  it("shows field errors and does not submit when the form is empty", async () => {
    const onSubmit = jest.fn();
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    submit();

    expect(await screen.findByText("Store name is required")).toBeInTheDocument();
    expect(screen.getByText("Full address is required")).toBeInTheDocument();
    expect(screen.getAllByText("Enter a valid number")).toHaveLength(2); // latitude + longitude
    expect(screen.getByLabelText(/Store name/)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates", async () => {
    render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
    fillValid();
    fill(/Latitude/, "120");
    submit();
    expect(await screen.findByText("Invalid latitude")).toBeInTheDocument();
  });

  it("submits the camelCase payload the API expects, with all seven days", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    fillValid();
    fill(/Description/, "Fresh produce");
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: "Corner Market",
      description: "Fresh produce",
      address: "12 Main Street, Nicosia",
      latitude: 35.1856,
      longitude: 33.3823,
      timezone: "Asia/Nicosia",
    });
    expect(payload).not.toHaveProperty("opening_hours");
    expect(Object.keys(payload.openingHours)).toHaveLength(7);
    expect(payload.openingHours.sunday).toEqual({ open: "09:00", close: "18:00", isClosed: true });
  });

  it("omits an empty description rather than sending an empty string", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    fillValid();
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].description).toBeUndefined();
  });

  it("flags a day whose closing time is not after opening time, next to that day", async () => {
    const onSubmit = jest.fn();
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    fillValid();
    fireEvent.change(screen.getByLabelText("Monday closes at"), { target: { value: "08:00" } });
    submit();

    const alert = await screen.findByText(/Monday: Closing time must be after opening time/);
    expect(alert).toBeInTheDocument();
    expect(screen.getByLabelText("Monday closes at")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores times on a day marked closed", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    fillValid();
    fireEvent.change(screen.getByLabelText("Monday closes at"), { target: { value: "08:00" } });
    fireEvent.click(screen.getByLabelText("Monday open")); // untick = closed
    expect(screen.queryByLabelText("Monday closes at")).toBeNull();
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].openingHours.monday.isClosed).toBe(true);
  });

  it("copies Monday's hours to Tuesday through Friday", () => {
    render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Monday opens at"), { target: { value: "07:30" } });
    fireEvent.click(screen.getByRole("button", { name: /Copy Monday to Tue–Fri/ }));
    for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday"])
      expect(screen.getByLabelText(`${day} opens at`)).toHaveValue("07:30");
    expect(screen.getByLabelText("Saturday opens at")).toHaveValue("10:00"); // untouched
  });

  it("shows the server's message and maps field details onto inputs; keeps what was typed", async () => {
    const onSubmit = jest.fn().mockRejectedValue({
      response: { status: 400, data: { error: "Validation failed", details: [{ path: "timezone", message: "Unknown IANA timezone" }] } },
    });
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    fillValid();
    submit();

    expect(await screen.findByText("Unknown IANA timezone")).toBeInTheDocument();
    expect(screen.getByText("Validation failed")).toBeInTheDocument();
    expect(screen.getByLabelText(/Store name/)).toHaveValue("Corner Market");
    expect(screen.getByRole("button", { name: "Create store" })).toBeEnabled();
  });

  it("shows a generic message when the request fails without a response", async () => {
    render(<StoreForm submitLabel="Create store" onSubmit={jest.fn().mockRejectedValue(new Error("Network Error"))} />);
    fillValid();
    submit();
    expect(await screen.findByText(/couldn't save the store/i)).toBeInTheDocument();
  });

  it("disables submit while saving to prevent double submits", async () => {
    let finish!: () => void;
    const onSubmit = jest.fn(() => new Promise<void>((r) => (finish = r)));
    render(<StoreForm submitLabel="Create store" onSubmit={onSubmit} />);
    fillValid();
    submit();
    await waitFor(() => expect(screen.getByRole("button", { name: "Create store" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Create store" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Create store" })).toBeEnabled());
  });

  it("prefills from an existing store and shows its closed days as closed", () => {
    const store: Store = {
      id: "s1", name: "Old Name", description: "Desc", address: "1 Road, Town", latitude: 1.5, longitude: 2.5,
      timezone: "Europe/London", is_suspended: false,
      opening_hours: { monday: { open: "08:00", close: "12:00", isClosed: false }, tuesday: null },
    };
    render(<StoreForm initial={store} submitLabel="Save changes" onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/Store name/)).toHaveValue("Old Name");
    expect(screen.getByLabelText(/Latitude/)).toHaveValue("1.5");
    expect(screen.getByLabelText("Monday opens at")).toHaveValue("08:00");
    expect(screen.getByLabelText("Tuesday open")).not.toBeChecked();
  });

  describe("Use my location", () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    afterEach(() => {
      if (original) Object.defineProperty(navigator, "geolocation", original);
      else delete (navigator as any).geolocation;
    });

    it("fills coordinates from the browser", async () => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: { getCurrentPosition: (ok: any) => ok({ coords: { latitude: 35.123456789, longitude: 33.987654321 } }) },
      });
      render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
      await waitFor(() => expect(screen.getByLabelText(/Latitude/)).toHaveValue("35.123457"));
      expect(screen.getByLabelText(/Longitude/)).toHaveValue("33.987654");
    });

    it("explains what to do when permission is denied", async () => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: { getCurrentPosition: (_ok: any, fail: any) => fail({ code: 1 }) },
      });
      render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
      expect(await screen.findByText(/couldn't get your location/i)).toBeInTheDocument();
    });

    it("explains when the browser has no geolocation", () => {
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
      render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
      expect(screen.getByText(/isn't available in this browser/i)).toBeInTheDocument();
    });
  });

  it("renders Cancel only when a handler is given", () => {
    const { rerender } = render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    const onCancel = jest.fn();
    rerender(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("groups hours in a labelled fieldset", () => {
    render(<StoreForm submitLabel="Create store" onSubmit={jest.fn()} />);
    const group = screen.getByRole("group", { name: "Opening hours" });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(7);
  });
});
