import { useColors } from "@/theme";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl } from "react-native";

// Even when the data comes back instantly, the spinner stays up this long so the shopper can
// see that the pull did something.
export const MIN_REFRESH_MS = 600;

// Pull-to-refresh for a scrollable screen: swipe down while at the top and a spinner drops in from
// the top while the data is fetched again. Use the result as the list's `refreshControl`.
//
// `keys` are the screen's query keys (a key matches everything starting with it). Only queries
// that are in use are refetched, so a search that is waiting for more typing is left alone.
export function usePullToRefresh(keys: QueryKey[]) {
  const queryClient = useQueryClient();
  const c = useColors();
  const [refreshing, setRefreshing] = useState(false);

  // The keys are usually a fresh array on every render; read the latest without re-creating
  // the handler.
  const latestKeys = useRef(keys);
  latestKeys.current = keys;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        ...latestKeys.current.map((queryKey) =>
          queryClient.refetchQueries({ queryKey, type: "active" }),
        ),
        new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS)),
      ]);
    } catch {
      // A failed refetch shows up in the screen's own error state; just stop spinning.
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [queryClient]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[c.primary]}
      tintColor={c.primary}
      progressBackgroundColor={c.surface}
    />
  );
}
