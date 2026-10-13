import { Skeleton, SkeletonGroup } from "@/components/ui";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { StyleSheet, View } from "react-native";

// Loading placeholders. Every one mirrors the real component's padding, radius and text-line
// heights, so the screen does not shift when the data arrives. They show no text.

// Mirrors ProductCard: name, "store · distance", two status lines, and the price.
export function ProductCardSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.productCard}>
      <View style={styles.flex}>
        <Skeleton height={18} width="70%" />
        <Skeleton height={14} width="45%" style={{ marginTop: 4 }} />
        <View style={styles.row}>
          <Skeleton height={14} width={70} />
          <Skeleton height={14} width={110} />
        </View>
      </View>
      <Skeleton height={18} width={48} />
    </View>
  );
}

export function ProductListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonGroup label="Products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </SkeletonGroup>
  );
}

// Mirrors StoreCard: title + open/closed badge, then rating and distance.
export function StoreCardSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.storeCard}>
      <View style={styles.between}>
        <Skeleton height={22} width="55%" />
        <Skeleton height={24} width={56} radius={12} />
      </View>
      <View style={[styles.between, { marginTop: 14 }]}>
        <Skeleton height={18} width={70} />
        <Skeleton height={18} width={60} />
      </View>
    </View>
  );
}

export function StoreListSkeleton({ count = 3 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Stores near you">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={i > 0 ? styles.gap : undefined}>
          <StoreCardSkeleton />
        </View>
      ))}
    </SkeletonGroup>
  );
}

// Mirrors the Home category grid: two columns of 82px tiles with an icon and a label.
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Categories" style={styles.categoryGrid}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.categoryTile}>
          <Skeleton height={24} width={24} radius={12} />
          <Skeleton height={16} width="70%" />
        </View>
      ))}
    </SkeletonGroup>
  );
}

// Mirrors a favourites card: type label, name and detail line.
export function FavoriteListSkeleton({ count = 4 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Favorites">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.flex}>
            <Skeleton height={14} width={70} />
            <Skeleton height={20} width="60%" style={{ marginTop: 8 }} />
            <Skeleton height={14} width="80%" style={{ marginTop: 6 }} />
          </View>
          <Skeleton height={32} width={32} radius={16} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

// Mirrors a household-list card: name and "n to buy · n members" with a chevron.
export function ListCardsSkeleton({ count = 3 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Your lists">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.flex}>
            <Skeleton height={20} width="50%" />
            <Skeleton height={14} width="40%" style={{ marginTop: 6 }} />
          </View>
          <Skeleton height={20} width={12} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

// Mirrors a list's items: checkbox, label and delete icon on each row.
export function ListItemsSkeleton({ count = 5 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.itemRow}>
          <Skeleton height={24} width={24} radius={6} />
          <Skeleton height={18} width={`${50 + ((i * 17) % 35)}%`} />
        </View>
      ))}
    </View>
  );
}

// Whole list screen: top bar, invite code and members, add-item row and items.
export function ListDetailSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Shared list" style={styles.page}>
      <View style={styles.topBar}>
        <Skeleton height={26} width={26} radius={13} />
        <Skeleton height={26} width="45%" />
      </View>
      <Skeleton height={16} width={180} style={{ marginBottom: 12 }} />
      <Skeleton height={56} style={{ marginBottom: 12 }} radius={12} />
      <View style={styles.addRow}>
        <Skeleton height={46} style={styles.flex} radius={10} />
        <Skeleton height={46} width={46} radius={10} />
      </View>
      <ListItemsSkeleton />
    </SkeletonGroup>
  );
}

// Whole store screen: name + heart, address, status row, directions button, inventory cards.
export function StoreDetailSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Store" style={styles.page}>
      <View style={styles.between}>
        <Skeleton height={29} width="55%" />
        <Skeleton height={28} width={28} radius={14} />
      </View>
      <Skeleton
        height={17}
        width="70%"
        style={{ marginTop: 6, marginBottom: 8 }}
      />
      <View style={[styles.row, { marginBottom: 20 }]}>
        <Skeleton height={24} width={76} radius={12} />
        <Skeleton height={17} width={90} />
      </View>
      <Skeleton height={46} radius={10} style={{ marginBottom: 20 }} />
      <Skeleton height={22} width={90} style={{ marginBottom: 10 }} />
      <ProductListSkeleton />
    </SkeletonGroup>
  );
}

// Whole product screen: name + heart, store link, price + badge, stock line, description.
export function ProductDetailSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Product" style={styles.page}>
      <View style={styles.between}>
        <Skeleton height={31} width="65%" />
        <Skeleton height={28} width={28} radius={14} />
      </View>
      <Skeleton height={19} width="55%" style={{ marginVertical: 10 }} />
      <View style={[styles.between, { marginVertical: 20 }]}>
        <Skeleton height={27} width={90} />
        <Skeleton height={26} width={110} radius={12} />
      </View>
      <Skeleton height={17} width={110} />
      <View style={{ marginTop: 16, marginBottom: 30, gap: 8 }}>
        <Skeleton height={18} />
        <Skeleton height={18} />
        <Skeleton height={18} width="60%" />
      </View>
      <Skeleton height={46} radius={8} style={{ marginBottom: 8 }} />
    </SkeletonGroup>
  );
}

// Mirrors the reviews block under a store or product: heading + a few review cards.
export function ReviewsSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SkeletonGroup label="Reviews" style={{ marginTop: 20 }}>
      <Skeleton height={22} width={110} style={{ marginBottom: 12 }} />
      <View
        style={[
          styles.row,
          { marginBottom: 14, alignItems: "flex-start", gap: 20 },
        ]}
      >
        <View style={{ gap: 6, alignItems: "center" }}>
          <Skeleton height={36} width={56} />
          <Skeleton height={16} width={80} />
          <Skeleton height={14} width={64} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              height={10}
              width={`${90 - i * 15}%`}
              radius={5}
            />
          ))}
        </View>
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={[styles.card, styles.reviewCard]}>
          <View style={styles.row}>
            <Skeleton height={16} width={90} />
            <Skeleton height={14} width={70} />
          </View>
          <Skeleton height={16} width="95%" style={{ marginTop: 8 }} />
          <Skeleton height={16} width="70%" style={{ marginTop: 6 }} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    row: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 6 },
    between: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    gap: { marginTop: 10 },
    page: { flex: 1, padding: 15 },
    productCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    storeCard: {
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 12,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    reviewCard: { flexDirection: "column", alignItems: "stretch", gap: 0 },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 28,
    },
    categoryTile: {
      width: "48%",
      minHeight: 82,
      justifyContent: "center",
      gap: 8,
      padding: 14,
      backgroundColor: c.surface,
      borderRadius: 12,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    addRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
  });
