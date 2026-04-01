import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import AppScreen from "../../components/AppScreen";
import { NEWS_API, NEWS_IMAGES_BASE } from "../../src/config/api";

const palette = {
  card: "#FFFFFF",
  ink: "#13233F",
  muted: "#66758F",
  line: "#DEE5F0",
  navy: "#2B2D42",
};

const buildNewsImageUrl = (picture) => {
  if (!picture) return null;
  if (/^https?:\/\//i.test(picture)) return picture;

  const normalizedBase = NEWS_IMAGES_BASE.replace(/\/+$/, "");
  const normalizedPicture = String(picture).replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPicture}`;
};

export default function NewsDetail() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadNewsDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const res = await fetch(`${NEWS_API}/${id}`);
      const data = await res.json().catch(() => ({}));
      setItem(res.ok ? data : null);
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNewsDetail();
  }, [loadNewsDetail]);

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={palette.navy} />
        </View>
      ) : item ? (
        <View style={styles.card}>
          <Image
            source={
              buildNewsImageUrl(item.picture)
                ? { uri: buildNewsImageUrl(item.picture) }
                : require("../../assets/images/icon.png")
            }
            style={styles.heroImage}
          />
          <Text style={styles.title}>{item.heading}</Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.body}>{item.content}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>News not found</Text>
          <Text style={styles.body}>This news item is unavailable or inactive.</Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: palette.navy,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  loaderWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#E8EEF9",
  },
  title: {
    marginTop: 14,
    color: palette.ink,
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },
  dateText: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  body: {
    marginTop: 14,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },
});
