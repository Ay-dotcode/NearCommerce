import { listKey, LISTS_KEY } from "@/api/lists";
import { API_URL } from "@/constants";
import type { ListClientEvents, ListServerEvents } from "@/types/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { io, Socket } from "socket.io-client";

type Options = {
  onGone?: (reason: "deleted" | "revoked") => void;
};

export function useListLiveUpdates(
  listId: string,
  token: string | null,
  options: Options = {},
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const { onGone } = options;

  useEffect(() => {
    if (!listId || !token) return;
    const socket: Socket<ListServerEvents, ListClientEvents> = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: listKey(listId) });
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    };

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join_list", listId);
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("list_item_updated", refresh);
    socket.on("list_item_removed", refresh);
    socket.on("list_updated", refresh);
    socket.on("list_member_joined", refresh);
    socket.on("list_member_left", refresh);
    socket.on("list_deleted", () => {
      refresh();
      onGone?.("deleted");
    });
    socket.on("list_access_revoked", () => {
      refresh();
      onGone?.("revoked");
    });
    socket.on("list_error", (payload) =>
      Toast.show({
        type: "error",
        text1: "List update failed",
        text2: payload?.message,
      }),
    );

    return () => {
      socket.emit("leave_list", listId);
      socket.disconnect();
      setIsConnected(false);
    };
  }, [listId, token, queryClient, onGone]);

  return { isConnected };
}
