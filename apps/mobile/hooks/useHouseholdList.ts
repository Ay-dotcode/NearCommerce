import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Toast from "react-native-toast-message";
import type {
  HouseholdListItem,
  ListClientEvents,
  ListServerEvents,
} from "@/types";

const SOCKET_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export function useHouseholdList(listId: string, token: string) {
  const [socket, setSocket] = useState<Socket<
    ListServerEvents,
    ListClientEvents
  > | null>(null);
  const [items, setItems] = useState<HouseholdListItem[]>([]);

  useEffect(() => {
    if (!listId || !token) {
      setSocket(null);
      return;
    }

    const newSocket: Socket<ListServerEvents, ListClientEvents> = io(
      SOCKET_URL,
      {
        auth: { token },
        transports: ["websocket"],
      },
    );

    newSocket.on("connect", () => newSocket.emit("join_list", listId));
    newSocket.on("list_item_updated", (updatedItem) => {
      setItems((current) => {
        const exists = current.some(
          (item) => item.product_id === updatedItem.product_id,
        );
        if (exists) {
          Toast.show({
            type: "info",
            text1: "Item Updated",
            text2: `Item already on list. Quantity increased to ${updatedItem.quantity} and marked un-checked.`,
          });
          return current.map((item) =>
            item.product_id === updatedItem.product_id ? updatedItem : item,
          );
        }
        return [...current, updatedItem];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave_list", listId);
      newSocket.disconnect();
    };
  }, [listId, token]);

  const addItem = (productId: string, quantity = 1) => {
    socket?.emit("add_item", { listId, productId, quantity });
  };

  const toggleItem = (productId: string, isChecked: boolean) => {
    socket?.emit("toggle_item", { listId, productId, isChecked });
  };

  return {
    items,
    addItem,
    toggleItem,
    isConnected: socket?.connected ?? false,
  };
}
