import { BottomSheet, Button, Skeleton, SkeletonGroup } from "@/components/ui";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { getSupportChannels } from "@nearcommerce/api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function ContactRow({
  icon,
  label,
  value,
  url,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  url: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() => void Linking.openURL(url)}
      style={styles.row}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={c.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

// Same rows (icon tile + two text lines) as the loaded contact details.
function SupportSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Support details">
      {[0, 1].map((i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={40} height={40} radius={12} />
          <View style={styles.rowText}>
            <Skeleton width={56} height={14} />
            <Skeleton width={170} height={18} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

// "Contact support" bottom sheet: the official email and phone from GET /support (SRS 3.1.4).
export default function SupportSheet({ visible, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  const query = useQuery({
    queryKey: ["support-channels"],
    queryFn: getSupportChannels,
    enabled: visible,
    staleTime: 10 * 60 * 1000,
  });
  const channels = query.data?.channels;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      testID="support-sheet"
      title="Contact support"
      description="Our team can help with your account, stores and products."
    >
      {query.isLoading && <SupportSkeleton />}

      {query.isError && (
        <View accessibilityRole="alert">
          <Text style={styles.error}>
            We couldn't load the support details.
          </Text>
          <Button
            variant="secondary"
            title="Try again"
            onPress={() => void query.refetch()}
          />
        </View>
      )}

      {channels && (
        <View>
          <ContactRow
            icon="mail-outline"
            label="Email"
            value={channels.email}
            url={`mailto:${channels.email}`}
          />
          <ContactRow
            icon="call-outline"
            label="Phone"
            value={channels.phone}
            url={`tel:${channels.phone}`}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1 },
    rowLabel: { color: c.textMuted, fontSize: 13 },
    rowValue: { color: c.text, fontSize: 16, fontWeight: "700", marginTop: 2 },
    error: { color: c.danger, marginBottom: 12 },
  });
