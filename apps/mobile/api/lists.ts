import type {
  HouseholdListDetail,
  HouseholdListItem,
  HouseholdListMeta,
} from "@/types/lists";
import { apiClient } from "@nearcommerce/api";

export const LISTS_KEY = ["lists"] as const;
export const listKey = (id: string) => ["list", id] as const;

export async function fetchLists(): Promise<HouseholdListMeta[]> {
  const res = await apiClient.get<{ data: HouseholdListMeta[] }>("/lists");
  return res.data.data ?? [];
}

export async function fetchList(id: string): Promise<HouseholdListDetail> {
  return (await apiClient.get<HouseholdListDetail>(`/lists/${id}`)).data;
}

export async function createList(name: string): Promise<HouseholdListMeta> {
  return (await apiClient.post<HouseholdListMeta>("/lists", { name })).data;
}

export async function joinList(inviteCode: string) {
  return (
    await apiClient.post<{ id?: string; list_id?: string }>("/lists/join", {
      invite_code: inviteCode,
    })
  ).data;
}

export async function addListItem(
  listId: string,
  item: { product_id?: string; custom_item_name?: string; quantity?: number },
): Promise<HouseholdListItem> {
  return (
    await apiClient.post<HouseholdListItem>(`/lists/${listId}/items`, item)
  ).data;
}

export async function setItemChecked(
  listId: string,
  itemId: string,
  isChecked: boolean,
) {
  return (
    await apiClient.patch<HouseholdListItem>(
      `/lists/${listId}/items/${itemId}`,
      {
        is_checked: isChecked,
      },
    )
  ).data;
}

export async function deleteListItem(listId: string, itemId: string) {
  await apiClient.delete(`/lists/${listId}/items/${itemId}`);
}

export async function regenerateInvite(listId: string) {
  return (
    await apiClient.post<{ invite_code: string }>(
      `/lists/${listId}/regenerate-invite`,
    )
  ).data;
}

export async function leaveList(listId: string) {
  await apiClient.post(`/lists/${listId}/leave`);
}

export async function deleteList(listId: string) {
  await apiClient.delete(`/lists/${listId}`);
}

export async function renameList(listId: string, name: string) {
  await apiClient.patch(`/lists/${listId}`, { name });
}

export async function removeMember(listId: string, userId: string) {
  await apiClient.delete(`/lists/${listId}/members/${userId}`);
}
