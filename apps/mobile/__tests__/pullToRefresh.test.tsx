import { MIN_REFRESH_MS, usePullToRefresh } from "@/src/hooks/usePullToRefresh";
import { renderWithClient } from "@/testing/render";
import { useQuery } from "@tanstack/react-query";
import { act, waitFor } from "@testing-library/react-native";
import { FlatList, RefreshControl } from "react-native";
import { readFileSync } from "fs";
import { join } from "path";

function Harness({
  fetcher,
  enabled = true,
}: {
  fetcher: () => Promise<string[]>;
  enabled?: boolean;
}) {
  const { data = [] } = useQuery({
    queryKey: ["thing", 1],
    queryFn: fetcher,
    enabled,
  });
  // The key is a prefix: it matches ["thing", 1].
  const refreshControl = usePullToRefresh([["thing"]]);
  return (
    <FlatList
      data={data}
      keyExtractor={(x) => x}
      renderItem={() => null}
      refreshControl={refreshControl}
    />
  );
}

// Cast: RefreshControl is a class component whose static types don't match UNSAFE_getByType.
const control = (api: ReturnType<typeof renderWithClient>) =>
  api.UNSAFE_getByType(RefreshControl as never);

describe("pull to refresh", () => {
  it("fetches the screen's data again when the shopper pulls down", async () => {
    const fetcher = jest.fn().mockResolvedValue(["a"]);
    const api = renderWithClient(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      await control(api).props.onRefresh();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("spins while refreshing and stops once it's done, after at least a moment", async () => {
    let release!: (v: string[]) => void;
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(["a"])
      .mockImplementationOnce(() => new Promise((r) => (release = r)));
    const api = renderWithClient(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(control(api).props.refreshing).toBe(false);

    let done!: Promise<void>;
    act(() => {
      done = control(api).props.onRefresh();
    });
    await waitFor(() => expect(control(api).props.refreshing).toBe(true));

    const started = Date.now();
    await act(async () => {
      release(["a", "b"]);
      await done;
    });
    expect(control(api).props.refreshing).toBe(false);
    // Not a flash: the spinner was up for the minimum time even though the data was quick.
    expect(Date.now() - started).toBeGreaterThanOrEqual(MIN_REFRESH_MS - 50);
  });

  it("leaves a query that isn't in use (for example a search waiting for typing) alone", async () => {
    const fetcher = jest.fn().mockResolvedValue([]);
    const api = renderWithClient(<Harness fetcher={fetcher} enabled={false} />);

    await act(async () => {
      await control(api).props.onRefresh();
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(control(api).props.refreshing).toBe(false);
  });

  it("stops spinning even when the refetch fails", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(["a"])
      .mockRejectedValueOnce(new Error("offline"));
    const api = renderWithClient(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      await control(api).props.onRefresh();
    });

    expect(control(api).props.refreshing).toBe(false);
  });

  it("uses the app's colours for the spinner", async () => {
    const api = renderWithClient(
      <Harness fetcher={jest.fn().mockResolvedValue([])} />,
    );
    const props = control(api).props;
    expect(props.colors).toHaveLength(1);
    expect(typeof props.tintColor).toBe("string");
  });
});

// Every screen that loads data can be pulled down to refresh it. This keeps a screen from losing
// that, and a new one from being forgotten.
describe("screens that support pull to refresh", () => {
  const SCREENS = [
    "app/(tabs)/index.tsx",
    "app/(tabs)/search.tsx",
    "app/(tabs)/favorites.tsx",
    "app/(tabs)/lists.tsx",
    "app/store/[id].tsx",
    "app/product/[id].tsx",
    "app/category/[id].tsx",
    "app/list/[id].tsx",
  ];

  it.each(SCREENS)("%s", (screen) => {
    const source = readFileSync(join(__dirname, "..", screen), "utf8");
    expect(source).toContain("usePullToRefresh(");
    expect(source).toContain("refreshControl={refreshControl}");
  });
});
