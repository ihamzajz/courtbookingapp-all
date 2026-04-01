import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import AppScreen from "../../components/AppScreen";
import { BOOKINGS_API, EVENT_BOOKINGS_API } from "../../src/config/api";
import useRealtimeSubscription from "../../src/hooks/useRealtimeSubscription";
import { clearStoredUser, getStoredToken } from "../../src/utils/auth";

const palette = {
  bg: "#F4F8FF",
  card: "#FFFFFF",
  line: "#D9E4FF",
  ink: "#112A5C",
  muted: "#5B6F9E",
  blue: "#0D6EFD",
  navy: "#2B2D42",
  green: "#1F9D62",
  amber: "#C98600",
  red: "#D64D4D",
};

const tabs = [
  { key: "court", label: "Court", icon: "sports-tennis" },
  { key: "event", label: "Event", icon: "event" },
] as const;
const HISTORY_REALTIME_EVENTS = ["bookings:updated", "event-bookings:updated"] as const;

const statusColors = {
  APPROVED: "#EAF8F1",
  PENDING: "#FFF6DE",
  REJECTED: "#FDECEC",
  CANCELLED: "#F4F5F7",
};

const statusTextColors = {
  APPROVED: palette.green,
  PENDING: palette.amber,
  REJECTED: palette.red,
  CANCELLED: "#667085",
};

const paymentColors = {
  PAID: "#EAF8F1",
  UNPAID: "#FDECEC",
};

const paymentTextColors = {
  PAID: palette.green,
  UNPAID: palette.red,
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";

  const [hours = "0", minutes = "0"] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const parsePlayers = (value) => {
  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function StatusChip({ value, type = "status" }) {
  const normalized = String(value || (type === "status" ? "PENDING" : "UNPAID")).toUpperCase();
  const bg = type === "status" ? statusColors[normalized] || "#EEF2FF" : paymentColors[normalized] || "#EEF2FF";
  const color =
    type === "status"
      ? statusTextColors[normalized] || palette.navy
      : paymentTextColors[normalized] || palette.navy;

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{normalized}</Text>
    </View>
  );
}

function HistoryCard({ item, type }) {
  const title = type === "court" ? item.court_name : item.event_name;
  const players = type === "court" ? parsePlayers(item.players_json) : [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <View style={styles.cardIcon}>
            <MaterialIcons
              name={type === "court" ? "sports-tennis" : "event"}
              size={18}
              color={palette.blue}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title || "Booking"}</Text>
          </View>
        </View>
        <StatusChip value={item.booking_status} />
      </View>

      <View style={styles.infoRow}>
        <InfoItem icon="calendar-month" label="Date" value={formatDate(item.booking_date)} />
        <InfoItem
          icon="schedule"
          label="Time"
          value={`${formatTime(item.start_time)} - ${formatTime(item.end_time)}`}
        />
      </View>

      {type === "court" && players.length > 0 ? (
        <View style={styles.playersBox}>
          <Text style={styles.playersLabel}>Players</Text>
          <View style={styles.playersGrid}>
            {players
              .map((player) => player?.name)
              .filter(Boolean)
              .map((name, index) => (
                <Text key={`${item.id}-player-${index}`} style={styles.playerName}>
                  {name}
                </Text>
              ))}
          </View>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <StatusChip value={item.payment_status} type="payment" />
        <Text style={styles.bookingId}>Request #{item.id}</Text>
      </View>

      {item.admin_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Admin Note</Text>
          <Text style={styles.noteText}>{item.admin_note}</Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <MaterialIcons name={icon} size={16} color={palette.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function History() {
  const tabBarHeight = useBottomTabBarHeight();
  const [activeTab, setActiveTab] = useState("court");
  const [token, setToken] = useState(null);
  const [courtHistory, setCourtHistory] = useState([]);
  const [eventHistory, setEventHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadToken = useCallback(async () => {
    return getStoredToken();
  }, []);

  const loadHistory = useCallback(
    async (showLoader = true) => {
      const sessionToken = token || (await loadToken());

      if (!sessionToken) {
        setCourtHistory([]);
        setEventHistory([]);
        setLoading(false);
        router.replace("/login");
        return;
      }

      if (!token) {
        setToken(sessionToken);
      }

      if (showLoader) {
        setLoading(true);
      }

      try {
        const headers = { Authorization: `Bearer ${sessionToken}` };
        const [courtRes, eventRes] = await Promise.all([
          fetch(`${BOOKINGS_API}/my`, { headers }),
          fetch(`${EVENT_BOOKINGS_API}/my`, { headers }),
        ]);

        const [courtData, eventData] = await Promise.all([courtRes.json(), eventRes.json()]);

        if (courtRes.status === 401 || courtRes.status === 403 || eventRes.status === 401 || eventRes.status === 403) {
          await clearStoredUser();
          router.replace("/login");
          return;
        }

        setCourtHistory(courtRes.ok && Array.isArray(courtData) ? courtData : []);
        setEventHistory(eventRes.ok && Array.isArray(eventData) ? eventData : []);
      } catch {
        setCourtHistory([]);
        setEventHistory([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadToken, token]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useFocusEffect(
    useCallback(() => {
      loadHistory(false);
    }, [loadHistory])
  );

  useRealtimeSubscription(
    HISTORY_REALTIME_EVENTS,
    () => {
      loadHistory();
    },
    Boolean(token)
  );

  const activeList = activeTab === "court" ? courtHistory : eventHistory;
  const emptyTitle = activeTab === "court" ? "No court requests yet" : "No event bookings yet";
  const emptyText =
    activeTab === "court"
      ? "Your court booking requests will appear here once you submit them."
      : "Your event booking requests will appear here once you create them.";

  return (
    <AppScreen
      bottomOffset={tabBarHeight + 34}
      contentContainerStyle={styles.content}
      scrollable={false}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadHistory(false);
          }} />
        }
      >
        <LinearGradient
          colors={["#000080", "#00BFFF"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>Request History</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tabsWrap}>
          {tabs.map((tab) => {
            const active = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={18}
                  color={active ? "#FFFFFF" : palette.muted}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={palette.blue} size="large" />
            <Text style={styles.loadingText}>Loading your history...</Text>
          </View>
        ) : activeList.length ? (
          <View style={styles.listWrap}>
            {activeList.map((item) => (
              <HistoryCard key={`${activeTab}-${item.id}`} item={item} type={activeTab} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name={activeTab === "court" ? "sports-tennis" : "event-busy"}
                size={24}
                color={palette.blue}
              />
            </View>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push("/(tabs)/booking")}>
              <Text style={styles.primaryBtnText}>Open Booking Center</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  hero: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleRow: {
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
  },
  tabsWrap: {
    marginTop: 10,
    marginBottom: 0,
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: palette.navy,
    borderColor: palette.navy,
  },
  tabText: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  listWrap: {
    marginTop: 10,
    gap: 8,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#B7D0FF",
    padding: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitleWrap: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    alignItems: "center",
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#CFE3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },
  infoRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  infoItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flex: 1,
  },
  infoIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#D7E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 9.5,
    fontFamily: "Poppins_500Medium",
  },
  infoValue: {
    marginTop: 0,
    color: palette.ink,
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold",
  },
  playersBox: {
    marginTop: 8,
    paddingTop: 2,
  },
  playersLabel: {
    color: palette.ink,
    fontSize: 9.5,
    fontFamily: "Poppins_700Bold",
  },
  playersGrid: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  playerName: {
    width: "50%",
    color: palette.muted,
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },
  footerRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
  },
  bookingId: {
    color: palette.muted,
    fontSize: 9.5,
    fontFamily: "Poppins_500Medium",
  },
  noteBox: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#E3F0FF",
    borderWidth: 1,
    borderColor: "#C7DDFF",
    padding: 8,
  },
  noteLabel: {
    color: palette.ink,
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
  },
  noteText: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  emptyCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF4FF",
  },
  emptyTitle: {
    marginTop: 12,
    color: palette.ink,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 14,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },
});
