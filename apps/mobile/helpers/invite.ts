// The message sent when someone shares a household list's invite code.
export const inviteShareMessage = (listName: string, code: string) =>
  `Join my shopping list "${listName}" on Near Commerce. Open Lists, tap "Join with an invite code" and enter: ${code}`;
