import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  useWindowDimensions,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";

import AppScreen from "../../components/AppScreen";
import TopHeaderBox from "../../components/TopHeaderBox";
import { NEWS_API, NEWS_IMAGES_BASE } from "../../src/config/api";
import useLiveRefresh from "../../src/hooks/useLiveRefresh";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";
import { buildUploadAssetUrl } from "../../src/utils/media";

const palette = {
  bg: "#F4F8FF",
  card: "#FFFFFF",
  ink: "#13233F",
  muted: "#66758F",
  line: "#DEE5F0",
  navy: "#2B2D42",
};

const buildNewsImageUrl = (picture) => buildUploadAssetUrl(NEWS_IMAGES_BASE, picture, "news");

const getExcerpt = (content) => {
  const value = String(content || "").trim();
  if (value.length <= 90) return value;
  return `${value.slice(0, 90).trim()}...`;
};

export default function News() {
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(NEWS_API);
      const data = await res.json().catch(() => []);
      setItems(res.ok && Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(loadNews, { intervalMs: 60000 });
  useRealtimeSubscription("news:updated", loadNews);

  const cardWidth = useMemo(() => {
    const innerWidth = Math.min(width - 40, 560);
    return (innerWidth - 12) / 2;
  }, [width]);

  return (
    <AppScreen bottomOffset={tabBarHeight + 34} contentContainerStyle={styles.content}>
      <TopHeaderBox title="Latest News" onBack={() => router.replace("/(tabs)/home")} />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={palette.navy} />
        </View>
      ) : items.length ? (
        <View style={styles.grid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.card, { width: cardWidth }]}
              onPress={() => router.push(`/news/${item.id}`)}
            >
              <Image
                source={
                  buildNewsImageUrl(item.picture)
                    ? { uri: buildNewsImageUrl(item.picture) }
                    : require("../../assets/images/icon.png")
                }
                style={styles.cardImage}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardHeading} numberOfLines={2}>
                  {item.heading}
                </Text>
                <Text style={styles.cardExcerpt} numberOfLines={3}>
                  {getExcerpt(item.content)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No news available</Text>
          <Text style={styles.emptyText}>Active news items will appear here when the admin publishes them.</Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  loaderWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 110,
    backgroundColor: "#E8EEF9",
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cardHeading: {
    color: palette.ink,
    fontSize: 12.5,
    fontFamily: "Poppins_700Bold",
    lineHeight: 18,
  },
  cardExcerpt: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },
  emptyCard: {
    marginTop: 12,
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 18,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  emptyText: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
