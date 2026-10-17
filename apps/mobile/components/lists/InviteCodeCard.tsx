import { Button } from "@/components/ui";
import { inviteShareMessage } from "@/helpers/invite";
import { notify } from "@/helpers/notify";
import { useThemedStyles, type ThemeColors } from "@/theme";
import * as Clipboard from "expo-clipboard";
import { Share, StyleSheet, Text, View } from "react-native";

interface Props {
  code: string;
  listName: string;
}

// The list's invite code with a button to copy it and another to share it.
export function InviteCodeCard({ code, listName }: Props) {
  const styles = useThemedStyles(makeStyles);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      notify.success("Invite code copied", "Paste it anywhere to share it.");
    } catch {
      notify.error("Couldn't copy the code", `Your code is ${code}.`);
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: inviteShareMessage(listName, code) });
    } catch {
      notify.error("Couldn't open sharing", "Try copying the code instead.");
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Invite code</Text>
      <Text selectable testID="invite-code" style={styles.code}>
        {code}
      </Text>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            testID="copy-invite"
            variant="secondary"
            title="Copy"
            accessibilityLabel="Copy invite code"
            onPress={() => void copy()}
          />
        </View>
        <View style={styles.action}>
          <Button
            testID="share-invite"
            title="Share"
            accessibilityLabel="Share invite code"
            onPress={() => void share()}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    label: { color: c.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
    code: {
      color: c.text,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: 2,
      marginTop: 4,
    },
    actions: { flexDirection: "row", gap: 10, marginTop: 12 },
    action: { flex: 1 },
  });
