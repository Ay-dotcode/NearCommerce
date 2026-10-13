import { fetchMe, resendVerification, type Me } from "@/api/account";
import { apiErrorMessage } from "@/api/errors";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles, type ThemeColors } from "@/theme";

// Shown only to signed-in users whose email is still unverified. Reviews require a
// verified address, so this is where they can ask for a fresh link.
export default function VerifyEmailPrompt() {
  const styles = useThemedStyles(makeStyles);

  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((profile) => active && setMe(profile))
      .catch(() => undefined); // The prompt is optional; stay quiet when offline.
    return () => {
      active = false;
    };
  }, []);

  if (!me || me.email_verified) return null;

  const resend = async () => {
    setBusy(true);
    try {
      setStatus(await resendVerification(me.email));
    } catch (error) {
      setStatus(apiErrorMessage(error, "Couldn't send the email. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>
        We sent a link to {me.email}. You need a verified email to write
        reviews.
      </Text>
      {status && <Text style={styles.status}>{status}</Text>}
      <Button
        variant="secondary"
        title="Resend verification email"
        onPress={resend}
        loading={busy}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    box: {
      backgroundColor: c.warningSoft,
      borderColor: c.warningBorder,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginBottom: 20,
    },
    title: { fontWeight: "700", color: c.warningText, marginBottom: 4 },
    body: { color: c.warningText, marginBottom: 8 },
    status: { color: c.successText, marginBottom: 8 },
  });
